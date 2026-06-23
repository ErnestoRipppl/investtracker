"""
Profile router — questionnaire, profile creation, and management.
"""

import json

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.investor_profile import InvestorProfile
from app.schemas.profile import (
    ProfileResponse,
    QuestionnaireQuestionSchema,
    QuestionnaireSubmission,
)
from app.services.profile_service import (
    QUESTIONNAIRE,
    calculate_profile,
    get_recommended_allocation,
)

router = APIRouter(prefix="/api/profile", tags=["profile"])


@router.get("/questionnaire", response_model=list[QuestionnaireQuestionSchema])
def get_questionnaire() -> list[dict]:
    """
    Get the investor profile questionnaire.

    Returns the full list of questions organized by section,
    each with options and scoring metadata.
    """
    return QUESTIONNAIRE


@router.post("/questionnaire", response_model=ProfileResponse)
def submit_questionnaire(
    submission: QuestionnaireSubmission,
    db: Session = Depends(get_db),
) -> ProfileResponse:
    """
    Submit questionnaire answers and create an investor profile.

    Deactivates any existing active profile and creates a new one.
    """
    result = calculate_profile(submission.answers)

    # Deactivate existing active profiles
    db.query(InvestorProfile).filter(
        InvestorProfile.is_active == True
    ).update({"is_active": False})

    profile = InvestorProfile(
        profile_type=result["profile_type"],
        risk_tolerance_score=result["risk_tolerance_score"],
        time_horizon_years=result["time_horizon_years"],
        investment_objective=result["investment_objective"],
        max_acceptable_drawdown_pct=result["max_acceptable_drawdown_pct"],
        questionnaire_answers=json.dumps(submission.answers),
        recommended_allocation=json.dumps(result["recommended_allocation"]),
        is_active=True,
    )
    db.add(profile)
    db.commit()
    db.refresh(profile)

    return ProfileResponse(
        id=profile.id,
        profile_type=profile.profile_type,
        risk_tolerance_score=profile.risk_tolerance_score,
        time_horizon_years=profile.time_horizon_years,
        investment_objective=profile.investment_objective,
        max_acceptable_drawdown_pct=float(profile.max_acceptable_drawdown_pct),
        recommended_allocation=result["recommended_allocation"],
        is_active=profile.is_active,
    )


@router.get("/", response_model=ProfileResponse)
def get_active_profile(db: Session = Depends(get_db)) -> ProfileResponse:
    """Get the currently active investor profile."""
    profile = (
        db.query(InvestorProfile)
        .filter(InvestorProfile.is_active == True)
        .first()
    )
    if profile is None:
        raise HTTPException(
            status_code=404,
            detail="No hay perfil activo. Completa el cuestionario primero.",
        )

    allocation = {}
    if profile.recommended_allocation:
        try:
            allocation = json.loads(profile.recommended_allocation)
        except json.JSONDecodeError:
            allocation = get_recommended_allocation(profile.profile_type)

    return ProfileResponse(
        id=profile.id,
        profile_type=profile.profile_type,
        risk_tolerance_score=profile.risk_tolerance_score,
        time_horizon_years=profile.time_horizon_years,
        investment_objective=profile.investment_objective,
        max_acceptable_drawdown_pct=float(profile.max_acceptable_drawdown_pct),
        recommended_allocation=allocation,
        is_active=profile.is_active,
    )


@router.put("/", response_model=ProfileResponse)
def update_profile(
    submission: QuestionnaireSubmission,
    db: Session = Depends(get_db),
) -> ProfileResponse:
    """Update the active profile by resubmitting questionnaire answers."""
    profile = (
        db.query(InvestorProfile)
        .filter(InvestorProfile.is_active == True)
        .first()
    )
    if profile is None:
        raise HTTPException(
            status_code=404,
            detail="No hay perfil activo para actualizar.",
        )

    result = calculate_profile(submission.answers)

    profile.profile_type = result["profile_type"]
    profile.risk_tolerance_score = result["risk_tolerance_score"]
    profile.time_horizon_years = result["time_horizon_years"]
    profile.investment_objective = result["investment_objective"]
    profile.max_acceptable_drawdown_pct = result["max_acceptable_drawdown_pct"]
    profile.questionnaire_answers = json.dumps(submission.answers)
    profile.recommended_allocation = json.dumps(result["recommended_allocation"])

    db.commit()
    db.refresh(profile)

    return ProfileResponse(
        id=profile.id,
        profile_type=profile.profile_type,
        risk_tolerance_score=profile.risk_tolerance_score,
        time_horizon_years=profile.time_horizon_years,
        investment_objective=profile.investment_objective,
        max_acceptable_drawdown_pct=float(profile.max_acceptable_drawdown_pct),
        recommended_allocation=result["recommended_allocation"],
        is_active=profile.is_active,
    )


@router.get("/history")
def get_profile_history(db: Session = Depends(get_db)) -> list[dict]:
    """List all investor profiles ordered by creation date descending."""
    profiles = (
        db.query(InvestorProfile)
        .order_by(InvestorProfile.created_at.desc())
        .all()
    )

    results = []
    for p in profiles:
        allocation = {}
        if p.recommended_allocation:
            try:
                allocation = json.loads(p.recommended_allocation)
            except json.JSONDecodeError:
                allocation = {}

        results.append({
            "id": p.id,
            "profile_type": p.profile_type,
            "risk_tolerance_score": p.risk_tolerance_score,
            "time_horizon_years": p.time_horizon_years,
            "investment_objective": p.investment_objective,
            "max_acceptable_drawdown_pct": float(p.max_acceptable_drawdown_pct),
            "recommended_allocation": allocation,
            "is_active": p.is_active,
            "created_at": p.created_at.isoformat(),
        })

    return results
