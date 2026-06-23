"""
Transaction model representing buy/sell/dividend operations.
"""

from datetime import date, datetime
from decimal import Decimal
from typing import TYPE_CHECKING, Optional

from sqlalchemy import Date, ForeignKey, Index, Numeric, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

if TYPE_CHECKING:
    from app.models.asset import Asset
    from app.models.broker import Broker


class Transaction(Base):
    """
    Represents a portfolio transaction (buy, sell, or dividend).

    Attributes:
        id: Primary key, auto-incremented.
        asset_id: Foreign key reference to the asset.
        transaction_type: Type of transaction ('buy', 'sell', 'dividend').
        quantity: Number of shares/units transacted.
        unit_price: Price per share/unit in EUR.
        commission: Broker commission for this transaction.
        total_invested: Total amount including commissions.
        notes: Optional free-text notes.
        date: Date of the transaction.
        broker_id: Optional foreign key to the broker used.
        created_at: Timestamp of record creation.
    """

    __tablename__ = "transactions"
    __table_args__ = (
        Index("ix_transactions_asset_date", "asset_id", "date"),
    )

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    asset_id: Mapped[int] = mapped_column(
        ForeignKey("assets.id"), index=True, nullable=False
    )
    transaction_type: Mapped[str] = mapped_column(
        String(20), nullable=False
    )
    quantity: Mapped[Decimal] = mapped_column(
        Numeric(18, 8), nullable=False
    )
    unit_price: Mapped[Decimal] = mapped_column(
        Numeric(18, 4), nullable=False
    )
    commission: Mapped[Decimal] = mapped_column(
        Numeric(18, 4), default=Decimal("0"), nullable=False
    )
    total_invested: Mapped[Decimal] = mapped_column(
        Numeric(18, 4), nullable=False
    )
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    date: Mapped[date] = mapped_column(Date, index=True, nullable=False)
    broker_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("brokers.id"), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        default=datetime.utcnow, nullable=False
    )

    # Relationships
    asset: Mapped["Asset"] = relationship("Asset", back_populates="transactions")
    broker: Mapped[Optional["Broker"]] = relationship("Broker", back_populates="transactions")

    def __repr__(self) -> str:
        return (
            f"<Transaction(id={self.id}, type='{self.transaction_type}', "
            f"qty={self.quantity}, price={self.unit_price})>"
        )
