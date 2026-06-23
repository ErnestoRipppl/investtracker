"""
Recommendation Pydantic schemas for response validation.
"""

from typing import Optional

from pydantic import BaseModel


class FormulaExplanationSchema(BaseModel):
    """Schema for formula explanation within a recommendation."""

    id: str
    name: str
    formula_latex: str
    description: str
    interpretation: str


class RecommendationResponse(BaseModel):
    """Schema for a recommendation response."""

    id: str
    priority: int
    category: str
    title: str
    summary: str
    detailed_analysis: str
    formulas_used: list[str]
    calculations_shown: dict
    action_suggested: str
    impact_estimate: str
    confidence: str
    profile_alignment: str
