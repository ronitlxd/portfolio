"""Serves the built portfolio from ./dist on the home server, plus the
Clippy chatbot API.

Runs bound to localhost only (see portfolio.service); Tailscale Funnel or an
SSH tunnel is the only way in. /api/chat streams replies from the
ronit-clippy Ollama model (built from server/Modelfile, see
scripts/build-clippy-model.mjs).

This endpoint is public, so it is deliberately boxed in. The browser is not
trusted for any of this (anyone can call the API directly):
  - no tools: the model can only produce text
  - request body capped at 16 KB before it is even parsed
  - strict history: alternating user/assistant turns, capped in count, per
    message and in total, ending with the visitor's question
  - per-visitor rate limit, plus an overall hourly and daily budget
  - one reply generated at a time, a small queue, a hard time limit per
    reply, and a slot that is always released (even if the visitor leaves
    before the reply starts)
  - CORS: browsers may call it only from the GitHub Pages site
  - generic error messages, basic security headers
"""
import asyncio
import json
import re
import time
from collections import defaultdict, deque
from contextlib import asynccontextmanager
from pathlib import Path

import httpx
from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

DIST = Path(__file__).parent / "dist"

OLLAMA_URL = "http://127.0.0.1:11434/api/chat"
MODEL = "ronit-clippy"

MAX_BODY_BYTES = 16 * 1024
MAX_MESSAGES = 6  # history the model sees
MAX_USER_CHARS = 500
MAX_ASSISTANT_CHARS = 1500  # Clippy's own replies are capped at ~300 tokens
MAX_HISTORY_CHARS = 3500  # all messages together (after trimming to the last 6)
RATE_LIMIT = 8  # requests per visitor...
RATE_WINDOW_S = 60  # ...per this many seconds
HOURLY_BUDGET = 300  # replies per hour, all visitors together
DAILY_BUDGET = 2000  # replies per day, all visitors together
MAX_WAITING = 4  # visitors queued behind the one being answered
REPLY_TIME_LIMIT_S = 90  # hard cap on one reply, including the wait for Ollama

# Browsers may call the API only from these pages. (CORS does not stop
# scripts or curl; the limits above are what protect the server.)
ALLOWED_ORIGINS = ["https://ronitlxd.github.io"]

# The model plus its 6144-token context does not fit the server's 4GB GPU
# (about 20% runs on CPU), so reading the ~5k-token profile cold takes
# ~45s. Llama.cpp reuses that work across requests that share the same
# system prompt, so: read it once at startup, and keep the model loaded.
# Ollama can still evict it if another model (e.g. Argus) needs the GPU;
# the next question is then slow once, not broken.
KEEP_ALIVE = "24h"

_ollama = httpx.AsyncClient(timeout=httpx.Timeout(10.0, read=REPLY_TIME_LIMIT_S))


async def _warm_up():
    try:
        await _ollama.post(
            OLLAMA_URL,
            json={
                "model": MODEL,
                "messages": [{"role": "user", "content": "Hi"}],
                "stream": False,
                "keep_alive": KEEP_ALIVE,
                "options": {"num_predict": 1},
            },
        )
    except httpx.HTTPError:
        pass  # Ollama down at boot: the first real question warms it instead


@asynccontextmanager
async def lifespan(_app):
    task = asyncio.create_task(_warm_up())
    yield
    task.cancel()


# No auto-generated docs pages, this is a public endpoint.
app = FastAPI(docs_url=None, redoc_url=None, openapi_url=None, lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_methods=["POST"],
    allow_headers=["Content-Type"],
    allow_credentials=False,
    max_age=600,
)


class BodyLimit:
    """Rejects request bodies over MAX_BODY_BYTES before anything parses
    them: by Content-Length when it is sent, by counting otherwise."""

    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            return await self.app(scope, receive, send)
        for name, value in scope.get("headers", []):
            if name == b"content-length" and value.isdigit() and int(value) > MAX_BODY_BYTES:
                return await JSONResponse({"detail": "request too large"}, 413)(scope, receive, send)

        seen = 0

        async def limited_receive():
            nonlocal seen
            message = await receive()
            if message["type"] == "http.request":
                seen += len(message.get("body", b""))
                if seen > MAX_BODY_BYTES:
                    raise HTTPException(413, "request too large")
            return message

        return await self.app(scope, limited_receive, send)


app.add_middleware(BodyLimit)


@app.middleware("http")
async def security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["Referrer-Policy"] = "no-referrer"
    response.headers["X-Frame-Options"] = "SAMEORIGIN"
    return response


@app.exception_handler(RequestValidationError)
async def bad_request(_request, _exc):
    # Don't echo the visitor's input or the validation internals back.
    return JSONResponse({"detail": "invalid request"}, 400)


_one_at_a_time = asyncio.Semaphore(1)
_EM_DASH = re.compile(r"\s*—\s*")  # house style: no em dashes
_waiting = 0
_hits: dict[str, deque] = defaultdict(deque)
_replies: deque = deque()  # start times of recent replies, for the budgets


