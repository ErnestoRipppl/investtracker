"""
Tests for the Excel importer service.
"""

import io
import pytest
from decimal import Decimal
import pandas as pd
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.database import Base
from app.models.transaction import Transaction
from app.models.asset import Asset
from app.models.broker import Broker
from app.services.excel_importer import import_transactions, normalize_text

# Set up test database
TEST_DB_URL = "sqlite:///:memory:"
test_engine = create_engine(TEST_DB_URL, connect_args={"check_same_thread": False})
TestSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)


@pytest.fixture
def db_session():
    """Create and tear down memory database for tests."""
    Base.metadata.create_all(bind=test_engine)
    db = TestSessionLocal()
    ib = Broker(id=1, name="Interactive Brokers", commission_type="fixed", commission_fixed_eur=Decimal("0"), is_default=True)
    db.add(ib)
    db.commit()
    yield db
    db.close()
    Base.metadata.drop_all(bind=test_engine)


def _create_excel_bytes(sheets_data: dict[str, pd.DataFrame]) -> bytes:
    buffer = io.BytesIO()
    with pd.ExcelWriter(buffer, engine="openpyxl") as writer:
        for sheet_name, df in sheets_data.items():
            df.to_excel(writer, sheet_name=sheet_name, index=False)
    return buffer.getvalue()


def _make_valid_row(**overrides):
    row = {
        "Fecha": "2026-06-21",
        "Ticker / Activo": "AAPL",
        "Tipo (Compra/Venta)": "Compra",
        "Cantidad": 10,
        "Precio Unit. (€)": 150.0,
        "Comisión (€)": 1.5,
        "Total Invertido (€)": 1501.5,
    }
    row.update(overrides)
    return row


# --- normalize_text tests ---

def test_normalize_text_strips_spaces():
    assert normalize_text("  Fecha  ") == "fecha"

def test_normalize_text_removes_accents():
    assert normalize_text("Comisión") == "comision"

def test_normalize_text_collapses_spaces():
    assert normalize_text("Tipo   (Compra/Venta)") == "tipo (compra/venta)"


# --- Sheet selection tests ---

def test_picks_sheet_named_transacciones(db_session):
    """Sheet named 'Transacciones' is picked even if it's not the first."""
    df_junk = pd.DataFrame([{"KPI": "Net Worth", "Value": 100000}])
    df_trans = pd.DataFrame([_make_valid_row()])
    excel = _create_excel_bytes({
        "Dashboard Cartera": df_junk,
        "Transacciones": df_trans,
        "KPI Resumen": df_junk,
    })
    res = import_transactions(db_session, excel)
    assert res["total_imported"] == 1
    assert res["sheets_processed"] == 1
    assert len(res["errors"]) == 0


def test_picks_sheet_with_transacc_substring(db_session):
    """Any sheet whose name contains 'transacc' is picked."""
    df_junk = pd.DataFrame([{"KPI": "Net Worth"}])
    df_trans = pd.DataFrame([_make_valid_row()])
    excel = _create_excel_bytes({
        "Dashboard": df_junk,
        "Mis Transacciones 2026": df_trans,
    })
    res = import_transactions(db_session, excel)
    assert res["total_imported"] == 1
    assert len(res["errors"]) == 0


def test_falls_back_to_first_sheet_if_no_transacc_name(db_session):
    """When no sheet name contains 'transacc', uses the first sheet."""
    df_trans = pd.DataFrame([_make_valid_row()])
    df_junk = pd.DataFrame([{"KPI": "Net Worth"}])
    excel = _create_excel_bytes({
        "Hoja1": df_trans,
        "Resumen": df_junk,
    })
    res = import_transactions(db_session, excel)
    assert res["total_imported"] == 1
    assert len(res["errors"]) == 0


def test_ignores_other_sheets_silently(db_session):
    """Other sheets don't produce errors or warnings."""
    df_junk = pd.DataFrame([{"KPI": "Net Worth", "Value": 100000}])
    df_distrib = pd.DataFrame([{"Activo": "AAPL", "Peso": "30%"}])
    df_trans = pd.DataFrame([_make_valid_row()])
    excel = _create_excel_bytes({
        "Transacciones": df_trans,
        "Dashboard Cartera": df_junk,
        "Distribución": df_distrib,
        "KPI Resumen": df_junk,
    })
    res = import_transactions(db_session, excel)
    assert res["total_imported"] == 1
    assert res["sheets_processed"] == 1
    assert len(res["errors"]) == 0
    # No errors about Dashboard, Distribución, or KPI Resumen
    for e in res["errors"]:
        assert "Dashboard" not in e
        assert "Distribución" not in e
        assert "KPI" not in e


def test_missing_columns_error_in_spanish(db_session):
    """When selected sheet is missing required columns, error names are in Spanish."""
    df_bad = pd.DataFrame([{"Fecha": "2026-06-21", "Ticker / Activo": "AAPL"}])
    excel = _create_excel_bytes({"Transacciones": df_bad})
    res = import_transactions(db_session, excel)
    assert res["total_imported"] == 0
    assert len(res["errors"]) == 1
    err = res["errors"][0]
    # Must NOT contain English internal names
    assert "transaction_type" not in err
    assert "quantity" not in err
    assert "unit_price" not in err
    # Must contain Spanish names
    assert "Tipo (Compra/Venta)" in err or "Cantidad" in err or "Precio Unit." in err


def test_flexible_column_matching_with_accents_and_casing(db_session):
    """Column names with different casing, extra spaces, or missing accents still match."""
    df = pd.DataFrame([{
        "  FECHA  ": "2026-06-21",
        "ticker / activo": "TSLA",
        "tipo (compra/venta)": "Compra",
        "CANTIDAD": 5,
        "precio unit. (€)": 200.0,
        "comision (€)": 0.5,
    }])
    excel = _create_excel_bytes({"Transacciones": df})
    res = import_transactions(db_session, excel)
    assert res["total_imported"] == 1
    assert len(res["errors"]) == 0


def test_duplicate_detection(db_session):
    """Importing the same row twice skips the duplicate."""
    df = pd.DataFrame([_make_valid_row()])
    excel = _create_excel_bytes({"Transacciones": df})
    res1 = import_transactions(db_session, excel)
    assert res1["total_imported"] == 1
    res2 = import_transactions(db_session, excel)
    assert res2["total_imported"] == 0
    assert res2["duplicates_skipped"] == 1
