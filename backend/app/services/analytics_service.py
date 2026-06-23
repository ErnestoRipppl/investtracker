"""
Analytics service.

Computes portfolio-level and asset-level metrics based on transactions and current prices.
Does not require daily return series snapshots.
"""

import logging
from decimal import Decimal
from datetime import date
from sqlalchemy.orm import Session

from app.models.transaction import Transaction
from app.models.asset import Asset
from app.services.portfolio_engine import compute_holdings, compute_dashboard
from app.services import market_service
from app.utils.financial_math import roi, cagr

logger = logging.getLogger(__name__)


def get_portfolio_kpis(db: Session) -> dict:
    """
    Compute basic portfolio KPIs: total value, invested, ROI, CAGR.
    """
    holdings = compute_holdings(db)
    if not holdings:
        return {
            "total_value_eur": Decimal("0"),
            "total_invested": Decimal("0"),
            "roi_pct": Decimal("0"),
            "cagr_pct": Decimal("0"),
            "total_assets": 0,
            "total_commission": Decimal("0"),
        }

    tickers = [h["ticker"] for h in holdings]
    prices_data = market_service.get_bulk_prices(tickers)
    market_prices = {
        t: d["price"] for t, d in prices_data.items() if d["price"] is not None
    }

    # Fetch EURUSD rate
    eur_usd = market_service.get_eur_usd_rate()
    dashboard = compute_dashboard(holdings, market_prices, eur_usd)

    total_value = dashboard["total_value_eur"]
    total_invested = dashboard["total_invested"]
    
    # Commissions from all transactions
    txns = db.query(Transaction).all()
    total_commission = sum(t.commission for t in txns)

    try:
        roi_val = roi(total_value, total_invested)
        roi_pct = roi_val * Decimal("100")
    except ValueError:
        roi_pct = Decimal("0")

    # CAGR: estimate years from oldest transaction
    oldest = db.query(Transaction.date).order_by(Transaction.date).first()
    if oldest and oldest[0]:
        days = (date.today() - oldest[0]).days
        years = max(days / 365.25, 0.01)
        try:
            cagr_val = cagr(total_invested, total_value, years)
            cagr_pct = cagr_val * Decimal("100")
        except ValueError:
            cagr_pct = Decimal("0")
    else:
        cagr_pct = Decimal("0")

    return {
        "total_value_eur": total_value.quantize(Decimal("0.01")),
        "total_invested": total_invested.quantize(Decimal("0.01")),
        "roi_pct": roi_pct.quantize(Decimal("0.01")),
        "cagr_pct": cagr_pct.quantize(Decimal("0.01")),
        "total_assets": len(holdings),
        "total_commission": total_commission.quantize(Decimal("0.01")),
    }


