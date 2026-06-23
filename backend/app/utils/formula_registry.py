"""
Formula Registry — central catalog of all quantitative formulas.

Every formula used in the application is registered here with full metadata:
LaTeX notation, Spanish descriptions, interpretation guides, and limitations.
"""

from dataclasses import dataclass, field


@dataclass(frozen=True)
class FormulaInfo:
    """
    Metadata for a quantitative formula.

    Attributes:
        id: Unique formula identifier (e.g., 'sharpe_ratio').
        name: Human-readable formula name.
        category: Category grouping (e.g., 'risk_adjusted_return', 'risk').
        formula_latex: LaTeX representation of the formula.
        description: Spanish-language description of the formula.
        interpretation: Guide for interpreting results (Spanish).
        origin: Academic/historical origin of the formula.
        used_by: List of system components that use this formula.
        when_to_use: When this formula is most appropriate (Spanish).
        limitations: Known limitations or caveats (Spanish).
    """

    id: str
    name: str
    category: str
    formula_latex: str
    description: str
    interpretation: str
    origin: str
    used_by: list[str] = field(default_factory=list)
    when_to_use: str = ""
    limitations: str = ""


@dataclass
class QuantResult:
    """
    Result container for a quantitative calculation.

    Bundles the computed value with its formula metadata,
    interpretation, and data quality information.

    Attributes:
        value: The computed numeric result.
        formula: FormulaInfo metadata for the formula used.
        inputs_used: Dictionary of input parameters used.
        interpretation: Human-readable interpretation (Spanish).
        recommendation: Suggested action based on the result (Spanish).
        confidence_level: Confidence assessment ('high', 'medium', 'low').
        data_quality_note: Notes about data quality or limitations.
    """

    value: float
    formula: FormulaInfo
    inputs_used: dict
    interpretation: str = ""
    recommendation: str = ""
    confidence_level: str = "medium"
    data_quality_note: str = ""


# ===========================================================================
# FORMULA REGISTRY — All quantitative formulas used in InvestTracker
# ===========================================================================

