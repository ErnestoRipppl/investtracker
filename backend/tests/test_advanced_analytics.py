"""
Tests for advanced quantitative analytics backend service.
"""

import os
import json
import pytest
from datetime import date, datetime
from decimal import Decimal
from unittest.mock import patch
import pandas as pd
import numpy as np

# Override DATABASE_URL before importing app to use test database
os.environ["DATABASE_URL"] = "sqlite:///./data/test_advanced_analytics.db"

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.database import Base
from app.models.asset import Asset
from app.models.transaction import Transaction
from app.models.investor_profile import InvestorProfile
from app.services import advanced_analytics

# Set up test database
TEST_DB_URL = "sqlite:///./data/test_advanced_analytics.db"
test_engine = create_engine(TEST_DB_URL, connect_args={"check_same_thread": False})
TestSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)

@pytest.fixture(scope="function", autouse=True)
def mock_yfinance_download():
    """Mock yfinance.download to return stable synthetic price data."""
    def mock_download(*args, **kwargs):
        tickers = args[0]
        if isinstance(tickers, str):
            tickers = [tickers]
            
        dates = pd.date_range(end=datetime.now(), periods=50, freq="W" if kwargs.get("interval") == "1wk" else "D")
        data = {}
        for t in tickers:
            data[t] = np.random.normal(100, 2, 50)
            
        df = pd.DataFrame(data, index=dates)
        # Mock multi-index Close / Adj Close
        df.columns = pd.MultiIndex.from_product([["Adj Close"], df.columns])
        return df

    with patch("yfinance.download", side_effect=mock_download) as mock:
        yield mock

@pytest.fixture(scope="function", autouse=True)
def mock_market_service_prices():
    """Mock market_service to return stable price data of 100.0 for all tickers."""
    from decimal import Decimal
    with patch("app.services.market_service.get_bulk_prices", 
               side_effect=lambda tickers: {t: {"price": Decimal("100.0000"), "stale": False} for t in tickers}) as mock_bulk, \
         patch("app.services.market_service.get_current_price",
               side_effect=lambda t: {"price": Decimal("100.0000"), "stale": False}) as mock_single:
        yield (mock_bulk, mock_single)

@pytest.fixture(scope="function", autouse=True)
def setup_db():
    """Reset and seed the database for each test."""
    Base.metadata.drop_all(bind=test_engine)
    Base.metadata.create_all(bind=test_engine)
    db = TestSessionLocal()
    try:
        # Create active investor profile (moderate)
        profile = InvestorProfile(
            profile_type="moderate",
            risk_tolerance_score=35,
            time_horizon_years=5,
            recommended_allocation=json.dumps({
                "renta_variable": 35,
                "renta_fija": 40,
                "alternativos": 10,
                "liquidez": 15
            }),
            max_acceptable_drawdown_pct=Decimal("10.0"),
            investment_objective="moderate growth",
            is_active=True
        )
        db.add(profile)
        db.commit()
        yield db
    finally:
        db.close()

def test_rebalancing_empty_portfolio(setup_db):
    """Test rebalancing suggestions when the portfolio is empty."""
    db = setup_db
    res = advanced_analytics.get_rebalancing(db)
    
    assert res["portfolio_value"] == 0.0
    assert res["profile_allocations"]["renta_variable"] == 35.0
    assert res["allocation_percentages"]["renta_variable"] == 0.0
    
    # Empty portfolio gets a nominal total value of €1,000 to suggest allocations
    actions = {a["ticker"]: a for a in res["actions"]}
    assert actions["EUNL"]["action"] == "COMPRA"
    # Target RV = 35% of €1000 = €350, EUNL share = 70% of RV = €245
    assert actions["EUNL"]["amount"] == 245.0

