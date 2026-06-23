"""
Broker model for tracking broker commissions and costs.
"""

from datetime import datetime
from decimal import Decimal
from typing import TYPE_CHECKING, Optional

from sqlalchemy import Boolean, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

if TYPE_CHECKING:
    from app.models.transaction import Transaction


class Broker(Base):
    """
    Represents a brokerage with its fee structure.

    Supports fixed, percentage, and tiered commission models,
    plus custody fees and FX spreads.

    Attributes:
        id: Primary key, auto-incremented.
        name: Broker name (e.g., 'Interactive Brokers', 'DEGIRO').
        commission_type: Fee model ('fixed', 'percentage', 'tiered').
        commission_fixed_eur: Fixed commission in EUR per trade.
        commission_pct: Commission as percentage of trade value.
        min_commission_eur: Minimum commission per trade.
        max_commission_eur: Maximum commission per trade (cap).
        custody_fee_annual_pct: Annual custody fee as percentage.
        fx_spread_pct: Foreign exchange spread percentage.
        is_default: Whether this is the default broker.
        created_at: Timestamp of creation.
    """

    __tablename__ = "brokers"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    commission_type: Mapped[str] = mapped_column(
        String(20), default="fixed", nullable=False
    )
    commission_fixed_eur: Mapped[Decimal] = mapped_column(
        Numeric(18, 4), default=Decimal("0"), nullable=False
    )
    commission_pct: Mapped[Decimal] = mapped_column(
        Numeric(8, 6), default=Decimal("0"), nullable=False
    )
    min_commission_eur: Mapped[Decimal] = mapped_column(
        Numeric(18, 4), default=Decimal("0"), nullable=False
    )
    max_commission_eur: Mapped[Optional[Decimal]] = mapped_column(
        Numeric(18, 4), nullable=True
    )
    custody_fee_annual_pct: Mapped[Decimal] = mapped_column(
        Numeric(8, 6), default=Decimal("0"), nullable=False
    )
    fx_spread_pct: Mapped[Decimal] = mapped_column(
        Numeric(8, 6), default=Decimal("0"), nullable=False
    )
    is_default: Mapped[bool] = mapped_column(
        Boolean, default=False, nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(
        default=datetime.utcnow, nullable=False
    )

    # Relationships
    transactions: Mapped[list["Transaction"]] = relationship(
        "Transaction", back_populates="broker"
    )

    def __repr__(self) -> str:
        return f"<Broker(id={self.id}, name='{self.name}', type='{self.commission_type}')>"
