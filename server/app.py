"""Serves the built portfolio from ./dist on the home server, plus the
Clippy chatbot API.

Runs bound to localhost only (see portfolio.service); Tailscale Funnel or an
SSH tunnel is the only way in. /api/chat streams replies from the
ronit-clippy Ollama model (built from server/Modelfile, see
scripts/build-clippy-model.mjs).

This endpoint is meant to be public, so it is deliberately boxed in: no
tools, short capped inputs and history, a reply length cap (num_predict in
the Modelfile), a per-visitor rate limit, and one reply generated at a time
with a small queue.
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
from fastapi.responses import StreamingResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

DIST = Path(__file__).parent / "dist"

OLLAMA_URL = "http://127.0.0.1:11434/api/chat"
MODEL = "ronit-clippy"

MAX_MESSAGES = 6  # history the model sees
MAX_USER_CHARS = 500
MAX_ASSISTANT_CHARS = 2000
RATE_LIMIT = 8  # requests per visitor...
RATE_WINDOW_S = 60  # ...per this many seconds
MAX_WAITING = 4  # visitors queued behind the one being answered

# The model plus its 6144-token context does not fit the server's 4GB GPU
# (about 20% runs on CPU), so reading the ~4.4k-token profile cold takes
# ~45s. Llama.cpp reuses that work across requests that share the same
# system prompt, so: read it once at startup, and keep the model loaded.
# Ollama can still evict it if another model (e.g. Argus) needs the GPU;
# the next question is then slow once, not broken.
KEEP_ALIVE = "24h"

_ollama = httpx.AsyncClient(timeout=httpx.Timeout(10.0, read=180.0))


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

_one_at_a_time = asyncio.Semaphore(1)
_EM_DASH = re.compile(r"\s*—\s*")  # house style: no em dashes
_waiting = 0
_hits: dict[str, deque] = defaultdict(deque)


class ChatMessage(BaseModel):
    role: str = Field(pattern="^(user|assistant)$")
    content: str = Field(max_length=MAX_ASSISTANT_CHARS)


class ChatRequest(BaseModel):
    messages: list[ChatMessage] = Field(min_length=1, max_length=20)


def _client_ip(request: Request) -> str:
    # Only Tailscale (Funnel/serve) or an SSH tunnel can reach this app, so
    # the forwarded header is set by them, not by the visitor.
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
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


@app.get("/api/health")
def health():
    return {"ok": True}


@app.post("/api/chat")
async def chat(body: ChatRequest, request: Request):
    global _waiting

    messages = body.messages[-MAX_MESSAGES:]
    if messages[-1].role != "user":
        raise HTTPException(400, "last message must be from the user")
    if len(messages[-1].content.strip()) == 0 or len(messages[-1].content) > MAX_USER_CHARS:
        raise HTTPException(400, f"message must be 1 to {MAX_USER_CHARS} characters")

    if _rate_limited(_client_ip(request)):
        raise HTTPException(429, "too many messages, slow down")

    if _waiting >= MAX_WAITING:
        raise HTTPException(503, "Clippy is busy, try again shortly")
    _waiting += 1
    try:
        await _one_at_a_time.acquire()
    finally:
        _waiting -= 1

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
        _one_at_a_time.release()
        raise HTTPException(503, "model unavailable")

    async def stream():
        try:
            async for line in resp.aiter_lines():
                if not line:
                    continue
                chunk = json.loads(line)
                text = chunk.get("message", {}).get("content", "")
                if text:
                    # House style: no em dashes, even if the model slips.
                    yield _EM_DASH.sub(", ", text)
                if chunk.get("done"):
                    break
        finally:
            await resp.aclose()
            _one_at_a_time.release()

    return StreamingResponse(
        stream(),
        media_type="text/plain; charset=utf-8",
        headers={"Cache-Control": "no-store", "X-Accel-Buffering": "no"},
    )


# Must be mounted last, it catches every remaining path.
app.mount("/", StaticFiles(directory=DIST, html=True), name="site")
