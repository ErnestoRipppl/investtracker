"""
Portfolio engine for computing holdings, dashboard, and allocation.

Queries transactions from the database and computes portfolio state.
All monetary values use Decimal.
"""

from decimal import Decimal, ROUND_HALF_UP
from typing import Optional

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.asset import Asset
from app.models.transaction import Transaction
from app.utils.financial_math import (
    weighted_average_price,
    unrealized_pnl,
    portfolio_weight,
)


def compute_holdings(
    db_session: Session, broker: Optional[int] = None
) -> list[dict]:
    """
    Query all transactions and compute current holdings.

    Groups transactions by asset, calculates accumulated quantity,
    weighted average price, total invested, and total commissions.

    Args:
        db_session: SQLAlchemy database session.
        broker: Optional broker_id to filter transactions.

    Returns:
        List of holding dicts with: asset_id, ticker, name, asset_type,
        sector, accumulated_qty, avg_price, total_invested, total_commission.
    """
    stmt = (
        select(Transaction)
        .join(Asset, Transaction.asset_id == Asset.id)
        .order_by(Transaction.date)
    )
    if broker is not None:
        stmt = stmt.where(Transaction.broker_id == broker)

    transactions = db_session.execute(stmt).scalars().all()

    # Group by asset_id
    asset_data: dict[int, dict] = {}
    for txn in transactions:
        aid = txn.asset_id
        if aid not in asset_data:
            asset_obj = db_session.get(Asset, aid)
            asset_data[aid] = {
                "asset_id": aid,
                "ticker": asset_obj.ticker if asset_obj else "UNKNOWN",
                "name": asset_obj.name if asset_obj else "Unknown",
                "asset_type": asset_obj.asset_type if asset_obj else "stock",
                "sector": asset_obj.sector if asset_obj else None,
                "buys": [],
                "total_qty": Decimal("0"),
                "total_invested": Decimal("0"),
                "total_commission": Decimal("0"),
            }

        entry = asset_data[aid]
        txn_type = str(txn.transaction_type).strip().lower()
        if txn_type in ("buy", "compra"):
            entry["buys"].append((txn.quantity, txn.unit_price))
            entry["total_qty"] += txn.quantity
        elif txn_type in ("sell", "venta"):
            entry["total_qty"] -= txn.quantity
        # dividends don't change quantity

        entry["total_commission"] += txn.commission

    holdings = []
    for aid, data in asset_data.items():
        qty = data["total_qty"]
        if qty <= Decimal("0"):
            continue

        try:
            avg_price = weighted_average_price(data["buys"])
        except ValueError:
            avg_price = Decimal("0")

        # Total invested in the current open position is quantity * avg_price
        total_invested_cost = qty * avg_price

        holdings.append({
            "asset_id": data["asset_id"],
            "ticker": data["ticker"],
            "name": data["name"],
            "asset_type": data["asset_type"],
            "sector": data["sector"],
            "accumulated_qty": qty.quantize(Decimal("0.00000001"), rounding=ROUND_HALF_UP),
            "avg_price": avg_price,
            "total_invested": total_invested_cost.quantize(
                Decimal("0.0001"), rounding=ROUND_HALF_UP
            ),
            "total_commission": data["total_commission"].quantize(
                Decimal("0.0001"), rounding=ROUND_HALF_UP
            ),
        })

    return holdings


def compute_dashboard(
    holdings: list[dict],
    market_prices: dict[str, Decimal],
    eur_usd_rate: Decimal,
) -> dict:
    """
    Compute the full portfolio dashboard from holdings and market prices.

    Args:
        holdings: List of holding dicts from compute_holdings().
        market_prices: Dict mapping ticker -> current price in EUR (Decimal).
        eur_usd_rate: Current EUR/USD exchange rate.

    Returns:
        dict with total_value_eur, total_value_usd, total_invested,
        total_pnl, total_pnl_pct, total_assets, holdings list,
        allocation_by_type, allocation_by_sector.
    """
    total_value_eur = Decimal("0")
    total_invested = Decimal("0")
    enriched_holdings = []

    for h in holdings:
        ticker = h["ticker"]
        current_price = market_prices.get(ticker, Decimal("0"))
        qty = h["accumulated_qty"]
        position_value = (qty * current_price).quantize(
            Decimal("0.0001"), rounding=ROUND_HALF_UP
        )
        pnl = unrealized_pnl(qty, h["avg_price"], current_price)

        total_value_eur += position_value
        total_invested += h["total_invested"]

        enriched_holdings.append({
            **h,
            "current_price": current_price,
            "position_value": position_value,
            "unrealized_pnl": pnl,
            "pnl_pct": (
                (pnl / h["total_invested"] * Decimal("100")).quantize(
                    Decimal("0.01"), rounding=ROUND_HALF_UP
                )
                if h["total_invested"] != Decimal("0")
                else Decimal("0")
            ),
        })

    # Calculate weights
    for h in enriched_holdings:
        if total_value_eur != Decimal("0"):
            h["weight"] = portfolio_weight(h["position_value"], total_value_eur)
        else:
            h["weight"] = Decimal("0")

    total_pnl = total_value_eur - total_invested
    total_pnl_pct = (
        (total_pnl / total_invested * Decimal("100")).quantize(
            Decimal("0.01"), rounding=ROUND_HALF_UP
        )
        if total_invested != Decimal("0")
        else Decimal("0")
    )

    total_value_usd = (total_value_eur * eur_usd_rate).quantize(
        Decimal("0.01"), rounding=ROUND_HALF_UP
    )

    allocation = compute_allocation(enriched_holdings)

    return {
        "total_value_eur": total_value_eur.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP),
        "total_value_usd": total_value_usd,
        "total_invested": total_invested.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP),
        "total_pnl": total_pnl.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP),
        "total_pnl_pct": total_pnl_pct,
        "total_assets": len(enriched_holdings),
        "holdings": enriched_holdings,
        "allocation_by_type": allocation["by_type"],
        "allocation_by_sector": allocation["by_sector"],
    }


def compute_allocation(holdings: list[dict]) -> dict:
    """
    Compute portfolio allocation by asset type and sector.

    Args:
        holdings: List of holding dicts (must contain position_value or total_invested,
                  asset_type, sector, and weight if pre-computed).

    Returns:
        dict with 'by_type' and 'by_sector' lists.
    """
    total_value = sum(
        h.get("position_value", h.get("total_invested", Decimal("0")))
        for h in holdings
    )

    by_type: dict[str, Decimal] = {}
    by_sector: dict[str, Decimal] = {}

    for h in holdings:
        value = h.get("position_value", h.get("total_invested", Decimal("0")))
        asset_type = h.get("asset_type", "unknown")
        sector = h.get("sector") or "Sin clasificar"

        by_type[asset_type] = by_type.get(asset_type, Decimal("0")) + value
        by_sector[sector] = by_sector.get(sector, Decimal("0")) + value

    def to_list(mapping: dict[str, Decimal]) -> list[dict]:
        result = []
        for name, val in sorted(mapping.items(), key=lambda x: x[1], reverse=True):
            pct = (
                (val / total_value * Decimal("100")).quantize(
                    Decimal("0.01"), rounding=ROUND_HALF_UP
                )
                if total_value != Decimal("0")
                else Decimal("0")
            )
            result.append({
                "name": name,
                "value": val.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP),
                "percentage": pct,
            })
        return result

    return {
        "by_type": to_list(by_type),
        "by_sector": to_list(by_sector),
    }
