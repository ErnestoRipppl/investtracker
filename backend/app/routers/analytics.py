"""
Analytics router — KPIs, quantitative metrics, risk, Monte Carlo, recommendations.
"""

from decimal import Decimal
from typing import List, Optional

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
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


class SimulatedAsset(BaseModel):
    ticker: str
    asset_type: str
    value: float


class SimulationRequest(BaseModel):
    simulated_assets: List[SimulatedAsset]
    years: int = 5
    contribution_type: str = "lump_sum"


ASSET_METRICS = {
    "crypto": {"return": 0.18, "volatility": 0.45},
    "stock": {"return": 0.09, "volatility": 0.18},
    "etf": {"return": 0.075, "volatility": 0.14},
    "fund": {"return": 0.06, "volatility": 0.11},
    "bond": {"return": 0.04, "volatility": 0.055},
}
DEFAULT_METRICS = {"return": 0.03, "volatility": 0.01}


@router.post("/simulate")
def simulate_portfolio(req: SimulationRequest, db: Session = Depends(get_db)) -> dict:
    """
    Simulate portfolio performance by merging current positions with simulated ones,
    calculating new metrics, and running Monte Carlo simulation.
    """
    # 1. Get current holdings
    holdings = compute_holdings(db)
    
    # Enrich to get prices and current values
    current_positions = {}
    total_current_value = 0.0
    
    if holdings:
        tickers = [h["ticker"] for h in holdings]
        prices_data = get_bulk_prices(tickers)
        market_prices = {}
        for t, d in prices_data.items():
            if d["price"] is not None:
                market_prices[t] = d["price"]
            else:
                for h in holdings:
                    if h["ticker"] == t:
                        market_prices[t] = h["avg_price"]
        
        eur_usd = get_eur_usd_rate()
        dashboard = compute_dashboard(holdings, market_prices, eur_usd)
        
        for h in dashboard["holdings"]:
            ticker = h["ticker"]
            val = float(h.get("position_value", 0.0))
            asset_type = h.get("asset_type", "stock").lower()
            current_positions[ticker] = {
                "ticker": ticker,
                "asset_type": asset_type,
                "value": val
            }
            total_current_value += val

    # 2. Merge with simulated assets
    merged_positions = {}
    for k, v in current_positions.items():
        merged_positions[k] = v.copy()
        
    for sim in req.simulated_assets:
        ticker = sim.ticker.strip().upper()
        asset_type = sim.asset_type.lower()
        val = sim.value
        
        if ticker in merged_positions:
            merged_positions[ticker]["value"] += val
        else:
            merged_positions[ticker] = {
                "ticker": ticker,
                "asset_type": asset_type,
                "value": val
            }

    # 3. Calculate metrics
    total_projected_value = sum(pos["value"] for pos in merged_positions.values())
    
    if total_projected_value <= 0:
        return {
            "expected_return": 0.0,
            "volatility": 0.0,
            "sharpe_ratio": 0.0,
            "current_value": total_current_value,
            "projected_value": 0.0,
            "projected_allocation": {
                "renta_variable": 0.0,
                "renta_fija": 0.0,
                "alternativos": 0.0,
                "liquidez": 0.0
            },
            "monte_carlo": {}
        }

    weighted_return = 0.0
    sum_weighted_var = 0.0
    
    actual_rv = 0.0
    actual_rf = 0.0
    actual_alt = 0.0
    actual_liq = 0.0

    for pos in merged_positions.values():
        val = pos["value"]
        w = val / total_projected_value
        atype = pos["asset_type"]
        
        metrics = ASSET_METRICS.get(atype, DEFAULT_METRICS)
        weighted_return += w * metrics["return"]
        sum_weighted_var += (w * metrics["volatility"]) ** 2
        
        if atype in ("stock", "etf", "fund"):
            actual_rv += w * 100.0
        elif atype == "bond":
            actual_rf += w * 100.0
        elif atype == "crypto":
            actual_alt += w * 100.0
        else:
            actual_liq += w * 100.0

    portfolio_vol = max(0.01, float(sum_weighted_var ** 0.5))
    sharpe = (weighted_return - 0.03) / portfolio_vol

    # 4. Run Monte Carlo
    init_val = total_current_value if req.contribution_type == "recurring" else total_projected_value
    monthly_contrib = sum(sim.value for sim in req.simulated_assets) if req.contribution_type == "recurring" else 0.0

    mc = QuantEngine.monte_carlo_simulation(
        current_value=total_projected_value,
        expected_return=weighted_return,
        volatility=portfolio_vol,
        years=req.years,
        n_simulations=1000,
        initial_value=init_val,
        monthly_contribution=monthly_contrib
    )

    return {
        "expected_return": round(weighted_return, 4),
        "volatility": round(portfolio_vol, 4),
        "sharpe_ratio": round(sharpe, 4),
        "current_value": round(total_current_value, 2),
        "projected_value": round(total_projected_value, 2),
        "projected_allocation": {
            "renta_variable": round(actual_rv, 2),
            "renta_fija": round(actual_rf, 2),
            "alternativos": round(actual_alt, 2),
            "liquidez": round(actual_liq, 2)
        },
        "monte_carlo": mc
    }

