"""
PortfolioSnapshot model for tracking daily portfolio state.
"""

from datetime import date, datetime
from decimal import Decimal
from typing import Optional

from sqlalchemy import Date, Numeric, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class PortfolioSnapshot(Base):
    """
    Daily snapshot of the portfolio's aggregate state.

    Stores total values and a JSON string of individual holdings
    for historical tracking and performance analysis.

    Attributes:
        id: Primary key, auto-incremented.
        date: Snapshot date (unique).
        total_value_eur: Total portfolio market value in EUR.
        total_invested: Total amount invested to date.
        total_pnl: Total profit/loss (realized + unrealized).
        holdings_json: JSON string with per-asset details.
        created_at: Timestamp of record creation.
    """

    __tablename__ = "portfolio_snapshots"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    date: Mapped[date] = mapped_column(Date, unique=True, index=True, nullable=False)
    total_value_eur: Mapped[Decimal] = mapped_column(Numeric(18, 4), nullable=False)
    total_invested: Mapped[Decimal] = mapped_column(Numeric(18, 4), nullable=False)
    total_pnl: Mapped[Decimal] = mapped_column(Numeric(18, 4), nullable=False)
    holdings_json: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow, nullable=False)

    def __repr__(self) -> str:
        return (
            f"<PortfolioSnapshot(date={self.date}, "
            f"value={self.total_value_eur}, pnl={self.total_pnl})>"
        )
