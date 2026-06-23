"""
Tests for API endpoints using FastAPI TestClient.

Tests health check, broker CRUD, transaction creation (auto-creates asset),
and holdings retrieval.
"""

import os
import pytest
from datetime import date
from decimal import Decimal

# Override DATABASE_URL before importing app to use test database
os.environ["DATABASE_URL"] = "sqlite:///./data/test_portfolio.db"

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.database import Base, get_db
from app.auth import require_auth
from app.main import app

# Set up test database
TEST_DB_URL = "sqlite:///./data/test_portfolio.db"
test_engine = create_engine(TEST_DB_URL, connect_args={"check_same_thread": False})
TestSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)


def override_get_db():
    """Override database dependency for tests."""
    db = TestSessionLocal()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db


def override_require_auth():
    """Override auth dependency for tests."""
    return {"sub": "test-user"}


app.dependency_overrides[require_auth] = override_require_auth


@pytest.fixture(autouse=True)
def setup_database():
    """Create and tear down the test database for each test."""
    Base.metadata.create_all(bind=test_engine)
    yield
    Base.metadata.drop_all(bind=test_engine)


client = TestClient(app)


class TestHealthCheck:
    """Tests for the health check endpoint."""

    def test_health_returns_200(self):
        response = client.get("/health")
        assert response.status_code == 200

    def test_health_response_body(self):
        response = client.get("/health")
        data = response.json()
        assert data["status"] == "healthy"
        assert data["version"] == "1.0.0"
        assert data["service"] == "InvestTracker API"


class TestBrokerCRUD:
    """Tests for broker CRUD endpoints."""

    def test_create_broker(self):
        response = client.post("/api/brokers/", json={
            "name": "Interactive Brokers",
            "commission_type": "percentage",
            "commission_pct": 0.001,
            "min_commission_eur": 1.0,
            "max_commission_eur": 10.0,
        })
        assert response.status_code == 201
        data = response.json()
        assert data["name"] == "Interactive Brokers"
        assert data["commission_type"] == "percentage"
        assert data["id"] >= 1

    def test_list_brokers(self):
        # Create one first
        client.post("/api/brokers/", json={
            "name": "DEGIRO",
            "commission_type": "fixed",
            "commission_fixed_eur": 2.0,
        })
        response = client.get("/api/brokers/")
        assert response.status_code == 200
        data = response.json()
        assert len(data) >= 1
        assert any(b["name"] == "DEGIRO" for b in data)

    def test_get_broker_by_id(self):
        create_resp = client.post("/api/brokers/", json={
            "name": "XTB",
            "commission_type": "fixed",
            "commission_fixed_eur": 0.0,
        })
        broker_id = create_resp.json()["id"]

        response = client.get(f"/api/brokers/{broker_id}")
        assert response.status_code == 200
        assert response.json()["name"] == "XTB"

    def test_update_broker(self):
        create_resp = client.post("/api/brokers/", json={
            "name": "Old Name",
            "commission_type": "fixed",
        })
        broker_id = create_resp.json()["id"]

        response = client.put(f"/api/brokers/{broker_id}", json={
            "name": "New Name",
        })
        assert response.status_code == 200
        assert response.json()["name"] == "New Name"

    def test_delete_broker(self):
        create_resp = client.post("/api/brokers/", json={
            "name": "To Delete",
            "commission_type": "fixed",
        })
        broker_id = create_resp.json()["id"]

        response = client.delete(f"/api/brokers/{broker_id}")
        assert response.status_code == 204

        get_resp = client.get(f"/api/brokers/{broker_id}")
        assert get_resp.status_code == 404

    def test_get_nonexistent_broker(self):
        response = client.get("/api/brokers/9999")
        assert response.status_code == 404


