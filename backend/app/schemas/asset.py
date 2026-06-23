"""
Asset Pydantic schemas for request/response validation.
"""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class AssetCreate(BaseModel):
    """Schema for creating a new asset."""

    ticker: str = Field(..., description="Unique ticker symbol")
    name: str = Field(..., description="Asset display name")
    asset_type: str = Field(default="stock", description="Type: stock, etf, bond, crypto, fund")
    sector: Optional[str] = Field(default=None, description="Industry sector")
    currency: str = Field(default="EUR", description="Trading currency")
    exchange: Optional[str] = Field(default=None, description="Exchange name")


class AssetResponse(BaseModel):
    """Schema for asset response."""

    id: int
    ticker: str
    name: str
    asset_type: str
    sector: Optional[str] = None
    currency: str
    exchange: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}