def get_portfolio_analytics(db: Session) -> dict:
    """
    Compute comprehensive portfolio analytics based purely on current transactions.

    Returns:
        dict containing:
            - pnl_realizado: Sum of P&L from sales.
            - pnl_no_realizado: Sum of unrealized P&L from open positions.
            - retorno_total_pct: Net return percentage of current holdings.
            - comisiones_totales: Total commissions paid across all transactions.
            - comisiones_detalles: Dict of commissions by ticker.
            - holdings_pnl: List of active holdings with P&L and weights.
            - mejor_activo: Ticker and return % of best holding.
            - peor_activo: Ticker and return % of worst holding.
    """
    # 1. Fetch active holdings
    holdings = compute_holdings(db)
    tickers = [h["ticker"] for h in holdings]
    prices_data = market_service.get_bulk_prices(tickers)
    market_prices = {
        t: d["price"] for t, d in prices_data.items() if d["price"] is not None
    }
    
    eur_usd = market_service.get_eur_usd_rate()
    dashboard = compute_dashboard(holdings, market_prices, eur_usd)
    
    # 2. Get all transactions to compute realized P&L and commissions
    txns = db.query(Transaction).all()
    
    # Calculate average purchase price for all assets to use as cost basis for sales
    asset_buys: dict[int, list[tuple[Decimal, Decimal]]] = {}
    for t in txns:
        txn_type = str(t.transaction_type).strip().lower()
        if txn_type in ("buy", "compra"):
            asset_buys.setdefault(t.asset_id, []).append((t.quantity, t.unit_price))
            
    asset_avg_cost: dict[int, Decimal] = {}
    for aid, buys in asset_buys.items():
        total_qty = sum(q for q, _ in buys)
        if total_qty > 0:
            total_cost = sum(q * p for q, p in buys)
            asset_avg_cost[aid] = total_cost / total_qty
        else:
            asset_avg_cost[aid] = Decimal("0")

    # Compute realized P&L and commissions
    realized_pnl = Decimal("0")
    total_commissions = Decimal("0")
    commissions_by_ticker: dict[str, Decimal] = {}
    
    # Fetch assets to map asset_id to ticker
    assets = {a.id: a.ticker for a in db.query(Asset).all()}
    
    for t in txns:
        ticker = assets.get(t.asset_id, "UNKNOWN")
        total_commissions += t.commission
        commissions_by_ticker[ticker] = commissions_by_ticker.get(ticker, Decimal("0")) + t.commission
        
        txn_type = str(t.transaction_type).strip().lower()
        if txn_type in ("sell", "venta"):
            avg_cost = asset_avg_cost.get(t.asset_id, Decimal("0"))
            # P&L = Q * (Sell_Price - Buy_Avg_Price) - sell_commission
            sale_pnl = t.quantity * (t.unit_price - avg_cost) - t.commission
            realized_pnl += sale_pnl

    # 3. Process active holdings details
    holdings_pnl = []
    mejor_holding = None
    peor_holding = None
    
    for h in dashboard["holdings"]:
        ticker = h["ticker"]
        pnl = h["unrealized_pnl"]
        pnl_pct = h["pnl_pct"]
        coste_medio = h["avg_price"]
        current_price = h["current_price"]
        qty = h["accumulated_qty"]
        weight = h["weight"]
        
        item = {
            "ticker": ticker,
            "name": h["name"],
            "qty": float(qty),
            "coste_medio": float(coste_medio),
            "precio_actual": float(current_price),
            "pnl": float(pnl),
            "pnl_pct": float(pnl_pct),
            "weight": float(weight),
            "total_invested": float(h["total_invested"]),
            "current_value": float(h["position_value"])
        }
        holdings_pnl.append(item)
        
        if mejor_holding is None or pnl_pct > mejor_holding["pnl_pct"]:
            mejor_holding = {"ticker": ticker, "pnl_pct": float(pnl_pct)}
        if peor_holding is None or pnl_pct < peor_holding["pnl_pct"]:
            peor_holding = {"ticker": ticker, "pnl_pct": float(pnl_pct)}

    # 4. Calculate global total return percentage (realized + unrealized over net invested capital)
    total_buys = Decimal("0")
    total_sells = Decimal("0")
    for t in txns:
        ttype = str(t.transaction_type).strip().lower()
        if ttype in ("buy", "compra"):
            total_buys += t.total_invested
        elif ttype in ("sell", "venta"):
            total_sells += t.total_invested
            
    capital_neto = total_buys - total_sells
    beneficio_total = realized_pnl + dashboard["total_pnl"]
    if capital_neto > 0:
        retorno_total_global_pct = (beneficio_total / capital_neto) * Decimal("100")
    else:
        retorno_total_global_pct = Decimal("0")

    return {
        "pnl_realizado": float(realized_pnl),
        "pnl_no_realizado": float(dashboard["total_pnl"]),
        "retorno_total_pct": float(dashboard["total_pnl_pct"]),
        "retorno_total_global_pct": float(retorno_total_global_pct.quantize(Decimal("0.01"))),
        "comisiones_totales": float(total_commissions),
        "comisiones_detalles": {k: float(v) for k, v in commissions_by_ticker.items()},
        "holdings": holdings_pnl,
        "mejor_activo": mejor_holding,
        "peor_activo": peor_holding,
    }