class TestTransactions:
    """Tests for transaction endpoints."""

    def test_create_transaction_auto_creates_asset(self):
        """Creating a transaction with a new ticker auto-creates the asset."""
        response = client.post("/api/transactions/", json={
            "ticker": "AAPL",
            "transaction_type": "buy",
            "quantity": 10,
            "unit_price": 150.0,
            "commission": 5.0,
            "date": "2024-01-15",
        })
        assert response.status_code == 201
        data = response.json()
        assert data["ticker"] == "AAPL"
        assert data["quantity"] == 10.0
        assert data["unit_price"] == 150.0
        assert data["commission"] == 5.0
        assert data["total_invested"] == 1505.0  # 10*150 + 5
        assert data["asset_id"] >= 1

    def test_create_second_transaction_same_ticker(self):
        """Second transaction with same ticker reuses the asset."""
        client.post("/api/transactions/", json={
            "ticker": "MSFT",
            "transaction_type": "buy",
            "quantity": 5,
            "unit_price": 300.0,
            "date": "2024-01-10",
        })
        response = client.post("/api/transactions/", json={
            "ticker": "MSFT",
            "transaction_type": "buy",
            "quantity": 3,
            "unit_price": 310.0,
            "date": "2024-02-10",
        })
        assert response.status_code == 201
        # Both should have the same asset_id
        data = response.json()
        assert data["ticker"] == "MSFT"

    def test_list_transactions(self):
        client.post("/api/transactions/", json={
            "ticker": "GOOG",
            "transaction_type": "buy",
            "quantity": 2,
            "unit_price": 2800.0,
            "date": "2024-03-01",
        })
        response = client.get("/api/transactions/")
        assert response.status_code == 200
        data = response.json()
        assert data["total"] >= 1
        assert len(data["items"]) >= 1

    def test_list_transactions_filter_by_ticker(self):
        client.post("/api/transactions/", json={
            "ticker": "TSLA",
            "transaction_type": "buy",
            "quantity": 1,
            "unit_price": 200.0,
            "date": "2024-04-01",
        })
        response = client.get("/api/transactions/?ticker=TSLA")
        assert response.status_code == 200
        data = response.json()
        assert all(item["ticker"] == "TSLA" for item in data["items"])

    def test_invalid_transaction_type(self):
        response = client.post("/api/transactions/", json={
            "ticker": "AAPL",
            "transaction_type": "invalid",
            "quantity": 1,
            "unit_price": 100.0,
            "date": "2024-01-01",
        })
        assert response.status_code == 400

    def test_delete_transaction(self):
        create_resp = client.post("/api/transactions/", json={
            "ticker": "NVDA",
            "transaction_type": "buy",
            "quantity": 1,
            "unit_price": 500.0,
            "date": "2024-05-01",
        })
        txn_id = create_resp.json()["id"]

        response = client.delete(f"/api/transactions/{txn_id}")
        assert response.status_code == 204


class TestPortfolioHoldings:
    """Tests for portfolio holdings endpoint."""

    def test_empty_portfolio(self):
        response = client.get("/api/portfolio/holdings")
        assert response.status_code == 200
        data = response.json()
        assert data.get("holdings", []) == [] or data.get("total_assets", 0) == 0

    def test_holdings_after_buy(self):
        """Create a buy transaction and verify it shows up in holdings."""
        client.post("/api/transactions/", json={
            "ticker": "AAPL",
            "transaction_type": "buy",
            "quantity": 10,
            "unit_price": 150.0,
            "commission": 5.0,
            "date": "2024-01-15",
        })
        response = client.get("/api/portfolio/holdings")
        assert response.status_code == 200
        data = response.json()
        # Should have at least 1 holding
        holdings = data.get("holdings", [])
        assert len(holdings) >= 1
        aapl = next((h for h in holdings if h["ticker"] == "AAPL"), None)
        assert aapl is not None
        assert aapl["accumulated_qty"] == 10.0


class TestQuestionnaire:
    """Tests for the profile questionnaire endpoint."""

    def test_get_questionnaire(self):
        response = client.get("/api/profile/questionnaire")
        assert response.status_code == 200
        data = response.json()
        assert len(data) >= 12  # At least 12 questions
        assert all("id" in q and "text" in q and "options" in q for q in data)
