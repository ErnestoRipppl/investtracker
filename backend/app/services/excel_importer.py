"""
Excel importer service.

Parses Excel files with Spanish-language column headers,
validates data, and imports transactions into the database.
"""

import io
import logging
import unicodedata
from datetime import date, datetime
from decimal import Decimal, InvalidOperation

import pandas as pd
from sqlalchemy.orm import Session

from app.models.asset import Asset
from app.models.transaction import Transaction

logger = logging.getLogger(__name__)

# Maps Spanish column names to internal field names
# Multiple variants are supported so we match real-world Excel files.
COLUMN_MAP: dict[str, str] = {
    "Fecha": "date",
    "Ticker / Activo": "ticker",
    "Tipo (Compra/Venta)": "transaction_type",
    "Tipo": "transaction_type",
    "Cantidad": "quantity",
    "Precio Unit. (€)": "unit_price",
    "Comisión (€)": "commission",
    "Total Invertido (€)": "total_invested",
    "Notas": "notes",
}

# Maps Spanish/English transaction types to internal types
TYPE_MAP: dict[str, str] = {
    "compra": "buy",
    "buy": "buy",
    "venta": "sell",
    "sell": "sell",
    "dividendo": "dividend",
    "dividend": "dividend",
}

# Spanish translations for internal field names for user-facing output
SPANISH_COLUMN_NAMES: dict[str, str] = {
    "date": "Fecha",
    "ticker": "Ticker / Activo",
    "transaction_type": "Tipo (Compra/Venta)",
    "quantity": "Cantidad",
    "unit_price": "Precio Unit. (€)",
    "commission": "Comisión (€)",
    "total_invested": "Total Invertido (€)",
    "notes": "Notas",
}

REQUIRED_FIELDS = ["date", "ticker", "transaction_type", "quantity", "unit_price"]


def normalize_text(text: str) -> str:
    """
    Helper to normalize text by removing accents, ignoring case,
    and collapsing multiple spaces/stripping leading/trailing whitespace.
    """
    if not isinstance(text, str):
        return ""
    # Remove accents using NFD decomposition
    text_normalized = "".join(
        c for c in unicodedata.normalize('NFD', text)
        if unicodedata.category(c) != 'Mn'
    )
    # Lowercase and split on whitespace, then join to clean multiple spaces
    return " ".join(text_normalized.lower().split())


# Pre-computed normalized column mapping for flexible matching
NORMALIZED_COLUMN_MAP: dict[str, str] = {
    normalize_text(k): v for k, v in COLUMN_MAP.items()
}

REQUIRED_NORMALIZED = {
    normalize_text(SPANISH_COLUMN_NAMES[f]): f for f in REQUIRED_FIELDS
}


def _normalize_columns(df: pd.DataFrame) -> pd.DataFrame:
    """
    Rename columns from Spanish headers to internal names with flexible matching.

    Args:
        df: DataFrame with Spanish column headers.

    Returns:
        DataFrame with normalized column names.
    """
    rename_map = {}
    for col in df.columns:
        col_norm = normalize_text(str(col))
        if col_norm in NORMALIZED_COLUMN_MAP:
            rename_map[col] = NORMALIZED_COLUMN_MAP[col_norm]
    return df.rename(columns=rename_map)


def _is_sheet_valid(df: pd.DataFrame) -> bool:
    """
    Check if a sheet contains all required columns (flexible matching).
    """
    normalized_headers = {normalize_text(str(col)) for col in df.columns}
    required_norms = set(REQUIRED_NORMALIZED.keys())
    return required_norms.issubset(normalized_headers)


def _parse_date(val) -> date | None:
    """Parse a date value from Excel, handling various formats."""
    if pd.isna(val):
        return None
    if isinstance(val, datetime):
        return val.date()
    if isinstance(val, date):
        return val
    try:
        return pd.to_datetime(str(val), dayfirst=True).date()
    except Exception:
        return None


