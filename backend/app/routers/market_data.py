"""
Market data router — price lookups and cache management.
"""

from decimal import Decimal

from fastapi import APIRouter, Query

from app.services.market_service import get_bulk_prices, refresh_cache

router = APIRouter(prefix="/api/market", tags=["market"])


@router.get("/prices")
def get_prices(
    tickers: str = Query(..., description="Comma-separated ticker symbols"),
) -> dict:
    """
    Get current prices for one or more tickers.

    Args:
        tickers: Comma-separated ticker symbols (e.g., 'AAPL,MSFT').

    Returns:
        dict mapping ticker -> {price, stale}.
    """
    ticker_list = [t.strip().upper() for t in tickers.split(",") if t.strip()]
    if not ticker_list:
        return {"error": "No tickers provided"}

    prices = get_bulk_prices(ticker_list)

    # Serialize Decimals
    result = {}
    for ticker, data in prices.items():
        result[ticker] = {
            "price": float(data["price"]) if data["price"] is not None else None,
            "stale": data["stale"],
        }
    return result


@router.post("/refresh")
def force_refresh(
    tickers: str = Query(default="", description="Comma-separated tickers to refresh, or empty for all"),
) -> dict:
    """
    Force refresh the price cache.

    If tickers are provided, only those are refreshed.
    Otherwise, all cached tickers are refreshed.
    """
    ticker_list = None
    if tickers:
        ticker_list = [t.strip().upper() for t in tickers.split(",") if t.strip()]

    result = refresh_cache(ticker_list)
    return result
