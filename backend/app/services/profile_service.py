"""
Investor profile service.

Provides a questionnaire-based risk profiling system with Spanish-language
questions across 5 sections. Calculates risk profiles and recommended allocations.
"""

from decimal import Decimal


QUESTIONNAIRE: list[dict] = [
    # --- SECCIÓN 1: Situación Financiera ---
    {
        "id": "sf_01",
        "section": "situacion_financiera",
        "text": "¿Cuál es tu nivel de ingresos mensuales netos?",
        "type": "radio",
        "options": [
            {"value": "bajo", "label": "Menos de 1.500€", "score": 2},
            {"value": "medio_bajo", "label": "1.500€ - 3.000€", "score": 4},
            {"value": "medio", "label": "3.000€ - 5.000€", "score": 6},
            {"value": "alto", "label": "5.000€ - 10.000€", "score": 8},
            {"value": "muy_alto", "label": "Más de 10.000€", "score": 10},
        ],
    },
    {
        "id": "sf_02",
        "section": "situacion_financiera",
        "text": "¿Tienes un fondo de emergencia que cubra al menos 6 meses de gastos?",
        "type": "radio",
        "options": [
            {"value": "no", "label": "No tengo fondo de emergencia", "score": 1},
            {"value": "parcial", "label": "Cubre menos de 3 meses", "score": 3},
            {"value": "basico", "label": "Cubre 3-6 meses", "score": 6},
            {"value": "completo", "label": "Cubre más de 6 meses", "score": 8},
        ],
    },
    {
        "id": "sf_03",
        "section": "situacion_financiera",
        "text": "¿Tienes deudas significativas (hipoteca excluida)?",
        "type": "radio",
        "options": [
            {"value": "alta", "label": "Sí, deuda importante", "score": 1},
            {"value": "moderada", "label": "Deuda moderada y manejable", "score": 4},
            {"value": "baja", "label": "Poca deuda", "score": 7},
            {"value": "ninguna", "label": "Sin deudas", "score": 10},
        ],
    },
    # --- SECCIÓN 2: Horizonte Temporal ---
    {
        "id": "ht_01",
        "section": "horizonte_temporal",
        "text": "¿Cuándo esperas necesitar este dinero invertido?",
        "type": "radio",
        "options": [
            {"value": "corto", "label": "Menos de 2 años", "score": 2},
            {"value": "medio_corto", "label": "2-5 años", "score": 4},
            {"value": "medio", "label": "5-10 años", "score": 6},
            {"value": "largo", "label": "10-20 años", "score": 8},
            {"value": "muy_largo", "label": "Más de 20 años", "score": 10},
        ],
    },
    {
        "id": "ht_02",
        "section": "horizonte_temporal",
        "text": "¿Cuál es tu edad actual?",
        "type": "radio",
        "options": [
            {"value": "joven", "label": "18-30 años", "score": 10},
            {"value": "adulto_joven", "label": "31-40 años", "score": 8},
            {"value": "adulto", "label": "41-50 años", "score": 6},
            {"value": "maduro", "label": "51-60 años", "score": 4},
            {"value": "senior", "label": "Más de 60 años", "score": 2},
        ],
    },
    # --- SECCIÓN 3: Tolerancia al Riesgo ---
    {
        "id": "tr_01",
        "section": "tolerancia_riesgo",
        "text": "Si tu cartera perdiera un 20% en un mes, ¿qué harías?",
        "type": "radio",
        "options": [
            {"value": "vender_todo", "label": "Vendería todo inmediatamente", "score": 1},
            {"value": "vender_parte", "label": "Vendería parte para reducir riesgo", "score": 3},
            {"value": "mantener", "label": "Mantendría la posición y esperaría", "score": 6},
            {"value": "comprar_mas", "label": "Aprovecharía para comprar más", "score": 10},
        ],
    },
    {
        "id": "tr_02",
        "section": "tolerancia_riesgo",
        "text": "¿Qué caída máxima podrías tolerar en tu cartera sin perder el sueño?",
        "type": "radio",
        "options": [
            {"value": "5", "label": "Hasta un 5%", "score": 2},
            {"value": "10", "label": "Hasta un 10%", "score": 4},
            {"value": "20", "label": "Hasta un 20%", "score": 6},
            {"value": "30", "label": "Hasta un 30%", "score": 8},
            {"value": "mas_30", "label": "Más del 30% si el plazo es largo", "score": 10},
        ],
    },
    {
        "id": "tr_03",
        "section": "tolerancia_riesgo",
        "text": "¿Qué prefieres entre estas opciones de inversión a 5 años?",
        "type": "radio",
        "options": [
            {"value": "seguro", "label": "Ganar 3% seguro sin riesgo de pérdida", "score": 2},
            {"value": "moderado", "label": "50% de ganar 8%, 50% de perder 2%", "score": 5},
            {"value": "agresivo", "label": "30% de ganar 25%, 70% de ganar 5%", "score": 7},
            {"value": "muy_agresivo", "label": "50% de ganar 30%, 50% de perder 10%", "score": 10},
        ],
    },
    # --- SECCIÓN 4: Experiencia ---
    {
        "id": "ex_01",
        "section": "experiencia",
        "text": "¿Cuántos años llevas invirtiendo?",
        "type": "radio",
        "options": [
            {"value": "ninguno", "label": "Nunca he invertido", "score": 1},
            {"value": "principiante", "label": "Menos de 2 años", "score": 3},
            {"value": "intermedio", "label": "2-5 años", "score": 5},
            {"value": "avanzado", "label": "5-10 años", "score": 8},
            {"value": "experto", "label": "Más de 10 años", "score": 10},
        ],
    },
    {
        "id": "ex_02",
        "section": "experiencia",
        "text": "¿Qué productos de inversión conoces y has utilizado?",
        "type": "radio",
        "options": [
            {"value": "depositos", "label": "Solo depósitos bancarios", "score": 1},
            {"value": "fondos", "label": "Fondos de inversión / ETFs", "score": 4},
            {"value": "acciones", "label": "Acciones individuales", "score": 6},
            {"value": "derivados", "label": "Opciones, futuros, derivados", "score": 9},
        ],
    },
    {
        "id": "ex_03",
        "section": "experiencia",
        "text": "¿Sigues regularmente los mercados financieros?",
        "type": "radio",
        "options": [
            {"value": "nunca", "label": "No, no me interesa", "score": 1},
            {"value": "poco", "label": "Ocasionalmente", "score": 3},
            {"value": "regular", "label": "Semanalmente", "score": 6},
            {"value": "diario", "label": "A diario", "score": 8},
        ],
    },
    # --- SECCIÓN 5: Objetivos ---
    {
        "id": "ob_01",
        "section": "objetivos",
        "text": "¿Cuál es tu objetivo principal de inversión?",
        "type": "radio",
        "options": [
            {"value": "preservar", "label": "Preservar el capital y protegerme de la inflación", "score": 2},
            {"value": "ingresos", "label": "Generar ingresos regulares (dividendos, rentas)", "score": 4},
            {"value": "crecimiento", "label": "Crecimiento del capital a largo plazo", "score": 7},
            {"value": "agresivo", "label": "Máximo crecimiento asumiendo alto riesgo", "score": 10},
        ],
    },
    {
        "id": "ob_02",
        "section": "objetivos",
        "text": "¿Qué porcentaje de tus ahorros totales destinarás a inversión?",
        "type": "radio",
        "options": [
            {"value": "poco", "label": "Menos del 10%", "score": 2},
            {"value": "moderado", "label": "10-30%", "score": 4},
            {"value": "significativo", "label": "30-60%", "score": 7},
            {"value": "mayoritario", "label": "Más del 60%", "score": 9},
        ],
    },
    {
        "id": "ob_03",
        "section": "objetivos",
        "text": "¿Planeas hacer aportaciones periódicas?",
        "type": "radio",
        "options": [
            {"value": "no", "label": "No, inversión única", "score": 3},
            {"value": "ocasional", "label": "De vez en cuando", "score": 5},
            {"value": "mensual", "label": "Sí, mensualmente", "score": 7},
            {"value": "agresivo", "label": "Sí, mensualmente + extras cuando pueda", "score": 9},
        ],
    },
]