FORMULA_REGISTRY: dict[str, FormulaInfo] = {
    # -------------------------------------------------------------------
    # Risk-Adjusted Return Metrics
    # -------------------------------------------------------------------
    "sharpe_ratio": FormulaInfo(
        id="sharpe_ratio",
        name="Ratio de Sharpe",
        category="risk_adjusted_return",
        formula_latex=r"S = \frac{R_p - R_f}{\sigma_p}",
        description=(
            "Mide el exceso de rendimiento por unidad de riesgo total. "
            "Compara el rendimiento de la cartera sobre la tasa libre de riesgo "
            "con la volatilidad (desviación estándar) de los rendimientos."
        ),
        interpretation=(
            "S > 1: Bueno — rendimiento adecuado por el riesgo asumido. "
            "S > 2: Muy bueno. S > 3: Excelente. "
            "S < 0: La cartera rinde menos que la tasa libre de riesgo."
        ),
        origin="William F. Sharpe, 1966. 'Mutual Fund Performance'.",
        used_by=["quant_engine", "analytics", "recommendations"],
        when_to_use=(
            "Para comparar carteras o fondos con diferentes niveles de riesgo. "
            "Ideal cuando los rendimientos siguen una distribución normal."
        ),
        limitations=(
            "Asume distribución normal de rendimientos. "
            "No distingue entre volatilidad al alza y a la baja. "
            "Sensible al período de cálculo elegido."
        ),
    ),
    "sortino_ratio": FormulaInfo(
        id="sortino_ratio",
        name="Ratio de Sortino",
        category="risk_adjusted_return",
        formula_latex=r"So = \frac{R_p - R_f}{\sigma_d}",
        description=(
            "Variante del Sharpe que solo penaliza la volatilidad negativa "
            "(downside deviation). Más apropiado cuando la distribución de "
            "rendimientos es asimétrica."
        ),
        interpretation=(
            "So > 1: Bueno. So > 2: Muy bueno. "
            "Valores más altos indican mejor compensación por riesgo de pérdida. "
            "Preferible al Sharpe cuando las caídas importan más que las subidas."
        ),
        origin="Frank A. Sortino y Robert van der Meer, 1991.",
        used_by=["quant_engine", "analytics", "recommendations"],
        when_to_use=(
            "Cuando el inversor se preocupa más por las pérdidas que por la "
            "volatilidad general. Útil para carteras con rendimientos asimétricos."
        ),
        limitations=(
            "Requiere definir un rendimiento mínimo aceptable (MAR). "
            "Menos útil si los rendimientos son simétricos."
        ),
    ),
    "treynor_ratio": FormulaInfo(
        id="treynor_ratio",
        name="Ratio de Treynor",
        category="risk_adjusted_return",
        formula_latex=r"T = \frac{R_p - R_f}{\beta_p}",
        description=(
            "Mide el exceso de rendimiento por unidad de riesgo sistemático (beta). "
            "A diferencia del Sharpe, solo considera el riesgo no diversificable."
        ),
        interpretation=(
            "Valores más altos son mejores. "
            "Útil para comparar carteras bien diversificadas donde el riesgo "
            "específico ha sido eliminado."
        ),
        origin="Jack L. Treynor, 1965.",
        used_by=["quant_engine", "analytics"],
        when_to_use=(
            "Para evaluar carteras diversificadas donde el riesgo sistemático "
            "es el factor dominante."
        ),
        limitations=(
            "Requiere un benchmark de mercado apropiado para calcular beta. "
            "No es útil para carteras concentradas con alto riesgo específico."
        ),
    ),
    "calmar_ratio": FormulaInfo(
        id="calmar_ratio",
        name="Ratio de Calmar",
        category="risk_adjusted_return",
        formula_latex=r"C = \frac{CAGR}{|MaxDrawdown|}",
        description=(
            "Relaciona el crecimiento anualizado con la máxima caída histórica. "
            "Mide cuánto rendimiento se obtiene por cada unidad de riesgo de drawdown."
        ),
        interpretation=(
            "C > 1: Bueno — el rendimiento compensa la peor caída. "
            "C > 3: Excelente. C < 0.5: El riesgo de drawdown puede ser excesivo."
        ),
        origin="Terry W. Young, 1991. Derivado del Fondo Calmar.",
        used_by=["quant_engine", "analytics"],
        when_to_use=(
            "Para evaluar estrategias donde las caídas máximas son la principal "
            "preocupación (gestores de fondos, trading)."
        ),
        limitations=(
            "Depende fuertemente del período analizado. "
            "El drawdown máximo es un evento único y puede no repetirse."
        ),
    ),
    "omega_ratio": FormulaInfo(
        id="omega_ratio",
        name="Ratio Omega",
        category="risk_adjusted_return",
        formula_latex=r"\Omega = \frac{\sum \max(R_i - \tau, 0)}{\sum \max(\tau - R_i, 0)}",
        description=(
            "Ratio entre las ganancias ponderadas por probabilidad sobre un umbral "
            "y las pérdidas ponderadas por probabilidad bajo ese umbral."
        ),
        interpretation=(
            "Ω > 1: Las ganancias superan las pérdidas respecto al umbral. "
            "Ω > 2: Muy favorable. Ω < 1: Las pérdidas dominan."
        ),
        origin="Keating y Shadwick, 2002. 'A Universal Performance Measure'.",
        used_by=["quant_engine"],
        when_to_use=(
            "Cuando se quiere una medida que capture toda la distribución de "
            "rendimientos, no solo media y varianza."
        ),
        limitations=(
            "Sensible a la elección del umbral τ. "
            "Puede ser computacionalmente costoso con muchos datos."
        ),
    ),
    "information_ratio": FormulaInfo(
        id="information_ratio",
        name="Ratio de Información",
        category="risk_adjusted_return",
        formula_latex=r"IR = \frac{R_p - R_b}{TE}",
        description=(
            "Mide el exceso de rendimiento sobre un benchmark por unidad de "
            "tracking error. Indica la habilidad del gestor para generar alfa."
        ),
        interpretation=(
            "IR > 0.5: Bueno. IR > 1.0: Excelente. "
            "Valores negativos indican rendimiento inferior al benchmark."
        ),
        origin="Goodwin, 1998. Uso extendido en gestión activa.",
        used_by=["quant_engine", "analytics"],
        when_to_use=(
            "Para evaluar gestión activa comparada con un índice de referencia."
        ),
        limitations=(
            "Depende del benchmark elegido. "
            "No es aplicable a estrategias sin benchmark claro."
        ),
    ),

    # -------------------------------------------------------------------
    # Risk Metrics
    # -------------------------------------------------------------------
    "var_parametric": FormulaInfo(
        id="var_parametric",
        name="VaR Paramétrico",
        category="risk",
        formula_latex=r"VaR_\alpha = \mu - z_\alpha \cdot \sigma",
        description=(
            "Valor en Riesgo paramétrico: estima la pérdida máxima esperada "
            "con un nivel de confianza dado, asumiendo distribución normal."
        ),
        interpretation=(
            "Un VaR del 5% de -2.3% significa que hay un 95% de probabilidad "
            "de que la pérdida diaria no supere el 2.3% del valor de la cartera."
        ),
        origin="J.P. Morgan, RiskMetrics, 1994.",
        used_by=["quant_engine", "analytics", "recommendations"],
        when_to_use=(
            "Para una estimación rápida del riesgo cuando los rendimientos "
            "son aproximadamente normales."
        ),
        limitations=(
            "Asume normalidad — subestima riesgo en colas pesadas. "
            "No indica la magnitud de pérdidas más allá del VaR."
        ),
    ),
    "var_historical": FormulaInfo(
        id="var_historical",
        name="VaR Histórico",
        category="risk",
        formula_latex=r"VaR_\alpha = \text{Percentil}_{1-\alpha}(R_1, R_2, ..., R_n)",
        description=(
            "Valor en Riesgo basado en la distribución empírica de rendimientos "
            "históricos. No asume ninguna distribución teórica."
        ),
        interpretation=(
            "Más conservador que el VaR paramétrico si hay colas pesadas. "
            "Refleja directamente la experiencia histórica."
        ),
        origin="Método no paramétrico, uso extendido desde los años 90.",
        used_by=["quant_engine", "analytics"],
        when_to_use=(
            "Cuando no se puede asumir normalidad en los rendimientos. "
            "Ideal con suficientes datos históricos (>250 observaciones)."
        ),
        limitations=(
            "Depende del período histórico elegido. "
            "No predice eventos sin precedente histórico (cisnes negros)."
        ),
    ),
    "cvar": FormulaInfo(
        id="cvar",
        name="CVaR (Expected Shortfall)",
        category="risk",
        formula_latex=r"CVaR_\alpha = E[R \mid R \leq VaR_\alpha]",
        description=(
            "Valor en Riesgo Condicional: promedio de las pérdidas que exceden "
            "el VaR. También conocido como Expected Shortfall (ES)."
        ),
        interpretation=(
            "Siempre peor (más negativo) que el VaR. "
            "Indica la pérdida promedio en los peores escenarios."
        ),
        origin="Artzner et al., 1999. 'Coherent Measures of Risk'.",
        used_by=["quant_engine", "analytics", "recommendations"],
        when_to_use=(
            "Cuando se necesita entender la severidad de las pérdidas extremas, "
            "no solo su frecuencia. Más informativo que el VaR solo."
        ),
        limitations=(
            "Requiere más datos para estimación precisa. "
            "Puede ser volátil con muestras pequeñas."
        ),
    ),
    "max_drawdown": FormulaInfo(
        id="max_drawdown",
        name="Máximo Drawdown",
        category="risk",
        formula_latex=r"MDD = \frac{\min(P_t) - \max(P_{s \leq t})}{\max(P_{s \leq t})}",
        description=(
            "La caída máxima desde un pico hasta un valle en la serie de precios. "
            "Mide el peor escenario histórico de pérdida."
        ),
        interpretation=(
            "MDD de -30% significa que la cartera perdió hasta un 30% "
            "desde su punto más alto. Cuanto menor (más negativo), peor."
        ),
        origin="Métrica estándar de gestión de riesgos.",
        used_by=["quant_engine", "analytics", "recommendations"],
        when_to_use=(
            "Para evaluar el riesgo de pérdida máxima y la resiliencia "
            "emocional necesaria para mantener la inversión."
        ),
        limitations=(
            "Es retrospectivo — el drawdown futuro podría ser peor. "
            "Depende del período y frecuencia de datos."
        ),
    ),
    "volatility": FormulaInfo(
        id="volatility",
        name="Volatilidad Anualizada",
        category="risk",
        formula_latex=r"\sigma_{anual} = \sigma_{diaria} \times \sqrt{252}",
        description=(
            "Desviación estándar anualizada de los rendimientos. "
            "Mide la dispersión total de los rendimientos (riesgo total)."
        ),
        interpretation=(
            "σ < 10%: Baja volatilidad. 10-20%: Moderada. "
            "20-30%: Alta. >30%: Muy alta."
        ),
        origin="Métrica fundamental de teoría moderna de carteras (Markowitz, 1952).",
        used_by=["quant_engine", "analytics", "recommendations"],
        when_to_use=(
            "Como medida general de riesgo. Base para otros cálculos "
            "como Sharpe, VaR paramétrico, etc."
        ),
        limitations=(
            "Trata igual la volatilidad al alza y a la baja. "
            "Asume estacionariedad de la varianza."
        ),
    ),
    "beta": FormulaInfo(
        id="beta",
        name="Beta",
        category="risk",
        formula_latex=r"\beta = \frac{Cov(R_p, R_m)}{Var(R_m)}",
        description=(
            "Sensibilidad de la cartera al mercado. "
            "Un beta de 1.2 indica que la cartera se mueve un 20% más que el mercado."
        ),
        interpretation=(
            "β = 1: Se mueve igual que el mercado. "
            "β > 1: Más volátil que el mercado. "
            "β < 1: Menos volátil. β < 0: Correlación inversa."
        ),
        origin="CAPM, William Sharpe, 1964.",
        used_by=["quant_engine", "analytics"],
        when_to_use=(
            "Para entender la exposición al riesgo de mercado y "
            "calcular el rendimiento esperado según CAPM."
        ),
        limitations=(
            "Depende del período y frecuencia de datos. "
            "Asume relación lineal con el mercado. Beta no es constante."
        ),
    ),
    "tracking_error": FormulaInfo(
        id="tracking_error",
        name="Tracking Error",
        category="risk",
        formula_latex=r"TE = \sigma(R_p - R_b)",
        description=(
            "Desviación estándar de la diferencia de rendimientos entre la "
            "cartera y su benchmark. Mide la desviación activa."
        ),
        interpretation=(
            "TE < 2%: Gestión pasiva/indexada. 2-5%: Gestión activa moderada. "
            ">5%: Gestión activa agresiva."
        ),
        origin="Métrica estándar de gestión activa de carteras.",
        used_by=["quant_engine"],
        when_to_use=(
            "Para evaluar cuánto se desvía la cartera de su benchmark. "
            "Componente del Ratio de Información."
        ),
        limitations=(
            "Depende del benchmark elegido. "
            "No indica si la desviación es favorable o desfavorable."
        ),
    ),

    # -------------------------------------------------------------------
    # Portfolio Optimization
    # -------------------------------------------------------------------
    "markowitz": FormulaInfo(
        id="markowitz",
        name="Optimización de Markowitz",
        category="portfolio_optimization",
        formula_latex=r"\min_w w^T \Sigma w \quad \text{s.t.} \quad w^T \mu = \mu_p, \; w^T \mathbf{1} = 1",
        description=(
            "Modelo de media-varianza que encuentra la cartera de mínima varianza "
            "para un rendimiento objetivo dado. Base de la frontera eficiente."
        ),
        interpretation=(
            "La frontera eficiente muestra las carteras óptimas para cada "
            "nivel de riesgo. Carteras debajo de la frontera son subóptimas."
        ),
        origin="Harry Markowitz, 1952. 'Portfolio Selection'.",
        used_by=["quant_engine", "recommendations"],
        when_to_use=(
            "Para optimizar la asignación de activos cuando se tienen "
            "estimaciones de rendimientos esperados y covarianzas."
        ),
        limitations=(
            "Muy sensible a las estimaciones de entrada. "
            "Puede generar pesos extremos sin restricciones. "
            "Asume que los inversores solo se preocupan por media y varianza."
        ),
    ),
    "black_litterman": FormulaInfo(
        id="black_litterman",
        name="Modelo Black-Litterman",
        category="portfolio_optimization",
        formula_latex=r"\mu_{BL} = [(\tau\Sigma)^{-1} + P^T \Omega^{-1} P]^{-1} [(\tau\Sigma)^{-1}\Pi + P^T \Omega^{-1} Q]",
        description=(
            "Combina el equilibrio de mercado con las visiones del inversor "
            "para generar rendimientos esperados más estables que Markowitz puro."
        ),
        interpretation=(
            "Produce asignaciones más intuitivas y diversificadas que "
            "Markowitz. Las visiones del inversor modifican el equilibrio."
        ),
        origin="Fischer Black y Robert Litterman, Goldman Sachs, 1992.",
        used_by=["quant_engine"],
        when_to_use=(
            "Cuando se quiere incorporar visiones propias sobre activos "
            "específicos sin perder la diversificación del equilibrio."
        ),
        limitations=(
            "Requiere definir el grado de confianza en las visiones. "
            "Complejidad computacional mayor que Markowitz."
        ),
    ),
    "risk_parity": FormulaInfo(
        id="risk_parity",
        name="Paridad de Riesgo",
        category="portfolio_optimization",
        formula_latex=r"RC_i = w_i \cdot (\Sigma w)_i = \frac{\sigma_p^2}{N}",
        description=(
            "Asigna pesos para que cada activo contribuya igual al riesgo "
            "total de la cartera. Maximiza la diversificación del riesgo."
        ),
        interpretation=(
            "Todos los activos contribuyen proporcionalmente al riesgo. "
            "Suele resultar en mayor peso para activos de baja volatilidad."
        ),
        origin="Qian, 2005. Popularizado por Bridgewater Associates (Ray Dalio).",
        used_by=["quant_engine", "recommendations"],
        when_to_use=(
            "Cuando no se tienen visiones fuertes sobre rendimientos futuros "
            "y se quiere la máxima diversificación de riesgo."
        ),
        limitations=(
            "No considera rendimientos esperados. "
            "Puede requerir apalancamiento para alcanzar rendimientos objetivo."
        ),
    ),

    # -------------------------------------------------------------------
    # Position Sizing
    # -------------------------------------------------------------------
    "kelly_criterion": FormulaInfo(
        id="kelly_criterion",
        name="Criterio de Kelly",
        category="position_sizing",
        formula_latex=r"f^* = \frac{p \cdot b - q}{b} = \frac{p(b+1) - 1}{b}",
        description=(
            "Determina la fracción óptima del capital a invertir en una "
            "oportunidad para maximizar el crecimiento a largo plazo."
        ),
        interpretation=(
            "f* indica qué porcentaje del capital invertir. "
            "f* > 0: Oportunidad favorable. f* ≤ 0: No invertir. "
            "En la práctica, se usa 'Half-Kelly' (f*/2) por prudencia."
        ),
        origin="John L. Kelly Jr., 1956. Bell System Technical Journal.",
        used_by=["quant_engine", "recommendations"],
        when_to_use=(
            "Para dimensionar posiciones cuando se conoce la probabilidad "
            "de ganancia y el ratio ganancia/pérdida."
        ),
        limitations=(
            "Asume que la probabilidad y el ratio son conocidos y constantes. "
            "Full Kelly puede ser muy agresivo — usar Half-Kelly."
        ),
    ),

    # -------------------------------------------------------------------
    # Simulation
    # -------------------------------------------------------------------
    "monte_carlo": FormulaInfo(
        id="monte_carlo",
        name="Simulación Monte Carlo",
        category="simulation",
        formula_latex=r"S_t = S_0 \cdot \exp\left[\left(\mu - \frac{\sigma^2}{2}\right)t + \sigma W_t\right]",
        description=(
            "Simula miles de trayectorias posibles del valor de la cartera "
            "usando movimiento browniano geométrico. Permite estimar "
            "probabilidades de distintos resultados."
        ),
        interpretation=(
            "Los percentiles P5/P25/P50/P75/P95 muestran el rango probable "
            "de resultados. El P50 es el escenario mediano. "
            "P5 es el peor caso razonable."
        ),
        origin="Stanislaw Ulam y John von Neumann, años 1940. Proyecto Manhattan.",
        used_by=["quant_engine", "analytics"],
        when_to_use=(
            "Para proyectar valores futuros de la cartera y estimar la "
            "probabilidad de alcanzar objetivos financieros."
        ),
        limitations=(
            "Depende de los supuestos de rendimiento y volatilidad. "
            "El modelo GBM no captura saltos ni cambios de régimen."
        ),
    ),
}


def get_formula(formula_id: str) -> FormulaInfo:
    """
    Retrieve a formula from the registry by its ID.

    Args:
        formula_id: The unique identifier of the formula.

    Returns:
        FormulaInfo: The formula metadata.

    Raises:
        KeyError: If the formula_id is not found in the registry.
    """
    if formula_id not in FORMULA_REGISTRY:
        raise KeyError(f"Formula '{formula_id}' not found in registry")
    return FORMULA_REGISTRY[formula_id]
