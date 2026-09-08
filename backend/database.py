import os
from pathlib import Path

from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

# Falls back to the small database committed under data/ so a fresh clone runs with
# no configuration. Production sets DATABASE_URL to a Postgres connection string.
DEFAULT_SQLITE = Path(__file__).resolve().parent.parent / "data" / "argo_demo.sqlite"


def normalise_dsn(url: str) -> str:
    """Route bare postgres URLs through psycopg 3 rather than psycopg 2.

    SQLAlchemy maps ``postgresql://`` to psycopg 2, whose executemany sends one INSERT
    per row. Against a hosted database that is a network round trip per measurement: the
    full load measured at roughly 26 hours, versus minutes on psycopg 3, which batches.

    Every provider hands out the bare form -- Neon's dashboard included -- so the fast
    path has to be the default rather than something the README asks you to remember.
    """
    for prefix in ("postgresql://", "postgres://"):
        if url.startswith(prefix):
            return "postgresql+psycopg://" + url[len(prefix):]
    return url


DATABASE_URL = normalise_dsn(os.getenv("DATABASE_URL", f"sqlite:///{DEFAULT_SQLITE}"))

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