# Map question IDs for fast lookup
_QUESTION_MAP: dict[str, dict] = {q["id"]: q for q in QUESTIONNAIRE}

# Allocation templates by profile type
_ALLOCATIONS: dict[str, dict[str, int]] = {
    "conservative": {
        "renta_variable": 15,
        "renta_fija": 55,
        "alternativos": 5,
        "liquidez": 25,
    },
    "moderate": {
        "renta_variable": 35,
        "renta_fija": 40,
        "alternativos": 10,
        "liquidez": 15,
    },
    "balanced": {
        "renta_variable": 55,
        "renta_fija": 30,
        "alternativos": 10,
        "liquidez": 5,
    },
    "growth": {
        "renta_variable": 75,
        "renta_fija": 15,
        "alternativos": 8,
        "liquidez": 2,
    },
    "aggressive": {
        "renta_variable": 90,
        "renta_fija": 0,
        "alternativos": 8,
        "liquidez": 2,
    },
}

# Max acceptable drawdown by profile
_MAX_DRAWDOWN: dict[str, float] = {
    "conservative": 5.0,
    "moderate": 10.0,
    "balanced": 20.0,
    "growth": 30.0,
    "aggressive": 50.0,
}

# Time horizon mapping by profile
_TIME_HORIZON: dict[str, int] = {
    "conservative": 3,
    "moderate": 5,
    "balanced": 10,
    "growth": 15,
    "aggressive": 20,
}

