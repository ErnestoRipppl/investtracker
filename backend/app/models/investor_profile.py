"""
InvestorProfile model for risk profiling and portfolio recommendations.
"""

from datetime import datetime
from decimal import Decimal
from typing import Optional

from sqlalchemy import Boolean, Integer, Numeric, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class InvestorProfile(Base):
    """
    Stores the investor's risk profile derived from a questionnaire.

    Used to generate personalized recommendations and check
    portfolio alignment against the investor's goals.

    Attributes:
        id: Primary key, auto-incremented.
        profile_type: Risk profile category.
        risk_tolerance_score: Numeric score from 1-100.
        time_horizon_years: Investment time horizon in years.
        investment_objective: Primary investment objective.
        monthly_contribution: Optional planned monthly investment.
        max_acceptable_drawdown_pct: Maximum acceptable portfolio loss.
        questionnaire_answers: JSON string of raw questionnaire answers.
        recommended_allocation: JSON string of recommended asset allocation.
        is_active: Whether this is the current active profile.
        created_at: Timestamp of creation.
        updated_at: Timestamp of last update.
    """

    __tablename__ = "investor_profiles"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    profile_type: Mapped[str] = mapped_column(
        String(20), nullable=False
    )
    risk_tolerance_score: Mapped[int] = mapped_column(
        Integer, nullable=False
    )
    time_horizon_years: Mapped[int] = mapped_column(
        Integer, nullable=False
    )
    investment_objective: Mapped[str] = mapped_column(
        String(100), nullable=False
    )
    monthly_contribution: Mapped[Optional[Decimal]] = mapped_column(
        Numeric(18, 4), nullable=True
    )
    max_acceptable_drawdown_pct: Mapped[Decimal] = mapped_column(
        Numeric(5, 2), nullable=False
    )
    questionnaire_answers: Mapped[Optional[str]] = mapped_column(
        Text, nullable=True
    )
    recommended_allocation: Mapped[Optional[str]] = mapped_column(
        Text, nullable=True
    )
    is_active: Mapped[bool] = mapped_column(
        Boolean, default=True, nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(
        default=datetime.utcnow, nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False
    )

    def __repr__(self) -> str:
        return (
            f"<InvestorProfile(id={self.id}, type='{self.profile_type}', "
            f"score={self.risk_tolerance_score})>"
        )
