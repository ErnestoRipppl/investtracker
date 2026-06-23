"""
Transaction Pydantic schemas for request/response validation.
"""

from datetime import date as date_type
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class TransactionCreate(BaseModel):
    """Schema for creating a new transaction."""

    ticker: str = Field(..., description="Asset ticker symbol (e.g., 'AAPL')")
    transaction_type: str = Field(..., description="Type: 'buy', 'sell', or 'dividend'")
    quantity: float = Field(..., gt=0, description="Number of shares/units")
    unit_price: float = Field(..., ge=0, description="Price per share/unit in EUR")
    commission: float = Field(default=0, ge=0, description="Broker commission in EUR")
    notes: Optional[str] = Field(default=None, description="Optional notes")
    date: date_type = Field(..., description="Transaction date")
    broker_id: Optional[int] = Field(default=None, description="Broker ID")


class TransactionUpdate(BaseModel):
    """Schema for updating an existing transaction."""

    ticker: Optional[str] = None
    transaction_type: Optional[str] = None
    quantity: Optional[float] = Field(default=None, gt=0)
    unit_price: Optional[float] = Field(default=None, ge=0)
    commission: Optional[float] = Field(default=None, ge=0)
    notes: Optional[str] = None
    date: Optional[date_type] = None
    broker_id: Optional[int] = None


class TransactionResponse(BaseModel):
    """Schema for transaction response."""

    id: int
    asset_id: int
    ticker: str
    transaction_type: str
    quantity: float
    unit_price: float
    commission: float
    total_invested: float
    notes: Optional[str] = None
    date: date_type
    broker_id: Optional[int] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class TransactionListResponse(BaseModel):
    """Schema for paginated transaction list response."""

    total: int
    items: list[TransactionResponse]