def test_rebalancing_existing_portfolio(setup_db):
    """Test rebalancing suggestions with active holdings."""
    db = setup_db
    
    # Add an asset
    asset = Asset(ticker="EUNL", name="iShares MSCI World", asset_type="etf")
    db.add(asset)
    db.commit()
    
    # Add a buy transaction of €10,000
    txn = Transaction(
        asset_id=asset.id,
        transaction_type="buy",
        quantity=Decimal("100.0"),
        unit_price=Decimal("100.0"),
        commission=Decimal("0.0"),
        total_invested=Decimal("10000.0"),
        date=date(2026, 1, 1)
    )
    db.add(txn)
    db.commit()
    
    res = advanced_analytics.get_rebalancing(db)
    
    # EUNL represents 100% of the portfolio (RV)
    assert res["portfolio_value"] == 10000.0
    assert res["allocation_percentages"]["renta_variable"] == 100.0
    
    # Suggestions should say to sell EUNL (overweight) and buy other assets
    actions = {a["ticker"]: a for a in res["actions"]}
    assert actions["EUNL"]["action"] == "VENTA"
    assert actions["BTC-EUR"]["action"] == "COMPRA"

def test_correlation_matrix(setup_db):
    """Test that correlation matrix returns correct shape and labels."""
    db = setup_db
    res = advanced_analytics.get_correlation_matrix(db)
    
    assert "labels" in res
    assert "matrix" in res
    assert len(res["labels"]) >= 4
    assert len(res["matrix"]) == len(res["labels"])
    # Diagonal correlation should be exactly 1.0
    assert res["matrix"][0][0] == 1.0

def test_portfolio_optimization(setup_db):
    """Test Markowitz portfolio optimization returns valid weights."""
    db = setup_db
    res = advanced_analytics.get_portfolio_optimization(db)
    
    assert "msr" in res
    assert "min_vol" in res
    assert "frontier" in res
    
    # Expected weights should sum to ~1.0
    msr_weights_sum = sum(res["msr"]["weights"].values())
    assert abs(msr_weights_sum - 1.0) < 0.01

def test_historical_backtest(setup_db):
    """Test historical backtesting return coordinates."""
    db = setup_db
    res = advanced_analytics.get_historical_backtest(db, years=3)
    
    assert res["years"] == 3
    assert "metrics" in res
    assert "history" in res
    assert len(res["history"]) > 0

def test_fifo_tax_calculation(setup_db):
    """Test FIFO tax simulation matches oldest purchase batches."""
    db = setup_db
    
    asset = Asset(ticker="EUNL", name="iShares MSCI World", asset_type="etf")
    db.add(asset)
    db.commit()
    
    # Lot 1: Buy 10 shares at €100
    t1 = Transaction(
        asset_id=asset.id,
        transaction_type="buy",
        quantity=Decimal("10.0"),
        unit_price=Decimal("100.0"),
        commission=Decimal("0.0"),
        total_invested=Decimal("1000.0"),
        date=date(2025, 1, 1)
    )
    # Lot 2: Buy 15 shares at €110
    t2 = Transaction(
        asset_id=asset.id,
        transaction_type="buy",
        quantity=Decimal("15.0"),
        unit_price=Decimal("110.0"),
        commission=Decimal("0.0"),
        total_invested=Decimal("1650.0"),
        date=date(2025, 2, 1)
    )
    db.add(t1)
    db.add(t2)
    db.commit()
    
    # Simulate selling 12 shares at €150
    # FIFO: sells all 10 shares of Lot 1 (cost €1000, value €1500, gain €500)
    # plus 2 shares of Lot 2 (cost €220, value €300, gain €80)
    # Total Proceeds = 12 * 150 = 1800
    # Total Cost = 1000 + 220 = 1220
    # Net Gain = 580
    # Tax = 580 * 19% = 110.20
    res = advanced_analytics.simulate_fifo_tax(db, "EUNL", 12.0, 150.0)
    
    assert res["ticker"] == "EUNL"
    assert res["quantity"] == 12.0
    assert res["total_proceeds"] == 1800.0
    assert res["total_cost"] == 1220.0
    assert res["net_gain"] == 580.0
    assert res["estimated_tax"] == round(580.0 * 0.19, 2)
    
    assert len(res["lots"]) == 2
    assert res["lots"][0]["buy_price"] == 100.0
    assert res["lots"][0]["qty"] == 10.0
    assert res["lots"][1]["buy_price"] == 110.0
    assert res["lots"][1]["qty"] == 2.0
