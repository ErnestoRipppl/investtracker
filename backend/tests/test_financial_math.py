"""
Tests for app.utils.financial_math — all 8 functions.

Each test validates against known manual calculations.
Tests include edge cases: zero quantities, division by zero, negative periods.
"""

import pytest
from decimal import Decimal

from app.utils.financial_math import (
    weighted_average_price,
    roi,
    cagr,
    unrealized_pnl,
    portfolio_weight,
    net_return_after_commissions,
    breakeven_price,
    total_invested_with_commission,
)


class TestWeightedAveragePrice:
    """Tests for weighted_average_price()."""

    def test_single_buy(self):
        """One buy: WAP = price."""
        result = weighted_average_price([(Decimal("10"), Decimal("100"))])
        assert result == Decimal("100.0000")

    def test_multiple_buys(self):
        """Two buys: 10@100 + 20@150 = (1000+3000)/30 = 133.3333"""
        buys = [
            (Decimal("10"), Decimal("100")),
            (Decimal("20"), Decimal("150")),
        ]
        result = weighted_average_price(buys)
        assert result == Decimal("133.3333")

    def test_empty_list_raises(self):
        with pytest.raises(ValueError, match="empty list"):
            weighted_average_price([])

    def test_zero_quantity_raises(self):
        with pytest.raises(ValueError, match="zero"):
            weighted_average_price([(Decimal("0"), Decimal("100"))])


class TestROI:
    """Tests for roi()."""

    def test_positive_roi(self):
        """10000 -> 11500 = 15% ROI"""
        result = roi(Decimal("11500"), Decimal("10000"))
        assert result == Decimal("0.150000")

    def test_negative_roi(self):
        """10000 -> 8000 = -20% ROI"""
        result = roi(Decimal("8000"), Decimal("10000"))
        assert result == Decimal("-0.200000")

    def test_zero_invested_raises(self):
        with pytest.raises(ValueError, match="zero"):
            roi(Decimal("1000"), Decimal("0"))

    def test_breakeven(self):
        """Same value = 0% ROI"""
        result = roi(Decimal("10000"), Decimal("10000"))
        assert result == Decimal("0.000000")


class TestCAGR:
    """Tests for cagr()."""

    def test_known_cagr(self):
        """10000 -> 16105 in 5 years ≈ 10% CAGR"""
        result = cagr(Decimal("10000"), Decimal("16105.10"), 5.0)
        assert abs(float(result) - 0.10) < 0.001

    def test_one_year(self):
        """10000 -> 11000 in 1 year = 10% CAGR"""
        result = cagr(Decimal("10000"), Decimal("11000"), 1.0)
        assert abs(float(result) - 0.10) < 0.001

    def test_zero_start_raises(self):
        with pytest.raises(ValueError, match="zero"):
            cagr(Decimal("0"), Decimal("10000"), 5.0)

    def test_negative_years_raises(self):
        with pytest.raises(ValueError, match="positive"):
            cagr(Decimal("10000"), Decimal("15000"), -1.0)

    def test_zero_years_raises(self):
        with pytest.raises(ValueError, match="positive"):
            cagr(Decimal("10000"), Decimal("15000"), 0.0)


class TestUnrealizedPnL:
    """Tests for unrealized_pnl()."""

    def test_profit(self):
        """10 shares, avg 100, current 120 = +200"""
        result = unrealized_pnl(Decimal("10"), Decimal("100"), Decimal("120"))
        assert result == Decimal("200.0000")

    def test_loss(self):
        """10 shares, avg 100, current 80 = -200"""
        result = unrealized_pnl(Decimal("10"), Decimal("100"), Decimal("80"))
        assert result == Decimal("-200.0000")

    def test_zero_quantity(self):
        """0 shares = 0 P&L"""
        result = unrealized_pnl(Decimal("0"), Decimal("100"), Decimal("120"))
        assert result == Decimal("0.0000")


class TestPortfolioWeight:
    """Tests for portfolio_weight()."""

    def test_quarter_weight(self):
        """2500 / 10000 = 0.25"""
        result = portfolio_weight(Decimal("2500"), Decimal("10000"))
        assert result == Decimal("0.250000")

    def test_full_weight(self):
        """10000 / 10000 = 1.0"""
        result = portfolio_weight(Decimal("10000"), Decimal("10000"))
        assert result == Decimal("1.000000")

    def test_zero_total_raises(self):
        with pytest.raises(ValueError, match="zero"):
            portfolio_weight(Decimal("1000"), Decimal("0"))


class TestNetReturnAfterCommissions:
    """Tests for net_return_after_commissions()."""

    def test_known_return(self):
        """gross=1500, commission=50, invested=10000 = 14.5%"""
        result = net_return_after_commissions(
            Decimal("1500"), Decimal("50"), Decimal("10000")
        )
        assert result == Decimal("0.145000")

    def test_zero_invested_raises(self):
        with pytest.raises(ValueError, match="zero"):
            net_return_after_commissions(
                Decimal("1000"), Decimal("50"), Decimal("0")
            )


class TestBreakevenPrice:
    """Tests for breakeven_price()."""

    def test_known_breakeven(self):
        """avg_cost=100, commission=0.1% => 100 * (1 + 0.002) = 100.20"""
        result = breakeven_price(Decimal("100"), Decimal("0.001"))
        assert result == Decimal("100.2000")

    def test_zero_commission(self):
        """No commission => breakeven = avg_cost"""
        result = breakeven_price(Decimal("50"), Decimal("0"))
        assert result == Decimal("50.0000")


class TestTotalInvestedWithCommission:
    """Tests for total_invested_with_commission()."""

    def test_known_total(self):
        """10 shares @ 100 + 5 commission = 1005"""
        result = total_invested_with_commission(
            Decimal("10"), Decimal("100"), Decimal("5")
        )
        assert result == Decimal("1005.0000")

    def test_zero_commission(self):
        """10 shares @ 50 + 0 = 500"""
        result = total_invested_with_commission(
            Decimal("10"), Decimal("50"), Decimal("0")
        )
        assert result == Decimal("500.0000")
