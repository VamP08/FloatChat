"""Checks the chat endpoint's limits against a running API (default localhost:8000).

The per-address limit must hold however the caller fills X-Forwarded-For, and an
oversized request must be refused before it reaches the model. Run with the API up:
    python check_limits.py [base-url]
Every request here sends a blank question, which the API answers without a model call.
"""
import json
import sys
import urllib.error
import urllib.request

BASE = (sys.argv[1] if len(sys.argv) > 1 else "http://127.0.0.1:8000").rstrip("/")


def post(body, headers=None):
    req = urllib.request.Request(BASE + "/chat", data=json.dumps(body).encode(), method="POST",
                                 headers={"Content-Type": "application/json", **(headers or {})})
    try:
        with urllib.request.urlopen(req) as r:
            return r.status
    except urllib.error.HTTPError as e:
        return e.code


blank = {"history": [{"role": "user", "content": " "}]}
codes = [post(blank, {"X-Forwarded-For": f"203.0.113.{i}"}) for i in range(1, 22)]
assert codes[:20] == [200] * 20, codes
assert codes[20] == 429, f"a new X-Forwarded-For value got past the limit: {codes[20]}"

# A separate address for the size checks; refused requests count against it too.
other = {"CF-Connecting-IP": "198.51.100.1"}
assert post({"history": [{"role": "user", "content": "x" * 2001}]}, other) == 422, "long question accepted"
assert post({"history": [{"role": "user", "content": " "}] * 21}, other) == 422, "long history accepted"
print("limits hold: 20 accepted, the 21st refused despite a fresh X-Forwarded-For; oversized requests 422")
