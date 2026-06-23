"""
InvestTracker API — main application entry point.

Configures the FastAPI app with CORS, routers, and database initialization.
"""

from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database import init_db
from app.auth import require_auth, router as auth_router
from app.routers import (
    analytics,
    broker,
    import_export,
    market_data,
    portfolio,
    profile,
    transactions,
)

app = FastAPI(
    title="InvestTracker API",
    version="1.0.0",
    description=(
        "API de seguimiento de carteras de inversión personal. "
        "Proporciona análisis cuantitativo, perfilado de riesgo, "
        "y recomendaciones personalizadas."
    ),
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"https?://.*",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth_router)
app.include_router(transactions.router, dependencies=[Depends(require_auth)])
app.include_router(portfolio.router, dependencies=[Depends(require_auth)])
app.include_router(analytics.router, dependencies=[Depends(require_auth)])
app.include_router(market_data.router, dependencies=[Depends(require_auth)])
app.include_router(import_export.router, dependencies=[Depends(require_auth)])
app.include_router(profile.router, dependencies=[Depends(require_auth)])
app.include_router(broker.router, dependencies=[Depends(require_auth)])


@app.on_event("startup")
def on_startup():
    """Initialize the database on application startup."""
    init_db()


@app.get("/health", tags=["system"])
def health_check() -> dict:
    """
    Health check endpoint.

    Returns:
        dict with status and version.
    """
    return {
        "status": "healthy",
        "version": "1.0.0",
        "service": "InvestTracker API",
    }