# Objective mapping
_OBJECTIVES: dict[str, str] = {
    "conservative": "preservacion_capital",
    "moderate": "ingresos_estables",
    "balanced": "crecimiento_moderado",
    "growth": "crecimiento_capital",
    "aggressive": "maximo_crecimiento",
}


def calculate_profile(answers: dict[str, str]) -> dict:
    """
    Calculate investor profile from questionnaire answers.

    Scoring: sum scores from matched answers, map to profile type.
    Score ranges: 0-20=conservative, 21-40=moderate, 41-60=balanced,
    61-80=growth, 81-100=aggressive.

    Args:
        answers: Dict mapping question_id -> selected option value.

    Returns:
        dict with profile_type, risk_tolerance_score, time_horizon_years,
        recommended_allocation, max_acceptable_drawdown_pct,
        investment_objective.
    """
    total_score = 0
    answered = 0

    for question_id, answer_value in answers.items():
        question = _QUESTION_MAP.get(question_id)
        if question is None:
            continue

        for option in question["options"]:
            if option["value"] == answer_value:
                total_score += option["score"]
                answered += 1
                break

    # Normalize score to 0-100 range based on max possible score
    max_possible = sum(
        max(opt["score"] for opt in q["options"])
        for q in QUESTIONNAIRE
    )

    if max_possible > 0 and answered > 0:
        normalized_score = int(round((total_score / max_possible) * 100))
    else:
        normalized_score = 50  # default to balanced

    # Map normalized score to profile type
    if normalized_score <= 20:
        profile_type = "conservative"
    elif normalized_score <= 40:
        profile_type = "moderate"
    elif normalized_score <= 60:
        profile_type = "balanced"
    elif normalized_score <= 80:
        profile_type = "growth"
    else:
        profile_type = "aggressive"

    return {
        "profile_type": profile_type,
        "risk_tolerance_score": normalized_score,
        "time_horizon_years": _TIME_HORIZON[profile_type],
        "recommended_allocation": _ALLOCATIONS[profile_type],
        "max_acceptable_drawdown_pct": _MAX_DRAWDOWN[profile_type],
        "investment_objective": _OBJECTIVES[profile_type],
    }


def get_recommended_allocation(profile_type: str) -> dict[str, int]:
    """
    Get the recommended asset allocation for a given profile type.

    Args:
        profile_type: One of 'conservative', 'moderate', 'balanced',
                      'growth', 'aggressive'.

    Returns:
        dict mapping asset class to percentage allocation, e.g.
        {'renta_variable': 55, 'renta_fija': 30, 'alternativos': 10, 'liquidez': 5}

    Raises:
        ValueError: If profile_type is not recognized.
    """
    if profile_type not in _ALLOCATIONS:
        raise ValueError(
            f"Perfil no reconocido: '{profile_type}'. "
            f"Opciones válidas: {list(_ALLOCATIONS.keys())}"
        )
    return _ALLOCATIONS[profile_type].copy()