def _has_any_known_header(df: pd.DataFrame) -> bool:
    """Check whether any column in df matches a known header after normalization."""
    for col in df.columns:
        if normalize_text(str(col)) in NORMALIZED_COLUMN_MAP:
            return True
    return False


def parse_excel(file_bytes: bytes) -> dict[str, pd.DataFrame]:
    """
    Parse an Excel file and return a dict of raw DataFrames by sheet name.

    Handles decorative title rows: if the first row doesn't look like
    column headers (e.g. "📊 REGISTRO DE TRANSACCIONES"), retries
    reading the sheet with header=1 to skip it.

    Args:
        file_bytes: Raw bytes of the Excel file.

    Returns:
        dict mapping sheet_name -> DataFrame.
    """
    buffer = io.BytesIO(file_bytes)
    excel_file = pd.ExcelFile(buffer, engine="openpyxl")
    result: dict[str, pd.DataFrame] = {}

    for sheet_name in excel_file.sheet_names:
        # Try reading with default header=0
        df = pd.read_excel(excel_file, sheet_name=sheet_name)

        # If no known column headers were found, the first row is likely
        # a decorative title — retry with header=1
        if not _has_any_known_header(df):
            try:
                df_retry = pd.read_excel(excel_file, sheet_name=sheet_name, header=1)
                if _has_any_known_header(df_retry):
                    df = df_retry
            except Exception:
                pass  # stick with original df

        result[sheet_name] = df

    return result


