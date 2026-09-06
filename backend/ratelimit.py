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

_hits: dict[str, deque[float]] = defaultdict(deque)


def _client_address(request: Request) -> str:
    """The caller's address, trusting the proxy header the platform sets.

    Render and Vercel both terminate TLS upstream, so request.client.host is the proxy
    rather than the visitor. The first entry of X-Forwarded-For is the original client.
    """
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


def rate_limit(request: Request) -> None:
    """Reject a caller that has exceeded the window. Used as a route dependency."""
    now = time.monotonic()
    address = _client_address(request)
    recent = _hits[address]

    while recent and now - recent[0] > WINDOW_SECONDS:
        recent.popleft()

    if len(recent) >= MAX_REQUESTS:
        retry_after = int(WINDOW_SECONDS - (now - recent[0])) + 1
        raise HTTPException(
            status_code=429,
            detail=(
                f"Rate limit reached: {MAX_REQUESTS} questions per "
                f"{WINDOW_SECONDS // 60} minutes. Try again in {retry_after}s."
            ),
            headers={"Retry-After": str(retry_after)},
        )

    recent.append(now)

    # Addresses that stopped calling would otherwise accumulate forever.
    if len(_hits) > 10_000:
        for stale in [key for key, hits in _hits.items() if not hits]:
            del _hits[stale]
