"""
Pure financial math functions.

All functions use Decimal for precision — no floating point.
These are stateless utility functions with no I/O or database access.
"""

from decimal import Decimal, ROUND_HALF_UP, InvalidOperation


def weighted_average_price(buys: list[tuple[Decimal, Decimal]]) -> Decimal:
    """
    Calculate the weighted average purchase price.

    Formula: WAP = Σ(quantity_i × price_i) / Σ(quantity_i)

    Args:
        buys: List of (quantity, price) tuples. Both must be Decimal.

    Returns:
        Weighted average price as Decimal.

    Raises:
        ValueError: If buys list is empty or total quantity is zero.
    """
    if not buys:
        raise ValueError("Cannot compute weighted average of empty list")

    total_cost = sum(qty * price for qty, price in buys)
    total_qty = sum(qty for qty, _ in buys)

    if total_qty == Decimal("0"):
        raise ValueError("Total quantity is zero — cannot compute average price")

    return (total_cost / total_qty).quantize(Decimal("0.0001"), rounding=ROUND_HALF_UP)


def roi(current_value: Decimal, total_invested: Decimal) -> Decimal:
    """
    Calculate Return on Investment (ROI).

    Formula: ROI = (current_value - total_invested) / total_invested

    Args:
        current_value: Current market value of the position.
        total_invested: Total amount invested.

    Returns:
        ROI as a decimal ratio (e.g., 0.15 for 15%).

    Raises:
        ValueError: If total_invested is zero.
    """
    if total_invested == Decimal("0"):
        raise ValueError("Total invested is zero — cannot compute ROI")

    return ((current_value - total_invested) / total_invested).quantize(
        Decimal("0.000001"), rounding=ROUND_HALF_UP
    )


def cagr(start_value: Decimal, end_value: Decimal, years: float) -> Decimal:
    """
    Calculate Compound Annual Growth Rate.

    Formula: CAGR = (end_value / start_value)^(1/years) - 1

    Args:
        start_value: Initial investment value.
        end_value: Final investment value.
        years: Number of years (can be fractional).

    Returns:
        CAGR as a decimal ratio.

    Raises:
        ValueError: If start_value is zero or years is zero/negative.
    """
    if start_value == Decimal("0"):
        raise ValueError("Start value is zero — cannot compute CAGR")
    if years <= 0:
        raise ValueError("Years must be positive — cannot compute CAGR")

    ratio = float(end_value / start_value)
    exponent = 1.0 / years
    result = ratio ** exponent - 1.0
    return Decimal(str(round(result, 8)))


def unrealized_pnl(
    quantity: Decimal, avg_price: Decimal, current_price: Decimal
) -> Decimal:
    """
    Calculate unrealized profit/loss for a position.

    Formula: P&L = quantity × (current_price - avg_price)

    Args:
        quantity: Number of shares/units held.
        avg_price: Weighted average purchase price.
        current_price: Current market price.

    Returns:
        Unrealized P&L in EUR.
    """
    return (quantity * (current_price - avg_price)).quantize(
        Decimal("0.0001"), rounding=ROUND_HALF_UP
    )


def portfolio_weight(position_value: Decimal, total_value: Decimal) -> Decimal:
    """
    Calculate the weight of a position in the total portfolio.

    Formula: weight = position_value / total_value

    Args:
        position_value: Market value of the position.
        total_value: Total portfolio market value.

    Returns:
        Weight as a decimal ratio (e.g., 0.25 for 25%).

    Raises:
        ValueError: If total_value is zero.
    """
    if total_value == Decimal("0"):
        raise ValueError("Total portfolio value is zero — cannot compute weight")

    return (position_value / total_value).quantize(
        Decimal("0.000001"), rounding=ROUND_HALF_UP
    )


def net_return_after_commissions(
    gross_return: Decimal, commissions: Decimal, invested: Decimal
) -> Decimal:
    """
    Calculate net return after subtracting commissions.

    Formula: net_return = (gross_return - commissions) / invested

    Args:
        gross_return: Gross profit/loss amount.
        commissions: Total commissions paid.
        invested: Total amount invested.

    Returns:
        Net return as a decimal ratio.

    Raises:
        ValueError: If invested is zero.
    """
    if invested == Decimal("0"):
        raise ValueError("Invested amount is zero — cannot compute net return")

    return ((gross_return - commissions) / invested).quantize(
        Decimal("0.000001"), rounding=ROUND_HALF_UP
    )


def breakeven_price(avg_cost: Decimal, commission_pct: Decimal) -> Decimal:
    """
    Calculate the breakeven price accounting for buy+sell commissions.

    Formula: breakeven = avg_cost × (1 + 2 × commission_pct)
    The factor of 2 accounts for commission on both buy and sell sides.

    Args:
        avg_cost: Average cost basis per share.
        commission_pct: Commission rate as decimal (e.g., 0.001 for 0.1%).

    Returns:
        Breakeven price per share.
    """
    return (avg_cost * (Decimal("1") + Decimal("2") * commission_pct)).quantize(
        Decimal("0.0001"), rounding=ROUND_HALF_UP
    )


def total_invested_with_commission(
    quantity: Decimal, price: Decimal, commission: Decimal
) -> Decimal:
    """
    Calculate total invested amount including commission.

    Formula: total = (quantity × price) + commission

    Args:
        quantity: Number of shares/units.
        price: Price per share/unit.
        commission: Commission amount.

    Returns:
        Total invested amount.
    """
    return (quantity * price + commission).quantize(
        Decimal("0.0001"), rounding=ROUND_HALF_UP
    )
