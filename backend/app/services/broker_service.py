"""
Broker service for commission calculations and cost analysis.

All monetary calculations use Decimal for precision.
"""

from decimal import Decimal, ROUND_HALF_UP

from app.models.broker import Broker


def calculate_commission(
    broker_model: Broker, quantity: Decimal, price: Decimal
) -> Decimal:
    """
    Calculate the commission for a trade given a broker's fee structure.

    Handles three commission types:
    - fixed: flat fee per trade
    - percentage: percentage of trade value with optional min/max
    - tiered: same as percentage (simplified)

    Formula:
        fixed: commission = commission_fixed_eur
        percentage: commission = max(min_commission, min(trade_value * pct, max_commission))

    Args:
        broker_model: The Broker ORM model with fee structure.
        quantity: Number of shares/units traded.
        price: Price per share/unit in EUR.

    Returns:
        Commission amount as Decimal.
    """
    trade_value = quantity * price

    if broker_model.commission_type == "fixed":
        return broker_model.commission_fixed_eur

    # Percentage or tiered
    commission = trade_value * broker_model.commission_pct

    # Apply minimum
    if broker_model.min_commission_eur and commission < broker_model.min_commission_eur:
        commission = broker_model.min_commission_eur

    # Apply maximum cap
    if broker_model.max_commission_eur and commission > broker_model.max_commission_eur:
        commission = broker_model.max_commission_eur

    return commission.quantize(Decimal("0.0001"), rounding=ROUND_HALF_UP)


def calculate_annual_costs(
    broker_model: Broker, portfolio_value: Decimal
) -> dict:
    """
    Calculate estimated annual costs for a given portfolio value.

    Args:
        broker_model: The Broker ORM model with fee structure.
        portfolio_value: Total portfolio market value in EUR.

    Returns:
        dict with custody_cost, estimated_fx_cost, total_annual_cost.
    """
    custody_cost = (portfolio_value * broker_model.custody_fee_annual_pct).quantize(
        Decimal("0.01"), rounding=ROUND_HALF_UP
    )
    # Estimate FX cost assuming 20% of portfolio needs currency conversion
    estimated_fx_cost = (
        portfolio_value * Decimal("0.20") * broker_model.fx_spread_pct
    ).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)

    total_annual_cost = custody_cost + estimated_fx_cost

    return {
        "custody_cost": custody_cost,
        "estimated_fx_cost": estimated_fx_cost,
        "total_annual_cost": total_annual_cost,
    }


def breakeven_analysis(
    avg_cost: Decimal, commission: Decimal, quantity: Decimal
) -> dict:
    """
    Calculate breakeven price and commission impact on a position.

    Args:
        avg_cost: Average cost per share.
        commission: Total commission paid (buy + sell).
        quantity: Number of shares held.

    Returns:
        dict with breakeven_price, commission_impact_pct.
    """
    if quantity == Decimal("0"):
        return {
            "breakeven_price": Decimal("0"),
            "commission_impact_pct": Decimal("0"),
        }

    commission_per_share = (commission / quantity).quantize(
        Decimal("0.0001"), rounding=ROUND_HALF_UP
    )
    breakeven_price = avg_cost + commission_per_share

    total_position_value = avg_cost * quantity
    if total_position_value == Decimal("0"):
        impact_pct = Decimal("0")
    else:
        impact_pct = (
            (commission / total_position_value) * Decimal("100")
        ).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)

    return {
        "breakeven_price": breakeven_price.quantize(
            Decimal("0.0001"), rounding=ROUND_HALF_UP
        ),
        "commission_impact_pct": impact_pct,
    }
