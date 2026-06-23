"""
Quantitative analytics engine.

Provides static methods for computing risk-adjusted return metrics,
risk measures, position sizing, and Monte Carlo simulation.
All methods return QuantResult with FormulaInfo metadata and Spanish interpretations.
"""

import numpy as np
from scipy.stats import norm
from typing import Optional

from app.utils.formula_registry import FormulaInfo, QuantResult, FORMULA_REGISTRY


class QuantEngine:
    """
    Stateless engine for quantitative portfolio analytics.

    Every public method:
    1. Validates inputs
    2. Computes the metric using numpy/scipy
    3. Attaches FormulaInfo from FORMULA_REGISTRY
    4. Returns a QuantResult with a Spanish interpretation
    """

    @staticmethod
    def sharpe_ratio(
        returns: list[float], risk_free_rate: float = 0.03
    ) -> QuantResult:
        """
        Calculate the annualized Sharpe Ratio.

        Formula: S = (mean(R) - Rf) / std(R) * sqrt(252)

        Args:
            returns: List of periodic (daily) returns as floats.
            risk_free_rate: Annual risk-free rate (default 3%).

        Returns:
            QuantResult with annualized Sharpe Ratio.
        """
        arr = np.array(returns, dtype=np.float64)
        if len(arr) < 2:
            return QuantResult(
                value=0.0,
                formula=FORMULA_REGISTRY["sharpe_ratio"],
                inputs_used={"returns_count": len(arr), "risk_free_rate": risk_free_rate},
                interpretation="Datos insuficientes para calcular el Sharpe Ratio (mínimo 2 observaciones).",
                confidence_level="low",
            )

        daily_rf = risk_free_rate / 252.0
        excess = arr - daily_rf
        mean_excess = float(np.mean(excess))
        std_dev = float(np.std(arr, ddof=1))

        if std_dev < 1e-9:
            value = 0.0
        else:
            value = (mean_excess / std_dev) * np.sqrt(252)

        if value > 2:
            quality = "excelente"
        elif value > 1:
            quality = "bueno"
        elif value > 0:
            quality = "moderado"
        else:
            quality = "deficiente (inferior a la tasa libre de riesgo)"

        return QuantResult(
            value=round(float(value), 6),
            formula=FORMULA_REGISTRY["sharpe_ratio"],
            inputs_used={
                "returns_count": len(arr),
                "risk_free_rate": risk_free_rate,
                "mean_return": round(float(np.mean(arr)), 8),
                "std_dev": round(std_dev, 8),
            },
            interpretation=f"Tu Sharpe Ratio de {value:.2f} indica un rendimiento {quality} ajustado al riesgo.",
            recommendation=(
                "Considera reducir posiciones de alta volatilidad." if value < 1
                else "El rendimiento ajustado al riesgo es adecuado."
            ),
            confidence_level="high" if len(arr) >= 252 else "medium",
        )

    @staticmethod
    def sortino_ratio(
        returns: list[float], risk_free_rate: float = 0.03
    ) -> QuantResult:
        """
        Calculate the annualized Sortino Ratio.

        Formula: So = (mean(R) - Rf) / downside_std * sqrt(252)
        Downside std only uses returns below the risk-free rate.

        Args:
            returns: List of periodic (daily) returns.
            risk_free_rate: Annual risk-free rate (default 3%).

        Returns:
            QuantResult with annualized Sortino Ratio.
        """
        arr = np.array(returns, dtype=np.float64)
        if len(arr) < 2:
            return QuantResult(
                value=0.0,
                formula=FORMULA_REGISTRY["sortino_ratio"],
                inputs_used={"returns_count": len(arr), "risk_free_rate": risk_free_rate},
                interpretation="Datos insuficientes para calcular el Sortino Ratio.",
                confidence_level="low",
            )

        daily_rf = risk_free_rate / 252.0
        mean_excess = float(np.mean(arr)) - daily_rf
        negative_returns = arr[arr < daily_rf] - daily_rf
        if len(negative_returns) == 0:
            downside_std = 0.0
        else:
            downside_std = float(np.sqrt(np.mean(negative_returns ** 2)))

        if downside_std < 1e-9:
            value = 0.0
        else:
            value = (mean_excess / downside_std) * np.sqrt(252)

        if value > 2:
            quality = "excelente"
        elif value > 1:
            quality = "bueno"
        elif value > 0:
            quality = "aceptable"
        else:
            quality = "pobre — las pérdidas no están siendo compensadas"

        return QuantResult(
            value=round(float(value), 6),
            formula=FORMULA_REGISTRY["sortino_ratio"],
            inputs_used={
                "returns_count": len(arr),
                "risk_free_rate": risk_free_rate,
                "negative_returns_count": len(negative_returns),
                "downside_std": round(downside_std, 8),
            },
            interpretation=f"Tu Sortino Ratio de {value:.2f} indica un rendimiento {quality} ajustado al riesgo a la baja.",
            confidence_level="high" if len(arr) >= 252 else "medium",
        )

    @staticmethod
    def treynor_ratio(
        portfolio_return: float, risk_free_rate: float, beta: float
    ) -> QuantResult:
        """
        Calculate the Treynor Ratio.

        Formula: T = (Rp - Rf) / beta

        Args:
            portfolio_return: Portfolio return (annualized).
            risk_free_rate: Risk-free rate (annualized).
            beta: Portfolio beta relative to market.

        Returns:
            QuantResult with Treynor Ratio.
        """
        if beta == 0:
            value = 0.0
            interp = "No se puede calcular el Treynor Ratio con beta = 0."
        else:
            value = (portfolio_return - risk_free_rate) / beta
            if value > 0:
                interp = f"El Treynor Ratio de {value:.4f} indica un exceso de rendimiento positivo por unidad de riesgo sistemático."
            else:
                interp = f"El Treynor Ratio de {value:.4f} indica que la cartera no compensa el riesgo de mercado asumido."

        return QuantResult(
            value=round(float(value), 6),
            formula=FORMULA_REGISTRY["treynor_ratio"],
            inputs_used={
                "portfolio_return": portfolio_return,
                "risk_free_rate": risk_free_rate,
                "beta": beta,
            },
            interpretation=interp,
            confidence_level="medium",
        )

    @staticmethod
    def calmar_ratio(cagr_value: float, max_dd: float) -> QuantResult:
        """
        Calculate the Calmar Ratio.

        Formula: C = CAGR / |MaxDrawdown|

        Args:
            cagr_value: Compound Annual Growth Rate.
            max_dd: Maximum drawdown as a negative decimal (e.g., -0.30).

        Returns:
            QuantResult with Calmar Ratio.
        """
        abs_dd = abs(max_dd)
        if abs_dd == 0:
            value = 0.0
            interp = "No se puede calcular el Calmar Ratio sin drawdown."
        else:
            value = cagr_value / abs_dd
            if value > 3:
                quality = "excelente"
            elif value > 1:
                quality = "bueno"
            else:
                quality = "bajo — el drawdown puede ser excesivo respecto al rendimiento"

            interp = f"El Calmar Ratio de {value:.2f} es {quality}."

        return QuantResult(
            value=round(float(value), 6),
            formula=FORMULA_REGISTRY["calmar_ratio"],
            inputs_used={"cagr": cagr_value, "max_drawdown": max_dd},
            interpretation=interp,
            confidence_level="medium",
        )

    @staticmethod
    def value_at_risk_parametric(
        returns: list[float], confidence: float = 0.95
    ) -> QuantResult:
        """
        Calculate parametric Value at Risk assuming normal distribution.

        Formula: VaR = -(mean - z_score * std)

        Args:
            returns: List of periodic returns.
            confidence: Confidence level (default 95%).

        Returns:
            QuantResult with parametric VaR as a positive loss number.
        """
        arr = np.array(returns, dtype=np.float64)
        if len(arr) < 2:
            return QuantResult(
                value=0.0,
                formula=FORMULA_REGISTRY["var_parametric"],
                inputs_used={"returns_count": len(arr), "confidence": confidence},
                interpretation="Datos insuficientes para calcular el VaR paramétrico.",
                confidence_level="low",
            )

        mean_ret = float(np.mean(arr))
        std_ret = float(np.std(arr, ddof=1))
        z_score = float(norm.ppf(1 - confidence))
        value = -(mean_ret + z_score * std_ret)

        return QuantResult(
            value=round(float(value), 6),
            formula=FORMULA_REGISTRY["var_parametric"],
            inputs_used={
                "returns_count": len(arr),
                "confidence": confidence,
                "mean_return": round(mean_ret, 8),
                "std_dev": round(std_ret, 8),
                "z_score": round(z_score, 4),
            },
            interpretation=(
                f"Con un {confidence*100:.0f}% de confianza, la pérdida diaria máxima "
                f"esperada es del {value*100:.2f}% del valor de la cartera."
            ),
            confidence_level="high" if len(arr) >= 252 else "medium",
        )

    @staticmethod
    def value_at_risk_historical(
        returns: list[float], confidence: float = 0.95
    ) -> QuantResult:
        """
        Calculate historical Value at Risk from empirical distribution.

        Formula: VaR = -percentile(returns, (1-confidence)*100)

        Args:
            returns: List of periodic returns.
            confidence: Confidence level (default 95%).

        Returns:
            QuantResult with historical VaR.
        """
        arr = np.array(returns, dtype=np.float64)
        if len(arr) < 2:
            return QuantResult(
                value=0.0,
                formula=FORMULA_REGISTRY["var_historical"],
                inputs_used={"returns_count": len(arr), "confidence": confidence},
                interpretation="Datos insuficientes para calcular el VaR histórico.",
                confidence_level="low",
            )

        percentile_level = (1 - confidence) * 100
        var_value = -float(np.percentile(arr, percentile_level))

        return QuantResult(
            value=round(float(var_value), 6),
            formula=FORMULA_REGISTRY["var_historical"],
            inputs_used={
                "returns_count": len(arr),
                "confidence": confidence,
                "percentile_level": percentile_level,
            },
            interpretation=(
                f"Basado en datos históricos, la pérdida diaria máxima esperada "
                f"con {confidence*100:.0f}% de confianza es del {var_value*100:.2f}%."
            ),
            confidence_level="high" if len(arr) >= 252 else "medium",
        )

    @staticmethod
    def conditional_var(
        returns: list[float], confidence: float = 0.95
    ) -> QuantResult:
        """
        Calculate Conditional Value at Risk (Expected Shortfall).

        Formula: CVaR = -mean(returns where returns < -VaR)

        Args:
            returns: List of periodic returns.
            confidence: Confidence level (default 95%).

        Returns:
            QuantResult with CVaR.
        """
        arr = np.array(returns, dtype=np.float64)
        if len(arr) < 2:
            return QuantResult(
                value=0.0,
                formula=FORMULA_REGISTRY["cvar"],
                inputs_used={"returns_count": len(arr), "confidence": confidence},
                interpretation="Datos insuficientes para calcular el CVaR.",
                confidence_level="low",
            )

        percentile_level = (1 - confidence) * 100
        var_threshold = float(np.percentile(arr, percentile_level))
        tail_losses = arr[arr <= var_threshold]

        if len(tail_losses) == 0:
            cvar_value = 0.0
        else:
            cvar_value = -float(np.mean(tail_losses))

        return QuantResult(
            value=round(float(cvar_value), 6),
            formula=FORMULA_REGISTRY["cvar"],
            inputs_used={
                "returns_count": len(arr),
                "confidence": confidence,
                "var_threshold": round(var_threshold, 8),
                "tail_observations": len(tail_losses),
            },
            interpretation=(
                f"En los peores escenarios (más allá del VaR), la pérdida promedio "
                f"esperada es del {cvar_value*100:.2f}% del valor de la cartera."
            ),
            confidence_level="high" if len(arr) >= 252 else "medium",
        )

    @staticmethod
    def max_drawdown(prices: list[float]) -> QuantResult:
        """
        Calculate Maximum Drawdown from a price series.

        Formula: DD = (peak - trough) / peak for rolling maximum.

        Args:
            prices: List of sequential prices/portfolio values.

        Returns:
            QuantResult with max drawdown as a negative decimal.
        """
        if len(prices) < 2:
            return QuantResult(
                value=0.0,
                formula=FORMULA_REGISTRY["max_drawdown"],
                inputs_used={"prices_count": len(prices)},
                interpretation="Datos insuficientes para calcular el drawdown máximo.",
                confidence_level="low",
            )

        arr = np.array(prices, dtype=np.float64)
        peak = np.maximum.accumulate(arr)
        drawdowns = (arr - peak) / peak
        mdd = float(np.min(drawdowns))

        return QuantResult(
            value=round(mdd, 6),
            formula=FORMULA_REGISTRY["max_drawdown"],
            inputs_used={"prices_count": len(arr)},
            interpretation=(
                f"La caída máxima desde pico fue del {mdd*100:.2f}%. "
                f"{'Esto es severo — evalúa tu tolerancia al riesgo.' if mdd < -0.20 else 'Dentro de rangos normales.'}"
            ),
            confidence_level="high",
        )

    @staticmethod
    def volatility_annualized(
        returns: list[float], trading_days: int = 252
    ) -> QuantResult:
        """
        Calculate annualized volatility from log returns.

        Formula: vol = std(returns) * sqrt(trading_days)

        Args:
            returns: List of periodic (daily) log returns.
            trading_days: Number of trading days per year (default 252).

        Returns:
            QuantResult with annualized volatility.
        """
        arr = np.array(returns, dtype=np.float64)
        if len(arr) < 2:
            return QuantResult(
                value=0.0,
                formula=FORMULA_REGISTRY["volatility"],
                inputs_used={"returns_count": len(arr), "trading_days": trading_days},
                interpretation="Datos insuficientes para calcular la volatilidad.",
                confidence_level="low",
            )

        daily_std = float(np.std(arr, ddof=1))
        vol = daily_std * np.sqrt(trading_days)

        if vol < 0.10:
            level = "baja"
        elif vol < 0.20:
            level = "moderada"
        elif vol < 0.30:
            level = "alta"
        else:
            level = "muy alta"

        return QuantResult(
            value=round(float(vol), 6),
            formula=FORMULA_REGISTRY["volatility"],
            inputs_used={
                "returns_count": len(arr),
                "trading_days": trading_days,
                "daily_std": round(daily_std, 8),
            },
            interpretation=(
                f"La volatilidad anualizada de {vol*100:.2f}% es {level}."
            ),
            confidence_level="high" if len(arr) >= 252 else "medium",
        )

    @staticmethod
    def beta(
        portfolio_returns: list[float], market_returns: list[float]
    ) -> QuantResult:
        """
        Calculate portfolio Beta relative to market.

        Formula: beta = cov(Rp, Rm) / var(Rm)

        Args:
            portfolio_returns: List of portfolio returns.
            market_returns: List of market benchmark returns.

        Returns:
            QuantResult with portfolio beta.
        """
        if len(portfolio_returns) != len(market_returns) or len(portfolio_returns) < 2:
            return QuantResult(
                value=1.0,
                formula=FORMULA_REGISTRY["beta"],
                inputs_used={
                    "portfolio_count": len(portfolio_returns),
                    "market_count": len(market_returns),
                },
                interpretation="Datos insuficientes o desalineados para calcular beta. Se asume beta = 1.",
                confidence_level="low",
            )

        port = np.array(portfolio_returns, dtype=np.float64)
        mkt = np.array(market_returns, dtype=np.float64)

        cov_matrix = np.cov(port, mkt, ddof=1)
        covariance = float(cov_matrix[0, 1])
        market_var = float(cov_matrix[1, 1])

        if market_var == 0:
            beta_value = 1.0
            interp = "La varianza del mercado es cero — no se puede calcular beta. Se asume beta = 1."
        else:
            beta_value = covariance / market_var
            if beta_value > 1:
                interp = f"Beta de {beta_value:.2f}: tu cartera es más volátil que el mercado."
            elif beta_value < 1:
                interp = f"Beta de {beta_value:.2f}: tu cartera es menos volátil que el mercado."
            else:
                interp = f"Beta de {beta_value:.2f}: tu cartera se mueve igual que el mercado."

        return QuantResult(
            value=round(float(beta_value), 6),
            formula=FORMULA_REGISTRY["beta"],
            inputs_used={
                "portfolio_count": len(port),
                "market_count": len(mkt),
                "covariance": round(covariance, 8),
                "market_variance": round(market_var, 8),
            },
            interpretation=interp,
            confidence_level="high" if len(port) >= 252 else "medium",
        )

    @staticmethod
    def kelly_criterion(win_prob: float, win_loss_ratio: float) -> QuantResult:
        """
        Calculate Kelly Criterion optimal fraction.

        Formula: f* = p - q/b where p=win_prob, q=1-p, b=win_loss_ratio

        Args:
            win_prob: Probability of winning (0-1).
            win_loss_ratio: Ratio of average win to average loss.

        Returns:
            QuantResult with optimal Kelly fraction.
        """
        if win_loss_ratio <= 0:
            return QuantResult(
                value=0.0,
                formula=FORMULA_REGISTRY["kelly_criterion"],
                inputs_used={"win_prob": win_prob, "win_loss_ratio": win_loss_ratio},
                interpretation="El ratio ganancia/pérdida debe ser positivo.",
                confidence_level="low",
            )

        p = win_prob
        q = 1.0 - p
        b = win_loss_ratio
        kelly = p - (q / b)
        half_kelly = kelly / 2.0

        if kelly <= 0:
            interp = (
                f"El Kelly Criterion de {kelly:.4f} indica que esta oportunidad "
                f"no es favorable. No se recomienda invertir."
            )
            rec = "No invertir en esta oportunidad."
        else:
            interp = (
                f"El Kelly Criterion sugiere invertir el {kelly*100:.2f}% del capital. "
                f"Por prudencia, se recomienda Half-Kelly: {half_kelly*100:.2f}%."
            )
            rec = f"Asignar máximo el {half_kelly*100:.1f}% del capital (Half-Kelly)."

        return QuantResult(
            value=round(float(kelly), 6),
            formula=FORMULA_REGISTRY["kelly_criterion"],
            inputs_used={"win_prob": p, "loss_prob": q, "win_loss_ratio": b},
            interpretation=interp,
            recommendation=rec,
            confidence_level="medium",
        )

    @staticmethod
    def monte_carlo_simulation(
        current_value: float,
        expected_return: float,
        volatility: float,
        years: int,
        n_simulations: int = 10000,
        initial_value: Optional[float] = None,
        monthly_contribution: float = 0.0,
    ) -> dict:
        """
        Run Monte Carlo simulation using geometric Brownian motion.

        Formula: S_t = S_0 * exp((μ - σ²/2)*t + σ*W_t)

        Args:
            current_value: Current portfolio value.
            expected_return: Expected annual return (e.g., 0.08 for 8%).
            volatility: Annual volatility (e.g., 0.20 for 20%).
            years: Number of years to simulate.
            n_simulations: Number of simulation paths (default 10000).
            initial_value: Optional override for starting value.
            monthly_contribution: Value added to portfolio every month (21 days).

        Returns:
            dict with paths, percentiles, summary, years, n_simulations.
        """
        trading_days = 252
        total_days = trading_days * years
        dt = 1.0 / trading_days

        np.random.seed(None)
        drift = (expected_return - 0.5 * volatility ** 2) * dt
        diffusion = volatility * np.sqrt(dt)

        random_shocks = np.random.standard_normal((n_simulations, total_days))
        daily_returns = drift + diffusion * random_shocks

        init_val = initial_value if initial_value is not None else current_value

        if monthly_contribution > 0.0:
            exp_returns = np.exp(daily_returns)
            full_paths = np.zeros((n_simulations, total_days + 1))
            full_paths[:, 0] = init_val
            for t in range(1, total_days + 1):
                full_paths[:, t] = full_paths[:, t - 1] * exp_returns[:, t - 1]
                if t % 21 == 0:
                    full_paths[:, t] += monthly_contribution
        else:
            log_paths = np.cumsum(daily_returns, axis=1)
            paths = init_val * np.exp(log_paths)
            initial = np.full((n_simulations, 1), init_val)
            full_paths = np.hstack([initial, paths])

        # Downsample to ~500 points for visualization
        total_points = full_paths.shape[1]
        if total_points > 500:
            indices = np.linspace(0, total_points - 1, 500, dtype=int)
        else:
            indices = np.arange(total_points)

        downsampled = full_paths[:, indices]

        # Select a representative subset of paths for visualization (max 100)
        path_indices = np.linspace(0, n_simulations - 1, min(100, n_simulations), dtype=int)
        paths_output = downsampled[path_indices].tolist()

        # Percentiles at each sampled time step
        p5 = np.percentile(downsampled, 5, axis=0).tolist()
        p25 = np.percentile(downsampled, 25, axis=0).tolist()
        p50 = np.percentile(downsampled, 50, axis=0).tolist()
        p75 = np.percentile(downsampled, 75, axis=0).tolist()
        p95 = np.percentile(downsampled, 95, axis=0).tolist()

        final_values = full_paths[:, -1]

        summary = {
            "median_final": round(float(np.median(final_values)), 2),
            "mean_final": round(float(np.mean(final_values)), 2),
            "best_case": round(float(np.max(final_values)), 2),
            "worst_case": round(float(np.min(final_values)), 2),
            "prob_profit": round(float(np.mean(final_values > current_value)), 4),
        }

        return {
            "paths": paths_output,
            "percentiles": {
                "p5": [round(v, 2) for v in p5],
                "p25": [round(v, 2) for v in p25],
                "p50": [round(v, 2) for v in p50],
                "p75": [round(v, 2) for v in p75],
                "p95": [round(v, 2) for v in p95],
            },
            "summary": summary,
            "years": years,
            "n_simulations": n_simulations,
            "formula": FORMULA_REGISTRY["monte_carlo"].id,
        }
