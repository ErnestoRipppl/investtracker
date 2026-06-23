"""
Recommendation engine.

Analyzes portfolio holdings, investor profile, quantitative metrics,
and broker costs to generate actionable recommendations in Spanish.
"""

from dataclasses import dataclass, field
from decimal import Decimal
from typing import Optional
import uuid

from app.models.broker import Broker
from app.services import broker_service


@dataclass
class Recommendation:
    """
    A single portfolio recommendation with full context.

    Attributes:
        id: Unique identifier for the recommendation.
        priority: Priority level (1=highest, 5=lowest).
        category: Category of recommendation.
        title: Short title (Spanish).
        summary: Brief summary (Spanish).
        detailed_analysis: Full analysis text (Spanish).
        formulas_used: List of formula IDs used in analysis.
        calculations_shown: Dict of calculation details.
        action_suggested: Suggested action (Spanish).
        impact_estimate: Estimated impact description.
        confidence: Confidence level ('high', 'medium', 'low').
        profile_alignment: How it aligns with investor profile.
    """

    id: str = ""
    priority: int = 3
    category: str = ""
    title: str = ""
    summary: str = ""
    detailed_analysis: str = ""
    formulas_used: list[str] = field(default_factory=list)
    calculations_shown: dict = field(default_factory=dict)
    action_suggested: str = ""
    impact_estimate: str = ""
    confidence: str = "medium"
    profile_alignment: str = ""

    def __post_init__(self):
        if not self.id:
            self.id = str(uuid.uuid4())[:8]