def import_transactions(
    db: Session, file_bytes: bytes
) -> dict:
    """
    Import transactions from an Excel file into the database.

    Finds the correct sheet containing transactions, validates rows,
    creates assets if needed, and skips duplicates.
    Other sheets are ignored in silence.

    Args:
        db: SQLAlchemy session.
        file_bytes: Raw bytes of the uploaded Excel file.

    Returns:
        dict with sheets_processed, total_imported, errors, warnings,
        duplicates_skipped.
    """
    try:
        sheets = parse_excel(file_bytes)
    except Exception as e:
        return {
            "sheets_processed": 0,
            "total_imported": 0,
            "errors": [f"Error al leer el archivo Excel: {str(e)}"],
            "warnings": [],
            "duplicates_skipped": 0,
        }

    if not sheets:
        return {
            "sheets_processed": 0,
            "total_imported": 0,
            "errors": ["El archivo Excel no contiene ninguna hoja."],
            "warnings": [],
            "duplicates_skipped": 0,
        }

    chosen_sheet_name = None
    sheet_names_list = list(sheets.keys())

    # 1. Search for a sheet whose name contains "transacc" (case/accent insensitive)
    for name in sheet_names_list:
        if "transacc" in normalize_text(name):
            chosen_sheet_name = name
            break

    # 2. If not found, just use the first sheet in the file
    if chosen_sheet_name is None:
        chosen_sheet_name = sheet_names_list[0]

    # Process only the chosen sheet
    df = sheets[chosen_sheet_name]
    df_normalized = _normalize_columns(df)

    total_imported = 0
    errors: list[str] = []
    warnings: list[str] = []
    duplicates_skipped = 0

    required_cols = set(REQUIRED_FIELDS)
    present_cols = set(df_normalized.columns)
    missing = required_cols - present_cols

    if missing:
        missing_spanish = [SPANISH_COLUMN_NAMES[c] for c in missing]
        errors.append(
            f"Hoja '{chosen_sheet_name}': faltan columnas requeridas: {', '.join(missing_spanish)}"
        )
        return {
            "sheets_processed": 1,
            "total_imported": 0,
            "errors": errors,
            "warnings": [],
            "duplicates_skipped": 0,
        }

    for idx, row in df_normalized.iterrows():
        row_num = idx + 2  # Excel row (1-indexed header + 1)
        try:
            # Parse date
            txn_date = _parse_date(row.get("date"))
            if txn_date is None:
                errors.append(f"Hoja '{chosen_sheet_name}', fila {row_num}: fecha inválida.")
                continue

            # Parse ticker
            ticker = str(row.get("ticker", "")).strip().upper()
            if not ticker:
                errors.append(f"Hoja '{chosen_sheet_name}', fila {row_num}: ticker vacío.")
                continue

            # Parse transaction type
            raw_type = str(row.get("transaction_type", "")).strip().lower()
            txn_type = TYPE_MAP.get(raw_type, raw_type)
            if txn_type not in ("buy", "sell", "dividend"):
                errors.append(
                    f"Hoja '{chosen_sheet_name}', fila {row_num}: tipo de operación desconocido '{raw_type}'."
                )
                continue

            # Parse quantity
            try:
                quantity = Decimal(str(row["quantity"]))
                if quantity <= 0:
                    raise ValueError("negative or zero")
            except (InvalidOperation, ValueError, TypeError):
                errors.append(
                    f"Hoja '{chosen_sheet_name}', fila {row_num}: cantidad inválida."
                )
                continue

            # Parse unit price
            try:
                unit_price = Decimal(str(row["unit_price"]))
                if unit_price < 0:
                    raise ValueError("negative")
            except (InvalidOperation, ValueError, TypeError):
                errors.append(
                    f"Hoja '{chosen_sheet_name}', fila {row_num}: precio unitario inválido."
                )
                continue

            # Parse commission (optional, default 0)
            try:
                commission = Decimal(str(row.get("commission", 0) or 0))
            except (InvalidOperation, TypeError):
                commission = Decimal("0")
                warnings.append(
                    f"Hoja '{chosen_sheet_name}', fila {row_num}: comisión inválida, usando 0."
                )

            # Parse total invested (or compute)
            # The Excel column may contain unevaluated formulas like "=D3*E3+F3"
            raw_total = row.get("total_invested", 0)
            raw_total_str = str(raw_total).strip() if pd.notna(raw_total) else ""
            if raw_total_str.startswith("=") or not raw_total_str:
                # Formula string or empty — compute from quantity/price/commission
                total_inv = quantity * unit_price + commission
            else:
                try:
                    total_inv = Decimal(raw_total_str)
                    if total_inv <= 0:
                        total_inv = quantity * unit_price + commission
                except (InvalidOperation, TypeError):
                    total_inv = quantity * unit_price + commission

            notes = str(row.get("notes", "")) if pd.notna(row.get("notes")) else None

            # Find or create asset
            asset = db.query(Asset).filter(Asset.ticker == ticker).first()
            if asset is None:
                asset = Asset(
                    ticker=ticker,
                    name=ticker,
                    asset_type=Asset.determine_type(ticker),
                )
                db.add(asset)
                db.flush()

            # Check for duplicates
            existing = (
                db.query(Transaction)
                .filter(
                    Transaction.asset_id == asset.id,
                    Transaction.date == txn_date,
                    Transaction.quantity == quantity,
                    Transaction.unit_price == unit_price,
                )
                .first()
            )
            if existing:
                duplicates_skipped += 1
                warnings.append(
                    f"Hoja '{chosen_sheet_name}', fila {row_num}: duplicado, omitido."
                )
                continue

            txn = Transaction(
                asset_id=asset.id,
                transaction_type=txn_type,
                quantity=quantity,
                unit_price=unit_price,
                commission=commission,
                total_invested=total_inv,
                notes=notes,
                date=txn_date,
            )
            db.add(txn)
            total_imported += 1

        except Exception as e:
            errors.append(
                f"Hoja '{chosen_sheet_name}', fila {row_num}: error inesperado: {str(e)}"
            )
            continue

    if total_imported > 0:
        db.commit()
    else:
        db.rollback()

    return {
        "sheets_processed": 1,
        "total_imported": total_imported,
        "errors": errors,
        "warnings": warnings,
        "duplicates_skipped": duplicates_skipped,
    }
