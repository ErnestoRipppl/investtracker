"""
Portfolio router — holdings, allocation, and history endpoints.
"""

from decimal import Decimal

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.portfolio_snapshot import PortfolioSnapshot
from app.services.portfolio_engine import compute_allocation, compute_holdings, compute_dashboard
from app.services.market_service import get_bulk_prices, get_eur_usd_rate

router = APIRouter(prefix="/api/portfolio", tags=["portfolio"])


@router.get("/holdings")
def get_holdings(db: Session = Depends(get_db)) -> dict:
    """
    Get current portfolio holdings with P&L calculations.

    Returns holdings enriched with current prices, unrealized P&L,
    and portfolio weights.
    """
    holdings = compute_holdings(db)
    if not holdings:
        return {"holdings": [], "total_assets": 0}

    tickers = [h["ticker"] for h in holdings]
    prices_data = get_bulk_prices(tickers)
    market_prices: dict[str, Decimal] = {}
    for t, d in prices_data.items():
        if d["price"] is not None:
            market_prices[t] = d["price"]
        else:
            # Fall back to avg_price for display
            for h in holdings:
                if h["ticker"] == t:
                    market_prices[t] = h["avg_price"]

    eur_usd = get_eur_usd_rate()
    dashboard = compute_dashboard(holdings, market_prices, eur_usd)

    # Serialize Decimals to floats for JSON response
    return _serialize(dashboard)


@router.get("/allocation")
def get_allocation(db: Session = Depends(get_db)) -> dict:
    """
    Get portfolio allocation by asset type and sector.
    """
    holdings = compute_holdings(db)
    if not holdings:
        return {"by_type": [], "by_sector": []}

    tickers = [h["ticker"] for h in holdings]
    prices_data = get_bulk_prices(tickers)
    market_prices: dict[str, Decimal] = {}
    for t, d in prices_data.items():
        if d["price"] is not None:
            market_prices[t] = d["price"]
        else:
            for h in holdings:
                if h["ticker"] == t:
                    market_prices[t] = h["avg_price"]

    eur_usd = get_eur_usd_rate()
    dashboard = compute_dashboard(holdings, market_prices, eur_usd)

    allocation = {
        "by_type": dashboard["allocation_by_type"],
        "by_sector": dashboard["allocation_by_sector"],
    }
    return _serialize(allocation)


@router.get("/history")
def get_history(
    limit: int = 30,
    db: Session = Depends(get_db),
) -> list[dict]:
    """
    Get historical portfolio snapshots.
    """
    from datetime import date
    
    snapshots = (
        db.query(PortfolioSnapshot)
        .order_by(PortfolioSnapshot.date.desc())
        .limit(limit)
        .all()
    )

    if len(snapshots) >= 2:
        # Snapshots exist, return them sorted ascending (oldest first) for the chart
        snapshots_list = list(snapshots)
        snapshots_list.reverse()
        return [
            {
                "id": s.id,
                "date": s.date.isoformat(),
                "value": float(s.total_value_eur),
                "total_value_eur": float(s.total_value_eur),
                "invested": float(s.total_invested),
                "total_invested": float(s.total_invested),
                "pnl": float(s.total_pnl),
                "total_pnl": float(s.total_pnl),
            }
            for s in snapshots_list
        ]

    # Fallback: Dynamically generate history from transactions
    from app.models.transaction import Transaction
    from app.models.asset import Asset
    
    txns = db.query(Transaction).order_by(Transaction.date).all()
    if not txns:
        return []
        
    # Get distinct transaction dates
    dates = sorted(list({t.date for t in txns}))
    
    # Also add today's date if not present
    today_dt = date.today()
    if today_dt not in dates:
        dates.append(today_dt)
        
    # Fetch current prices for EUNL, etc. if date is today
    from app.services import market_service
    tickers = list({db.query(Asset).filter(Asset.id == t.asset_id).first().ticker for t in txns})
    prices_data = market_service.get_bulk_prices(tickers)
    current_prices = {t: float(d["price"]) for t, d in prices_data.items() if d["price"] is not None}

    history = []
    for idx, d in enumerate(dates):
        # Transactions up to this date
        sub_txns = [t for t in txns if t.date <= d]
        
        # Group by asset
        asset_qtys = {}
        asset_last_prices = {}
        total_buys = 0.0
        total_sells = 0.0
        
        for t in sub_txns:
            asset_obj = db.query(Asset).filter(Asset.id == t.asset_id).first()
            ticker = asset_obj.ticker if asset_obj else "UNKNOWN"
            ttype = t.transaction_type.strip().lower()
            qty = float(t.quantity)
            price = float(t.unit_price)
            total_inv = float(t.total_invested)
            
            if ttype in ("buy", "compra"):
                asset_qtys[ticker] = asset_qtys.get(ticker, 0.0) + qty
                asset_last_prices[ticker] = price
                total_buys += total_inv
            elif ttype in ("sell", "venta"):
                asset_qtys[ticker] = asset_qtys.get(ticker, 0.0) - qty
                asset_last_prices[ticker] = price
                total_sells += total_inv
                
        # Total invested net
        invested = total_buys - total_sells
        
        # Total value
        value = 0.0
        for ticker, qty in asset_qtys.items():
            if qty > 0:
                if d == today_dt and ticker in current_prices:
                    price = current_prices[ticker]
                else:
                    price = asset_last_prices.get(ticker, 0.0)
                value += qty * price
                
        history.append({
            "id": idx + 1,
            "date": d.isoformat(),
            "value": round(value, 2),
            "total_value_eur": round(value, 2),
            "invested": round(invested, 2),
            "total_invested": round(invested, 2),
            "pnl": round(value - invested, 2),
            "total_pnl": round(value - invested, 2),
        })
        
    return history[-limit:]


def _serialize(obj):
    """Recursively convert Decimal values to float for JSON serialization."""
    if isinstance(obj, Decimal):
        return float(obj)
    if isinstance(obj, dict):
        return {k: _serialize(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [_serialize(item) for item in obj]
    return obj
