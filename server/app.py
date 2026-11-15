"""Serves the built portfolio from ./dist on the home server.

Runs behind Tailscale Funnel, bound to localhost only (see portfolio.service).
The chatbot's /api/chat endpoint will be added to this same app.
"""
from pathlib import Path

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles

DIST = Path(__file__).parent / "dist"

# No auto-generated docs pages, this is a public endpoint.
app = FastAPI(docs_url=None, redoc_url=None, openapi_url=None)


@app.get("/api/health")
def health():
    return {"ok": True}


# Must be mounted last, it catches every remaining path.
app.mount("/", StaticFiles(directory=DIST, html=True), name="site")
