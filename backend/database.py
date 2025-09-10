from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.declarative import declarative_base
from pathlib import Path

# Build an absolute path to the database file in the project root
db_path = Path(__file__).resolve().parent.parent / "argo_data.sqlite"
DATABASE_URL = f"sqlite:///{db_path}"

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False},
    echo=True
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

# Dependency: get DB session
def get_db():
    """
    Dependency to get a DB session for each request and ensure it's closed.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()