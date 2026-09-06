import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from .agent_manager import initialize_agent
from .database import engine
from .routers import chat, floats, profiles

app = FastAPI(
    title="FloatChat API",
    description="Ask questions about Argo float measurements in plain English.",
    version="1.0.0",
)

# Comma-separated list of allowed origins. The Vite dev server is the default so a
# fresh clone works; deployments set CORS_ORIGINS to the published frontend URL.
CORS_ORIGINS = [
    origin.strip()
    for origin in os.getenv("CORS_ORIGINS", "http://localhost:5173").split(",")
    if origin.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)

agent_instance = initialize_agent()

app.include_router(floats.router)
app.include_router(profiles.router)
app.include_router(chat.router)


@app.get("/")
def root():
    """Confirms the API is up and reports whether the language model is configured."""
    return {
        "message": "FloatChat API is running",
        "natural_language_enabled": agent_instance is not None,
        "docs": "/docs",
    }


@app.get("/healthz")
def healthz():
    """Liveness probe that also proves the database is reachable.

    The host sleeps this service when idle, so the first request after a quiet spell
    pays a cold start. Hitting this endpoint is how the frontend warms it up.
    """
    with engine.connect() as connection:
        connection.execute(text("SELECT 1"))
    return {"status": "ok", "database": "reachable"}
