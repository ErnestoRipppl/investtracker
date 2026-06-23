"""
Analytics router — KPIs, quantitative metrics, risk, Monte Carlo, recommendations.
"""

from decimal import Decimal

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.broker import Broker
from app.models.investor_profile import InvestorProfile
from app.services.analytics_service import get_portfolio_kpis, get_portfolio_analytics
from app.services.quant_engine import QuantEngine
from app.services.recommendation_engine import generate_recommendations
from app.services.portfolio_engine import compute_holdings, compute_dashboard
from app.services.market_service import get_bulk_prices, get_eur_usd_rate

from app.services.analytics_service import get_portfolio_analytics

router = APIRouter(prefix="/api/analytics", tags=["analytics"])


def _serialize(obj):
    """Recursively convert Decimal values to float."""
    if isinstance(obj, Decimal):
        return float(obj)
    if isinstance(obj, dict):
        return {k: _serialize(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [_serialize(item) for item in obj]
    return obj


@router.get("/kpis")
def get_kpis(db: Session = Depends(get_db)) -> dict:
    """
    Get basic portfolio KPIs: total value, invested, ROI, CAGR.
    """
    kpis = get_portfolio_kpis(db)
    return _serialize(kpis)


@router.get("/quant")
def get_quant(db: Session = Depends(get_db)) -> dict:
    """
    Get quantitative portfolio metrics (P&L realized/unrealized, commissions, weights, etc.).
    """
    return get_portfolio_analytics(db)


@router.get("/risk")
def get_risk(db: Session = Depends(get_db)) -> dict:
    """
    Disabled risk dashboard endpoint.
    """
    return {}


@router.get("/monte-carlo")
def get_monte_carlo(db: Session = Depends(get_db)) -> dict:
    """
    Disabled Monte Carlo simulation endpoint.
    """
    return {}


@router.get("/recommendations")
def get_recommendations(db: Session = Depends(get_db)) -> list[dict]:
    """
    Get portfolio recommendations based on holdings, profile, and metrics.
    """
    holdings = compute_holdings(db)

    # Enrich holdings with market data
    if holdings:
        tickers = [h["ticker"] for h in holdings]
        prices_data = get_bulk_prices(tickers)
        market_prices: dict[str, Decimal] = {}
        for t, d in prices_data.items():
            if d["price"] is not None:
                market_prices[t] = d["price"]
            else:
                for h in holdings:
                    if h["ticker"] == t:
                        market_prices[t] = h["avg_price"]

        eur_usd = get_eur_usd_rate()
        dashboard = compute_dashboard(holdings, market_prices, eur_usd)
        enriched_holdings = dashboard["holdings"]
    else:
        enriched_holdings = []

    # Get active profile
    profile = db.query(InvestorProfile).filter(InvestorProfile.is_active == True).first()
    profile_dict = None
    if profile:
        import json
        profile_dict = {
            "profile_type": profile.profile_type,
            "risk_tolerance_score": profile.risk_tolerance_score,
            "max_acceptable_drawdown_pct": float(profile.max_acceptable_drawdown_pct),
        }

    # Get quant metrics (dummy values, daily return series metrics are disabled)
    quant_dict = {
        "volatility": 0.0,
        "max_drawdown": 0.0,
        "kelly_criterion": None,
    }

    # Get default broker
    broker = db.query(Broker).filter(Broker.is_default == True).first()

    recs = generate_recommendations(
        holdings=enriched_holdings,
        profile_dict=profile_dict,
        quant_metrics_dict=quant_dict,
        broker_model=broker,
    )

    return [
        {
            "id": r.id,
            "priority": r.priority,
            "category": r.category,
            "title": r.title,
            "summary": r.summary,
            "detailed_analysis": r.detailed_analysis,
            "formulas_used": r.formulas_used,
            "calculations_shown": _serialize(r.calculations_shown),
            "action_suggested": r.action_suggested,
            "impact_estimate": r.impact_estimate,
            "confidence": r.confidence,
            "profile_alignment": r.profile_alignment,
        }
        for r in recs
    ]