class ChatMessage(BaseModel):
    role: str = Field(pattern="^(user|assistant)$")
    content: str = Field(max_length=MAX_ASSISTANT_CHARS)


class ChatRequest(BaseModel):
    messages: list[ChatMessage] = Field(min_length=1, max_length=20)


def _client_ip(request: Request) -> str:
    # Only Tailscale (Funnel/serve) or an SSH tunnel can reach this app.
    # Use the LAST X-Forwarded-For value: that is the one our own proxy
    # added; anything before it came from the visitor and can be faked.
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[-1].strip()
    return request.client.host if request.client else "unknown"


def _rate_limited(ip: str) -> bool:
    now = time.monotonic()
    hits = _hits[ip]
    while hits and now - hits[0] > RATE_WINDOW_S:
        hits.popleft()
    if len(hits) >= RATE_LIMIT:
        return True
    hits.append(now)
    if len(_hits) > 10_000:  # don't grow forever
        _hits.clear()
    return False


def _over_budget() -> bool:
    now = time.monotonic()
    while _replies and now - _replies[0] > 86_400:
        _replies.popleft()
    last_hour = sum(1 for t in _replies if now - t <= 3600)
    if last_hour >= HOURLY_BUDGET or len(_replies) >= DAILY_BUDGET:
        return True
    _replies.append(now)
    return False


def _checked_history(messages: list[ChatMessage]) -> list[ChatMessage]:
    """Last MAX_MESSAGES turns, strictly alternating and ending with the
    visitor's question; rejects anything else."""
    messages = messages[-MAX_MESSAGES:]
    if messages[0].role != "user":  # trimmed history must start with the visitor
        messages = messages[1:]
    for i, m in enumerate(messages):
        if m.role != ("user" if i % 2 == 0 else "assistant"):
            raise HTTPException(400, "invalid request")
        if m.role == "user" and len(m.content) > MAX_USER_CHARS:
            raise HTTPException(400, "invalid request")
    if not messages or messages[-1].role != "user" or not messages[-1].content.strip():
        raise HTTPException(400, "invalid request")
    if sum(len(m.content) for m in messages) > MAX_HISTORY_CHARS:
        raise HTTPException(400, "invalid request")
    return messages


@app.get("/api/health")
def health():
    return {"ok": True}


@app.post("/api/chat")
async def chat(body: ChatRequest, request: Request):
    global _waiting

    messages = _checked_history(body.messages)

    if _rate_limited(_client_ip(request)):
        raise HTTPException(429, "too many messages, slow down")
    if _over_budget():
        raise HTTPException(503, "Clippy is busy, try again later")
    if _waiting >= MAX_WAITING:
        raise HTTPException(503, "Clippy is busy, try again shortly")

    _waiting += 1
    try:
        await asyncio.wait_for(_one_at_a_time.acquire(), timeout=REPLY_TIME_LIMIT_S)
    except asyncio.TimeoutError:
        raise HTTPException(503, "Clippy is busy, try again shortly")
    finally:
        _waiting -= 1

    # Release the slot exactly once: when the reply ends, when it fails, or
    # (safety net) if the visitor left before the reply even started.
    released = False

    def release():
        nonlocal released
        if not released:
            released = True
            _one_at_a_time.release()

    asyncio.get_running_loop().call_later(REPLY_TIME_LIMIT_S + 15, release)

    payload = {
        "model": MODEL,
        "messages": [{"role": m.role, "content": m.content} for m in messages],
        "stream": True,
        "keep_alive": KEEP_ALIVE,
    }
    try:
        resp = await _ollama.send(_ollama.build_request("POST", OLLAMA_URL, json=payload), stream=True)
        resp.raise_for_status()
    except httpx.HTTPError:
        release()
        raise HTTPException(503, "model unavailable")

    async def stream():
        after_dash = False  # strip the space a dash left at the next chunk's start
        deadline = time.monotonic() + REPLY_TIME_LIMIT_S
        try:
            async for line in resp.aiter_lines():
                if time.monotonic() > deadline:
                    break
                if not line:
                    continue
                chunk = json.loads(line)
                text = chunk.get("message", {}).get("content", "")
                if text:
                    # House style: no em dashes, even if the model slips.
                    text = _EM_DASH.sub(", ", text)
                    if after_dash:
                        text = text.lstrip(" ")
                    after_dash = text.endswith(", ")
                    if text:
                        yield text
                if chunk.get("done"):
                    break
        finally:
            await resp.aclose()
            release()

    return StreamingResponse(
        stream(),
        media_type="text/plain; charset=utf-8",
        headers={"Cache-Control": "no-store", "X-Accel-Buffering": "no"},
    )


# Must be mounted last, it catches every remaining path.
app.mount("/", StaticFiles(directory=DIST, html=True), name="site")
