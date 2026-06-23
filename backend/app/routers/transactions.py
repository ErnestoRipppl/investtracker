"""
Transactions router — CRUD for buy/sell/dividend transactions.
"""

from datetime import date as date_type
from decimal import Decimal
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.asset import Asset
from app.models.transaction import Transaction
from app.schemas.transaction import (
    TransactionCreate,
    TransactionListResponse,
    TransactionResponse,
    TransactionUpdate,
)
from app.utils.financial_math import total_invested_with_commission

router = APIRouter(prefix="/api/transactions", tags=["transactions"])


def _txn_to_response(txn: Transaction) -> TransactionResponse:
    """Convert a Transaction ORM object to response schema."""
    return TransactionResponse(
        id=txn.id,
        asset_id=txn.asset_id,
        ticker=txn.asset.ticker if txn.asset else "UNKNOWN",
        transaction_type=txn.transaction_type,
        quantity=float(txn.quantity),
        unit_price=float(txn.unit_price),
        commission=float(txn.commission),
        total_invested=float(txn.total_invested),
        notes=txn.notes,
        date=txn.date,
        broker_id=txn.broker_id,
        created_at=txn.created_at,
    )


@router.get("/", response_model=TransactionListResponse)
def list_transactions(
    ticker: Optional[str] = Query(None, description="Filter by ticker"),
    transaction_type: Optional[str] = Query(None, description="Filter by type"),
    start_date: Optional[date_type] = Query(None, description="Start date filter"),
    end_date: Optional[date_type] = Query(None, description="End date filter"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=500),
    db: Session = Depends(get_db),
) -> TransactionListResponse:
    """
    List transactions with optional filters.

    Supports filtering by ticker, transaction type, and date range.
    Results are paginated.
    """
    query = db.query(Transaction).join(Asset, Transaction.asset_id == Asset.id)

    if ticker:
        query = query.filter(Asset.ticker == ticker.upper())
    if transaction_type:
        query = query.filter(Transaction.transaction_type == transaction_type)
    if start_date:
        query = query.filter(Transaction.date >= start_date)
    if end_date:
        query = query.filter(Transaction.date <= end_date)

    total = query.count()
    transactions = query.order_by(Transaction.date.desc()).offset(skip).limit(limit).all()

    items = [_txn_to_response(t) for t in transactions]
    return TransactionListResponse(total=total, items=items)


@router.post("/", response_model=TransactionResponse, status_code=201)
def create_transaction(
    data: TransactionCreate,
    db: Session = Depends(get_db),
) -> TransactionResponse:
    """
    Create a new transaction.

    Automatically looks up or creates the asset by ticker.
    Calculates total_invested as (quantity * unit_price) + commission.
    """
    # Validate transaction type
    if data.transaction_type not in ("buy", "sell", "dividend"):
        raise HTTPException(
            status_code=400,
            detail=f"Tipo de transacción inválido: '{data.transaction_type}'. Usar: buy, sell, dividend.",
        )

    # Find or create asset
    ticker_upper = data.ticker.upper()
    asset = db.query(Asset).filter(Asset.ticker == ticker_upper).first()
    if asset is None:
        asset = Asset(
            ticker=ticker_upper,
            name=ticker_upper,
            asset_type=Asset.determine_type(ticker_upper),
        )
        db.add(asset)
        db.flush()

    quantity = Decimal(str(data.quantity))
    unit_price = Decimal(str(data.unit_price))
    commission = Decimal(str(data.commission))
    total = total_invested_with_commission(quantity, unit_price, commission)

    txn = Transaction(
        asset_id=asset.id,
        transaction_type=data.transaction_type,
        quantity=quantity,
        unit_price=unit_price,
        commission=commission,
        total_invested=total,
        notes=data.notes,
        date=data.date,
        broker_id=data.broker_id,
    )
    db.add(txn)
    db.commit()
    db.refresh(txn)

    return _txn_to_response(txn)


@router.put("/{transaction_id}", response_model=TransactionResponse)
def update_transaction(
    transaction_id: int,
    data: TransactionUpdate,
    db: Session = Depends(get_db),
) -> TransactionResponse:
    """Update an existing transaction by ID."""
    txn = db.query(Transaction).filter(Transaction.id == transaction_id).first()
    if txn is None:
        raise HTTPException(status_code=404, detail="Transacción no encontrada.")

    update_data = data.model_dump(exclude_unset=True)

    # Handle ticker change -> re-link asset
    if "ticker" in update_data:
        ticker_upper = update_data.pop("ticker").upper()
        asset = db.query(Asset).filter(Asset.ticker == ticker_upper).first()
        if asset is None:
            asset = Asset(ticker=ticker_upper, name=ticker_upper, asset_type=Asset.determine_type(ticker_upper))
            db.add(asset)
            db.flush()
        txn.asset_id = asset.id

    for field, value in update_data.items():
        if field in ("quantity", "unit_price", "commission"):
            setattr(txn, field, Decimal(str(value)))
        else:
            setattr(txn, field, value)

    # Recalculate total_invested
    txn.total_invested = total_invested_with_commission(
        txn.quantity, txn.unit_price, txn.commission
    )

    db.commit()
    db.refresh(txn)
    return _txn_to_response(txn)


@router.delete("/{transaction_id}", status_code=204)
def delete_transaction(
    transaction_id: int,
    db: Session = Depends(get_db),
) -> None:
    """Delete a transaction by ID."""
    txn = db.query(Transaction).filter(Transaction.id == transaction_id).first()
    if txn is None:
        raise HTTPException(status_code=404, detail="Transacción no encontrada.")

    db.delete(txn)
    db.commit()
