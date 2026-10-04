"""Per-address rate limiting for the endpoints that spend money.

The chat endpoint is public and every call reaches a paid language model, so without
a limit one script can drain the API quota. This is a fixed-window counter held in
memory.

ponytail: in-memory, so the window is per process. That is correct while the API runs
as a single worker, which is how it is deployed. Move the counter to Redis before
scaling to more than one.
"""

import os
import time
from collections import defaultdict, deque

from fastapi import HTTPException, Request

# Generous enough that nobody exploring the demo will notice, tight enough that a
# scripted loop stops early.
MAX_REQUESTS = int(os.getenv("CHAT_RATE_LIMIT", "20"))
WINDOW_SECONDS = int(os.getenv("CHAT_RATE_WINDOW", "300"))
# Every caller together: a backstop for the quota if addresses ever stop being told apart.
GLOBAL_MAX = int(os.getenv("CHAT_RATE_LIMIT_GLOBAL", "200"))

_hits: dict[str, deque[float]] = defaultdict(deque)


def _client_address(request: Request) -> str:
    """The caller's address.

    Render sits behind Cloudflare, which sets CF-Connecting-IP to the address that
    connected to it and overwrites any value the client sent. X-Forwarded-For is not
    used: Render appends to it instead of resetting it, so its first entry is whatever
    the caller chose to write there. Without the header (local runs) the socket peer is
    the caller.
    """
    return request.headers.get("cf-connecting-ip") or (
        request.client.host if request.client else "unknown"
    )


def _limited(key: str, limit: int, now: float) -> int | None:
    """Seconds to wait if `key` has used its window, else None (and this call counts)."""
    recent = _hits[key]
    while recent and now - recent[0] > WINDOW_SECONDS:
        recent.popleft()
    if len(recent) >= limit:
        return int(WINDOW_SECONDS - (now - recent[0])) + 1
    recent.append(now)
    return None


def rate_limit(request: Request) -> None:
    """Reject a caller that has exceeded the window. Used as a route dependency."""
    now = time.monotonic()
    address = _client_address(request)
    retry_after = _limited(address, MAX_REQUESTS, now)
    if retry_after is None:
        retry_after = _limited("*", GLOBAL_MAX, now)
        if retry_after is not None:
            _hits[address].pop()   # refused for everyone's total, so not counted against this caller
    if retry_after is not None:
        raise HTTPException(
            status_code=429,
            detail=(
                f"Rate limit reached: {MAX_REQUESTS} questions per "
                f"{WINDOW_SECONDS // 60} minutes. Try again in {retry_after}s."
            ),
            headers={"Retry-After": str(retry_after)},
        )

    # Addresses that stopped calling would otherwise accumulate forever.
    if len(_hits) > 10_000:
        for stale in [key for key, hits in _hits.items() if not hits]:
            del _hits[stale]
