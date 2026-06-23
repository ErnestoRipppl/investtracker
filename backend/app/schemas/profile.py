"""
Profile Pydantic schemas for questionnaire and profile responses.
"""

from typing import Optional

from pydantic import BaseModel, Field


class QuestionOptionSchema(BaseModel):
    """Schema for a single questionnaire option."""

    value: str
    label: str
    score: int


class QuestionnaireQuestionSchema(BaseModel):
    """Schema for a single questionnaire question."""

    id: str
    section: str
    text: str
    type: str
    options: list[QuestionOptionSchema]


class QuestionnaireSubmission(BaseModel):
    """Schema for submitting questionnaire answers."""

    answers: dict[str, str] = Field(
        ..., description="Mapping of question_id to selected option value"
    )


class ProfileResponse(BaseModel):
    """Schema for investor profile response."""

    id: Optional[int] = None
    profile_type: str
    risk_tolerance_score: int
    time_horizon_years: int
    investment_objective: str
    max_acceptable_drawdown_pct: float
    recommended_allocation: dict[str, int]
    is_active: Optional[bool] = True

    model_config = {"from_attributes": True}
