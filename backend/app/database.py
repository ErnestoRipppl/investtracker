"""
Database configuration module.
Sets up SQLAlchemy 2.0 engine, session factory, and base class.
"""

import os

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.config import settings


# Parse and format DATABASE_URL
db_url = settings.DATABASE_URL
if db_url.startswith("postgres://"):
    db_url = db_url.replace("postgres://", "postgresql+psycopg2://", 1)

is_sqlite = db_url.startswith("sqlite")

# Ensure the data directory exists for SQLite
if is_sqlite:
    _db_path = db_url.replace("sqlite:///", "")
    _db_dir = os.path.dirname(_db_path)
    if _db_dir:
        os.makedirs(_db_dir, exist_ok=True)

connect_args = {"check_same_thread": False} if is_sqlite else {}

engine = create_engine(
    db_url,
    connect_args=connect_args,
    echo=settings.DEBUG,
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    """Declarative base class for all ORM models."""
    pass


def get_db():
    """
    Dependency injection generator that yields a database session.
    Ensures the session is closed after each request.

    Yields:
        Session: A SQLAlchemy database session.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db() -> None:
    """
    Initialize the database by creating all tables defined in metadata.
    Should be called once at application startup.
    """
    from app.models import Asset, Broker, InvestorProfile, PortfolioSnapshot, Transaction  # noqa: F401

    Base.metadata.create_all(bind=engine)
