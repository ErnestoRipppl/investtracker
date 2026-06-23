"""
Tests for app.services.quant_engine — QuantEngine methods.

Tests Sharpe, VaR parametric, max_drawdown, Kelly with known values.
Each test verifies that FormulaInfo is attached to the result.
"""

import pytest
import numpy as np

from app.services.quant_engine import QuantEngine
from app.utils.formula_registry import FormulaInfo, QuantResult


class TestSharpeRatio:
    """Tests for QuantEngine.sharpe_ratio()."""

    def test_known_sharpe(self):
        """Test Sharpe with known return series."""
        np.random.seed(42)
        returns = list(np.random.normal(0.001, 0.02, 252))
        result = QuantEngine.sharpe_ratio(returns, risk_free_rate=0.03)

        assert isinstance(result, QuantResult)
        assert isinstance(result.formula, FormulaInfo)
        assert result.formula.id == "sharpe_ratio"
        assert result.formula.name == "Ratio de Sharpe"
        assert isinstance(result.value, float)
        assert "Sharpe" in result.interpretation

    def test_sharpe_insufficient_data(self):
        """Sharpe with < 2 observations returns 0."""
        result = QuantEngine.sharpe_ratio([0.01])
        assert result.value == 0.0
        assert result.confidence_level == "low"
        assert result.formula.id == "sharpe_ratio"

    def test_sharpe_zero_volatility(self):
        """Constant returns -> zero std -> Sharpe = 0."""
        returns = [0.01] * 100
        result = QuantEngine.sharpe_ratio(returns)
        assert result.value == 0.0
        assert result.formula.id == "sharpe_ratio"

    def test_sharpe_negative(self):
        """Returns below risk-free rate -> negative Sharpe."""
        returns = list(np.random.normal(-0.005, 0.02, 252))
        result = QuantEngine.sharpe_ratio(returns, risk_free_rate=0.03)
        assert result.value < 0
        assert result.formula.id == "sharpe_ratio"


class TestVaRParametric:
    """Tests for QuantEngine.value_at_risk_parametric()."""

    def test_known_var(self):
        """Test VaR with known normal distribution."""
        np.random.seed(42)
        returns = list(np.random.normal(0.0, 0.02, 1000))
        result = QuantEngine.value_at_risk_parametric(returns, confidence=0.95)

        assert isinstance(result, QuantResult)
        assert result.formula.id == "var_parametric"
        assert result.value > 0  # VaR is reported as positive loss
        assert "confianza" in result.interpretation

    def test_var_insufficient_data(self):
        """VaR with < 2 observations."""
        result = QuantEngine.value_at_risk_parametric([0.01])
        assert result.value == 0.0
        assert result.confidence_level == "low"
        assert result.formula.id == "var_parametric"

    def test_var_99_confidence(self):
        """99% VaR should be larger than 95% VaR."""
        np.random.seed(42)
        returns = list(np.random.normal(0.0, 0.02, 1000))
        var_95 = QuantEngine.value_at_risk_parametric(returns, confidence=0.95)
        var_99 = QuantEngine.value_at_risk_parametric(returns, confidence=0.99)
        assert var_99.value > var_95.value


class TestMaxDrawdown:
    """Tests for QuantEngine.max_drawdown()."""

    def test_known_drawdown(self):
        """Price goes 100 -> 120 -> 80 -> 110. Max DD = (120-80)/120 = -33.33%"""
        prices = [100, 110, 120, 100, 80, 90, 110]
        result = QuantEngine.max_drawdown(prices)

        assert isinstance(result, QuantResult)
        assert result.formula.id == "max_drawdown"
        assert result.value < 0  # Drawdown is negative
        # Max peak = 120, trough after = 80, DD = (80-120)/120 = -0.3333
        assert abs(result.value - (-1/3)) < 0.01

    def test_no_drawdown(self):
        """Monotonically increasing prices -> DD = 0."""
        prices = [100, 110, 120, 130, 140]
        result = QuantEngine.max_drawdown(prices)
        assert result.value == 0.0
        assert result.formula.id == "max_drawdown"

    def test_insufficient_data(self):
        """Single price -> no drawdown computable."""
        result = QuantEngine.max_drawdown([100])
        assert result.value == 0.0
        assert result.confidence_level == "low"


class TestKellyCriterion:
    """Tests for QuantEngine.kelly_criterion()."""

    def test_favorable_bet(self):
        """60% win prob, 1:1 ratio. Kelly = 0.6 - 0.4/1 = 0.20"""
        result = QuantEngine.kelly_criterion(win_prob=0.6, win_loss_ratio=1.0)

        assert isinstance(result, QuantResult)
        assert result.formula.id == "kelly_criterion"
        assert abs(result.value - 0.20) < 0.001
        assert "Kelly" in result.interpretation

    def test_unfavorable_bet(self):
        """40% win, 1:1 ratio. Kelly = 0.4 - 0.6/1 = -0.20"""
        result = QuantEngine.kelly_criterion(win_prob=0.4, win_loss_ratio=1.0)
        assert result.value < 0
        assert "no es favorable" in result.interpretation.lower() or "no invertir" in result.recommendation.lower()
        assert result.formula.id == "kelly_criterion"

    def test_high_edge(self):
        """70% win, 2:1 ratio. Kelly = 0.7 - 0.3/2 = 0.55"""
        result = QuantEngine.kelly_criterion(win_prob=0.7, win_loss_ratio=2.0)
        assert abs(result.value - 0.55) < 0.001
        assert result.formula.id == "kelly_criterion"

    def test_zero_ratio(self):
        """Zero win/loss ratio."""
        result = QuantEngine.kelly_criterion(win_prob=0.6, win_loss_ratio=0.0)
        assert result.value == 0.0
        assert result.confidence_level == "low"


class TestSortinoRatio:
    """Tests for QuantEngine.sortino_ratio()."""

    def test_sortino_has_formula(self):
        """Verify FormulaInfo is attached."""
        np.random.seed(42)
        returns = list(np.random.normal(0.001, 0.02, 252))
        result = QuantEngine.sortino_ratio(returns)
        assert isinstance(result.formula, FormulaInfo)
        assert result.formula.id == "sortino_ratio"


class TestBeta:
    """Tests for QuantEngine.beta()."""

    def test_self_beta(self):
        """Beta of a series with itself should be 1.0."""
        np.random.seed(42)
        returns = list(np.random.normal(0.001, 0.02, 100))
        result = QuantEngine.beta(returns, returns)
        assert abs(result.value - 1.0) < 0.001
        assert result.formula.id == "beta"


class TestVolatility:
    """Tests for QuantEngine.volatility_annualized()."""

    def test_volatility_has_formula(self):
        """Verify FormulaInfo is attached."""
        np.random.seed(42)
        returns = list(np.random.normal(0.0, 0.01, 252))
        result = QuantEngine.volatility_annualized(returns)
        assert isinstance(result.formula, FormulaInfo)
        assert result.formula.id == "volatility"
        assert result.value > 0