def generate_recommendations(
    holdings: list[dict],
    profile_dict: Optional[dict],
    quant_metrics_dict: Optional[dict],
    broker_model: Optional[Broker],
) -> list[Recommendation]:
    """
    Generate portfolio recommendations based on current state.

    Checks for:
    - Single position concentration >20%
    - Sector concentration >35%
    - Volatility vs profile tolerance
    - Drawdown vs max acceptable
    - Cost efficiency
    - Position sizing via Kelly criterion

    Args:
        holdings: List of holding dicts with position_value, weight, etc.
        profile_dict: Investor profile dict from profile_service.
        quant_metrics_dict: Dict of metric_name -> QuantResult.value.
        broker_model: Optional Broker model for cost analysis.

    Returns:
        List of Recommendation objects sorted by priority.
    """
    recommendations: list[Recommendation] = []

    if not holdings:
        recommendations.append(Recommendation(
            priority=1,
            category="portfolio",
            title="Cartera vacía",
            summary="No tienes posiciones activas en tu cartera.",
            detailed_analysis="Para comenzar a invertir, añade transacciones de compra.",
            action_suggested="Añade tu primera transacción de compra.",
            confidence="high",
        ))
        return recommendations

    # --- Concentration Check: Single Position > 20% ---
    for h in holdings:
        weight = float(h.get("weight", 0))
        if weight > 0.20:
            pct = weight * 100
            recommendations.append(Recommendation(
                priority=1,
                category="concentracion",
                title=f"Alta concentración en {h['ticker']}",
                summary=f"{h['ticker']} representa el {pct:.1f}% de tu cartera, superando el límite recomendado del 20%.",
                detailed_analysis=(
                    f"La posición en {h['ticker']} ({h['name']}) tiene un peso del {pct:.1f}% "
                    f"en la cartera. Una concentración superior al 20% en un solo activo incrementa "
                    f"significativamente el riesgo específico. Si este activo sufre una caída importante, "
                    f"el impacto en tu cartera sería desproporcionado."
                ),
                formulas_used=["markowitz", "risk_parity"],
                calculations_shown={"weight": round(weight, 4), "threshold": 0.20},
                action_suggested=f"Considera reducir la posición en {h['ticker']} y diversificar en otros activos.",
                impact_estimate=f"Reducir a 20% liberaría capital para diversificar.",
                confidence="high",
                profile_alignment="Diversificación es clave en todos los perfiles de riesgo.",
            ))

    # --- Sector Concentration > 35% ---
    sector_weights: dict[str, float] = {}
    for h in holdings:
        sector = h.get("sector") or "Sin clasificar"
        sector_weights[sector] = sector_weights.get(sector, 0) + float(h.get("weight", 0))

    for sector, weight in sector_weights.items():
        if weight > 0.35 and sector != "Sin clasificar":
            pct = weight * 100
            recommendations.append(Recommendation(
                priority=2,
                category="concentracion_sectorial",
                title=f"Concentración sectorial en {sector}",
                summary=f"El sector {sector} representa el {pct:.1f}% de tu cartera.",
                detailed_analysis=(
                    f"La exposición al sector {sector} ({pct:.1f}%) supera el umbral recomendado del 35%. "
                    f"Una recesión sectorial podría impactar severamente tu cartera."
                ),
                formulas_used=["markowitz"],
                calculations_shown={"sector": sector, "weight": round(weight, 4), "threshold": 0.35},
                action_suggested=f"Diversifica hacia otros sectores para reducir riesgo sectorial.",
                confidence="high",
            ))

    # --- Volatility vs Profile ---
    if quant_metrics_dict and profile_dict:
        volatility = quant_metrics_dict.get("volatility", 0)
        profile_type = profile_dict.get("profile_type", "balanced")

        vol_thresholds = {
            "conservative": 0.10,
            "moderate": 0.15,
            "balanced": 0.20,
            "growth": 0.25,
            "aggressive": 0.35,
        }
        threshold = vol_thresholds.get(profile_type, 0.20)

        if volatility and float(volatility) > threshold:
            recommendations.append(Recommendation(
                priority=2,
                category="riesgo",
                title="Volatilidad superior a tu perfil",
                summary=f"La volatilidad de tu cartera ({float(volatility)*100:.1f}%) supera el límite de tu perfil ({threshold*100:.0f}%).",
                detailed_analysis=(
                    f"Tu perfil de inversor es '{profile_type}', que tolera una volatilidad máxima del "
                    f"{threshold*100:.0f}%. La volatilidad actual de tu cartera es del {float(volatility)*100:.1f}%."
                ),
                formulas_used=["volatility"],
                calculations_shown={"volatility": float(volatility), "threshold": threshold},
                action_suggested="Reduce exposición a activos volátiles o incrementa posiciones en renta fija.",
                confidence="medium",
                profile_alignment=f"Perfil '{profile_type}' — volatilidad máxima recomendada: {threshold*100:.0f}%.",
            ))

    # --- Drawdown vs Max Acceptable ---
    if quant_metrics_dict and profile_dict:
        max_dd = quant_metrics_dict.get("max_drawdown", 0)
        max_acceptable = profile_dict.get("max_acceptable_drawdown_pct", 20) / 100

        if max_dd and abs(float(max_dd)) > max_acceptable:
            recommendations.append(Recommendation(
                priority=1,
                category="riesgo",
                title="Drawdown máximo excede tu tolerancia",
                summary=f"Tu drawdown máximo ({abs(float(max_dd))*100:.1f}%) supera tu tolerancia ({max_acceptable*100:.0f}%).",
                detailed_analysis=(
                    f"La máxima caída histórica de tu cartera ({abs(float(max_dd))*100:.1f}%) excede "
                    f"el drawdown máximo aceptable según tu perfil ({max_acceptable*100:.0f}%). "
                    f"Esto podría causar estrés emocional y decisiones impulsivas."
                ),
                formulas_used=["max_drawdown"],
                calculations_shown={"max_drawdown": float(max_dd), "max_acceptable": max_acceptable},
                action_suggested="Rebalancea hacia activos más defensivos.",
                confidence="high",
                profile_alignment=f"Tu perfil no tolera caídas superiores al {max_acceptable*100:.0f}%.",
            ))

    # --- Cost Efficiency ---
    if broker_model and holdings:
        total_value = sum(
            h.get("position_value", h.get("total_invested", Decimal("0")))
            for h in holdings
        )
        if total_value > Decimal("0"):
            costs = broker_service.calculate_annual_costs(broker_model, total_value)
            annual_cost_pct = float(costs["total_annual_cost"] / total_value * 100)

            if annual_cost_pct > 1.0:
                recommendations.append(Recommendation(
                    priority=3,
                    category="costes",
                    title="Costes anuales elevados",
                    summary=f"Los costes anuales del broker representan un {annual_cost_pct:.2f}% de tu cartera.",
                    detailed_analysis=(
                        f"Los costes anuales estimados con {broker_model.name} son de "
                        f"{float(costs['total_annual_cost']):.2f}€, equivalentes al "
                        f"{annual_cost_pct:.2f}% del valor de la cartera. "
                        f"Costes superiores al 1% erosionan significativamente la rentabilidad a largo plazo."
                    ),
                    formulas_used=[],
                    calculations_shown={
                        "annual_cost": float(costs["total_annual_cost"]),
                        "portfolio_value": float(total_value),
                        "cost_pct": annual_cost_pct,
                    },
                    action_suggested="Evalúa brokers alternativos con menores comisiones.",
                    confidence="high",
                ))

    # --- Kelly Criterion Position Sizing ---
    if quant_metrics_dict:
        kelly = quant_metrics_dict.get("kelly_criterion")
        if kelly and float(kelly) > 0:
            half_kelly = float(kelly) / 2
            for h in holdings:
                weight = float(h.get("weight", 0))
                if weight > half_kelly * 1.5:  # 50% over half-kelly
                    recommendations.append(Recommendation(
                        priority=3,
                        category="position_sizing",
                        title=f"Posición sobredimensionada: {h['ticker']}",
                        summary=f"{h['ticker']} ({weight*100:.1f}%) excede el Half-Kelly recomendado ({half_kelly*100:.1f}%).",
                        detailed_analysis=(
                            f"Según el Criterio de Kelly, la asignación óptima por posición "
                            f"(Half-Kelly por prudencia) sería del {half_kelly*100:.1f}%. "
                            f"Tu posición en {h['ticker']} es del {weight*100:.1f}%."
                        ),
                        formulas_used=["kelly_criterion"],
                        calculations_shown={"weight": weight, "half_kelly": half_kelly},
                        action_suggested=f"Reduce {h['ticker']} al {half_kelly*100:.1f}% del capital.",
                        confidence="medium",
                    ))

    # --- Revolut Specific Recommendations ---
    if broker_model and "revolut" in broker_model.name.lower() and holdings:
        # 1. FX Spread Warning (if holding any USD assets)
        has_usd_assets = any(h.get("currency") == "USD" or "-usd" in h.get("ticker", "").lower() for h in holdings)
        if has_usd_assets:
            usd_tickers = [h.get("ticker") for h in holdings if h.get("currency") == "USD" or "-usd" in h.get("ticker", "").lower()]
            recommendations.append(Recommendation(
                priority=2,
                category="costes_revolut",
                title="Optimización de tipo de cambio (FX) en Revolut",
                summary="Tu cartera contiene activos en USD, lo que incurre en costes de divisa del 0.5% - 1.0% en Revolut.",
                detailed_analysis=(
                    f"Identificamos activos denominados en USD ({', '.join(usd_tickers[:3])}) en tu cartera. "
                    f"Revolut aplica una comisión de cambio de divisa (FX markup) del 0.5% en días laborables y del 1.0% "
                    f"en fines de semana en cuentas estándar. Esto encarece cada operación de compra o venta."
                ),
                action_suggested="Para evitar estos costes, prioriza la inversión en activos y ETFs denominados en EUR (por ejemplo, cotizados en bolsas europeas) o asegúrate de realizar tus operaciones estrictamente en días laborables.",
                impact_estimate="Ahorro directo de entre 0.5% y 1.0% en comisiones por transacción.",
                confidence="high",
                profile_alignment="Alineado con una gestión eficiente de los costes de transacción."
            ))

        # 2. Custody Fee warning
        recommendations.append(Recommendation(
            priority=3,
            category="costes_revolut",
            title="Comisión de custodia mensual de Revolut",
            summary="Revolut aplica una comisión de custodia anual del 0.12%, cobrada mensualmente.",
            detailed_analysis=(
                f"Revolut cobra una comisión de custodia anual de 0.12% sobre el valor total de tu cartera de acciones/ETFs. "
                f"Esta comisión se descuenta mensualmente (aprox. 0.01% del valor total al mes) directamente de tu cuenta de inversión."
            ),
            action_suggested="Mantén siempre un pequeño saldo de efectivo o saldo en tu cuenta flexible en tu cartera para evitar que Revolut liquide posiciones de forma automática por falta de fondos. Si tu patrimonio invertido supera los 15.000€, considera brokers sin custodia (como MyInvestor o Trade Republic) para evitar que este coste erosione tu rentabilidad.",
            impact_estimate="Protección contra liquidaciones forzosas de activos por falta de saldo.",
            confidence="high",
            profile_alignment="Alineado con el control de costes recurrentes a largo plazo."
        ))

        # 3. Flexible Accounts for Conservative/Moderate/Balanced profiles
        if profile_dict:
            profile_type = profile_dict.get("profile_type", "balanced")
            if profile_type in ("conservative", "moderate", "balanced"):
                recommendations.append(Recommendation(
                    priority=2,
                    category="perfil_revolut",
                    title="Uso de Cuentas Flexibles de Revolut para tu perfil",
                    summary=f"Tu perfil ({profile_type.capitalize()}) requiere activos de bajo riesgo. Considera las Cuentas Flexibles de Revolut.",
                    detailed_analysis=(
                        f"Tu perfil de inversión es '{profile_type}', por lo que se recomienda una asignación importante a "
                        f"activos de bajo riesgo (renta fija o liquidez). Las Cuentas Flexibles de Revolut invierten en "
                        f"Fondos Monetarios (MMF) y ofrecen un rendimiento diario muy competitivo en EUR sin riesgo de mercado."
                    ),
                    action_suggested="Utiliza las Cuentas Flexibles de Revolut para colocar el porcentaje recomendado para renta fija y liquidez de tu perfil, obteniendo rendimiento con alta disponibilidad.",
                    impact_estimate="Rendimiento estable y de bajo riesgo en línea con los objetivos de tu perfil.",
                    confidence="high",
                    profile_alignment=f"Ideal para cumplir la asignación de bajo riesgo exigida por tu perfil '{profile_type}'."
                ))

        # 4. Trade Frequency/Commissions warning
        recommendations.append(Recommendation(
            priority=3,
            category="costes_revolut",
            title="Agrupa tus operaciones en Revolut",
            summary="Evita comisiones por exceso de transacciones mensuales agrupando tus aportaciones.",
            detailed_analysis=(
                f"El plan gratuito (Estándar) de Revolut suele limitar a 1 operación gratuita al mes, cobrando a partir de "
                f"ahí un 0.25% (mínimo 1.00€) por trade. Realizar múltiples compras de poco importe en el mismo mes "
                f"incurre en comisiones muy elevadas en proporción al capital invertido."
            ),
            action_suggested="Planifica tus compras y realiza una única inversión mensual mayor en lugar de múltiples compras pequeñas semanales para maximizar tus transacciones gratuitas.",
            impact_estimate="Ahorro de comisiones fijas (de 1€ o más por operación extra).",
            confidence="high",
            profile_alignment="Optimización del coste de transacción según la frecuencia operativa."
        ))

    # Sort by priority (ascending = higher priority first)
    recommendations.sort(key=lambda r: r.priority)
    return recommendations
