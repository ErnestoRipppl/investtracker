"""
Broker Pydantic schemas for request/response validation.
"""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class BrokerCreate(BaseModel):
    """Schema for creating a new broker."""

    name: str = Field(..., description="Broker name")
    commission_type: str = Field(default="fixed", description="Commission type: fixed, percentage, tiered")
    commission_fixed_eur: float = Field(default=0, ge=0)
    commission_pct: float = Field(default=0, ge=0)
    min_commission_eur: float = Field(default=0, ge=0)
    max_commission_eur: Optional[float] = Field(default=None, ge=0)
    custody_fee_annual_pct: float = Field(default=0, ge=0)
    fx_spread_pct: float = Field(default=0, ge=0)
    is_default: bool = Field(default=False)


class BrokerUpdate(BaseModel):
    """Schema for updating a broker."""

    name: Optional[str] = None
    commission_type: Optional[str] = None
    commission_fixed_eur: Optional[float] = Field(default=None, ge=0)
    commission_pct: Optional[float] = Field(default=None, ge=0)
    min_commission_eur: Optional[float] = Field(default=None, ge=0)
    max_commission_eur: Optional[float] = Field(default=None, ge=0)
    custody_fee_annual_pct: Optional[float] = Field(default=None, ge=0)
    fx_spread_pct: Optional[float] = Field(default=None, ge=0)
    is_default: Optional[bool] = None


class BrokerResponse(BaseModel):
    """Schema for broker response."""

    id: int
    name: str
    commission_type: str
    commission_fixed_eur: float
    commission_pct: float
    min_commission_eur: float
    max_commission_eur: Optional[float] = None
    custody_fee_annual_pct: float
    fx_spread_pct: float
    is_default: bool
    created_at: datetime

    model_config = {"from_attributes": True}
