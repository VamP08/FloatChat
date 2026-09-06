import os
from pathlib import Path

from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

# Falls back to the small database committed under data/ so a fresh clone runs with
# no configuration. Production sets DATABASE_URL to a Postgres connection string.
DEFAULT_SQLITE = Path(__file__).resolve().parent.parent / "data" / "argo_demo.sqlite"
DATABASE_URL = os.getenv("DATABASE_URL", f"sqlite:///{DEFAULT_SQLITE}")

engine = create_engine(
    DATABASE_URL,
    echo=os.getenv("SQL_ECHO", "").lower() in ("1", "true", "yes"),
    pool_pre_ping=True,
    # SQLite alone needs the threading guard; passing it to Postgres is an error.
    connect_args={"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {},
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    """Yield a session per request and close it when the request ends."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
