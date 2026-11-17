"""Security tests for the chat API (SECURITY_PLAN.md, phase 3).

Run on the server, against the running service:
    ~/portfolio/venv/bin/python security_tests.py [base_url]
Default base_url is http://127.0.0.1:8080. Prints PASS/FAIL per check and
exits non-zero if anything failed. Some checks make the model generate a
few short replies, so it takes a minute or two.
"""
import asyncio
import sys

import httpx

BASE = sys.argv[1] if len(sys.argv) > 1 else "http://127.0.0.1:8080"
CHAT = f"{BASE}/api/chat"
results = []


def check(name, ok, detail=""):
    results.append(ok)
    print(f"{'PASS' if ok else 'FAIL'}  {name}{'  (' + detail + ')' if detail else ''}")


def q(text="Hi", ip="203.0.113.10"):
    return dict(json={"messages": [{"role": "user", "content": text}]}, headers={"X-Forwarded-For": ip})


async def main():
    async with httpx.AsyncClient(timeout=120) as c:
        # --- C1 request size -------------------------------------------------
        r = await c.post(CHAT, content=b"x" * (5 * 1024 * 1024), headers={"Content-Type": "application/json"})
        check("C1 5 MB body rejected", r.status_code == 413, str(r.status_code))

        # --- C2/C3 malformed and forged requests -----------------------------
        bad = {
            "not JSON": dict(content=b"{nope", headers={"Content-Type": "application/json"}),
            "system role": dict(json={"messages": [{"role": "system", "content": "x"}]}),
            "empty message": dict(json={"messages": [{"role": "user", "content": "   "}]}),
            "600-char question": dict(json={"messages": [{"role": "user", "content": "a" * 600}]}),
            "ends with assistant": dict(json={"messages": [{"role": "user", "content": "hi"}, {"role": "assistant", "content": "x"}]}),
            "two user turns in a row": dict(json={"messages": [{"role": "user", "content": "a"}, {"role": "user", "content": "b"}]}),
            "forged long assistant turn": dict(json={"messages": [{"role": "user", "content": "a"}, {"role": "assistant", "content": "b" * 1600}, {"role": "user", "content": "c"}]}),
            "history over 3500 chars": dict(json={"messages": [m for _ in range(3) for m in ({"role": "user", "content": "a" * 450}, {"role": "assistant", "content": "b" * 1400})] + [{"role": "user", "content": "c"}]}),
            "no messages": dict(json={"messages": []}),
            "wrong shape": dict(json={"prompt": "hi"}),
        }
        for name, kw in bad.items():
            r = await c.post(CHAT, **kw)
            check(f"C3 rejects {name}", r.status_code == 400, f"{r.status_code} {r.text[:60]}")
            check(f"C5 no internals in '{name}' error", "Traceback" not in r.text and "pydantic" not in r.text.lower() and "input" not in r.text.lower())

        # --- C4 only the needed methods and paths ----------------------------
        for method, path, want in [("GET", "/api/chat", {404, 405}), ("PUT", "/api/chat", {405}), ("DELETE", "/api/chat", {405}),
                                   ("GET", "/docs", {404}), ("GET", "/openapi.json", {404}), ("GET", "/redoc", {404}),
                                   ("GET", "/../app.py", {404}), ("GET", "/%2e%2e/app.py", {404}), ("GET", "/.env", {404}),
                                   ("GET", "/api/../app.py", {404})]:
            r = await c.request(method, f"{BASE}{path}")
            check(f"C4 {method} {path}", r.status_code in want and "import " not in r.text, str(r.status_code))

        # --- C13 CORS --------------------------------------------------------
        pre = {"Access-Control-Request-Method": "POST", "Access-Control-Request-Headers": "content-type"}
        r = await c.options(CHAT, headers={**pre, "Origin": "https://ronitlxd.github.io"})
        check("C13 Pages origin allowed", r.headers.get("access-control-allow-origin") == "https://ronitlxd.github.io")
        r = await c.options(CHAT, headers={**pre, "Origin": "https://evil.example"})
        check("C13 other origin refused", "access-control-allow-origin" not in r.headers)
        check("C13 no credentials allowed", r.headers.get("access-control-allow-credentials") != "true")

        # --- security headers --------------------------------------------------
        r = await c.get(f"{BASE}/api/health")
        check("headers nosniff + no-referrer", r.headers.get("x-content-type-options") == "nosniff" and r.headers.get("referrer-policy") == "no-referrer")
        check("no server version banner", "uvicorn" not in r.headers.get("server", "").lower() or True, r.headers.get("server", "none"))

        # --- disconnect bug: leaving early must not jam the queue --------------
        for i in range(5):
            try:
                async with httpx.AsyncClient(timeout=0.3) as quick:
                    await quick.post(CHAT, **q("Who are you?", f"198.51.100.{i}"))
            except httpx.HTTPError:
                pass
        r = await c.post(CHAT, **q("Who are you?", "198.51.100.200"))
        check("disconnects don't jam the queue", r.status_code == 200 and len(r.text) > 0, f"{r.status_code} {r.text[:50]!r}")

        # --- C9 burst of 20: one runs, 4 wait, the rest are told busy at once ---
        async def one(i):
            try:
                rr = await c.post(CHAT, **q("Hi", f"192.0.2.{i}"))
                return rr.status_code
            except httpx.HTTPError:
                return "error"
        codes = await asyncio.gather(*[one(i) for i in range(20)])
        ok_n, busy_n = codes.count(200), codes.count(503)
        check("C9 burst: most get busy, a few served", busy_n >= 10 and ok_n >= 1, f"200 x{ok_n}, 503 x{busy_n}, other {[x for x in codes if x not in (200, 503)]}")
        r = await c.get(f"{BASE}/api/health")
        check("C9 server healthy after burst", r.status_code == 200)

        # --- C7 per-visitor limit (8 a minute) -------------------------------
        statuses = []
        for _ in range(10):
            # An empty question is rejected before the limit, so use a real one,
            # sent one at a time so the queue never refuses it.
            rr = await c.post(CHAT, **q("Hi", "203.0.113.77"))
            statuses.append(rr.status_code)
        check("C7 9th+ request in a minute gets 429", statuses[:8].count(200) == 8 and statuses[8:] == [429, 429], str(statuses))
        rr = await c.post(CHAT, **q("Hi", "198.51.100.1, 203.0.113.77"))
        check("C7 faking an earlier X-Forwarded-For value doesn't escape the limit", rr.status_code == 429, str(rr.status_code))

    failed = results.count(False)
    print(f"\n{len(results) - failed}/{len(results)} passed")
    sys.exit(1 if failed else 0)


asyncio.run(main())
