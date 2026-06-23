"""
Portfolio Pydantic schemas for dashboard and allocation responses.
"""

from typing import Optional

from pydantic import BaseModel


class HoldingResponse(BaseModel):
    """Schema for a single holding in the portfolio."""

    asset_id: int
    ticker: str
    name: str
    asset_type: str
    sector: Optional[str] = None
    accumulated_qty: float
    avg_price: float
    total_invested: float
    total_commission: float
    current_price: Optional[float] = None
    position_value: Optional[float] = None
    unrealized_pnl: Optional[float] = None
    pnl_pct: Optional[float] = None
    weight: Optional[float] = None


class AllocationItemResponse(BaseModel):
    """Schema for a single allocation item (type or sector)."""

    name: str
    value: float
    percentage: float


class AllocationResponse(BaseModel):
    """Schema for full allocation breakdown."""

    by_type: list[AllocationItemResponse]
    by_sector: list[AllocationItemResponse]


class DashboardResponse(BaseModel):
    """Schema for the portfolio dashboard."""

    total_value_eur: float
    total_value_usd: float
    total_invested: float
    total_pnl: float
    total_pnl_pct: float
    total_assets: int
    holdings: list[HoldingResponse]
    allocation_by_type: list[AllocationItemResponse]
    allocation_by_sector: list[AllocationItemResponse]
