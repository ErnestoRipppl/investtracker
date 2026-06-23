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

    # Seed default brokers if empty
    db = SessionLocal()
    try:
        if db.query(Broker).count() == 0:
            from decimal import Decimal
            revolut = Broker(
                name="Revolut",
                commission_type="percentage",
                commission_fixed_eur=Decimal("0.0"),
                commission_pct=Decimal("0.0025"),  # 0.25%
                min_commission_eur=Decimal("1.00"),  # €1.00 min
                max_commission_eur=None,
                custody_fee_annual_pct=Decimal("0.0012"),  # 0.12% annual
                fx_spread_pct=Decimal("0.0050"),  # 0.50% FX markup
                is_default=True,
            )
            ib = Broker(
                name="Interactive Brokers",
                commission_type="fixed",
                commission_fixed_eur=Decimal("1.25"),
                commission_pct=Decimal("0.0"),
                min_commission_eur=Decimal("1.25"),
                max_commission_eur=None,
                custody_fee_annual_pct=Decimal("0.0"),
                fx_spread_pct=Decimal("0.002"),
                is_default=False,
            )
            degiro = Broker(
                name="DEGIRO",
                commission_type="fixed",
                commission_fixed_eur=Decimal("1.00"),
                commission_pct=Decimal("0.0"),
                min_commission_eur=Decimal("1.00"),
                max_commission_eur=None,
                custody_fee_annual_pct=Decimal("0.0"),
                fx_spread_pct=Decimal("0.0025"),
                is_default=False,
            )
            tr = Broker(
                name="Trade Republic",
                commission_type="fixed",
                commission_fixed_eur=Decimal("1.00"),
                commission_pct=Decimal("0.0"),
                min_commission_eur=Decimal("1.00"),
                max_commission_eur=None,
                custody_fee_annual_pct=Decimal("0.0"),
                fx_spread_pct=Decimal("0.0"),
                is_default=False,
            )
            db.add_all([revolut, ib, degiro, tr])
            db.commit()
    except Exception as e:
        print(f"Error seeding default brokers: {e}")
        db.rollback()
    finally:
        db.close()

