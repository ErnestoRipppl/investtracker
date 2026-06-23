"""
Broker router — Full CRUD for broker management.
"""

from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.broker import Broker
from app.schemas.broker import BrokerCreate, BrokerResponse, BrokerUpdate

router = APIRouter(prefix="/api/brokers", tags=["brokers"])


@router.get("/", response_model=list[BrokerResponse])
def list_brokers(db: Session = Depends(get_db)) -> list[BrokerResponse]:
    """List all brokers."""
    brokers = db.query(Broker).order_by(Broker.name).all()
    return [BrokerResponse.model_validate(b) for b in brokers]


@router.get("/{broker_id}", response_model=BrokerResponse)
def get_broker(broker_id: int, db: Session = Depends(get_db)) -> BrokerResponse:
    """Get a single broker by ID."""
    broker = db.query(Broker).filter(Broker.id == broker_id).first()
    if broker is None:
        raise HTTPException(status_code=404, detail="Broker no encontrado.")
    return BrokerResponse.model_validate(broker)


@router.post("/", response_model=BrokerResponse, status_code=201)
def create_broker(
    data: BrokerCreate, db: Session = Depends(get_db)
) -> BrokerResponse:
    """Create a new broker."""
    broker = Broker(
        name=data.name,
        commission_type=data.commission_type,
        commission_fixed_eur=Decimal(str(data.commission_fixed_eur)),
        commission_pct=Decimal(str(data.commission_pct)),
        min_commission_eur=Decimal(str(data.min_commission_eur)),
        max_commission_eur=(
            Decimal(str(data.max_commission_eur))
            if data.max_commission_eur is not None
            else None
        ),
        custody_fee_annual_pct=Decimal(str(data.custody_fee_annual_pct)),
        fx_spread_pct=Decimal(str(data.fx_spread_pct)),
        is_default=data.is_default,
    )

    # If setting as default, unset other defaults
    if data.is_default:
        db.query(Broker).filter(Broker.is_default == True).update(
            {"is_default": False}
        )

    db.add(broker)
    db.commit()
    db.refresh(broker)
    return BrokerResponse.model_validate(broker)


@router.put("/{broker_id}", response_model=BrokerResponse)
def update_broker(
    broker_id: int,
    data: BrokerUpdate,
    db: Session = Depends(get_db),
) -> BrokerResponse:
    """Update a broker by ID."""
    broker = db.query(Broker).filter(Broker.id == broker_id).first()
    if broker is None:
        raise HTTPException(status_code=404, detail="Broker no encontrado.")

    update_data = data.model_dump(exclude_unset=True)

    for field, value in update_data.items():
        if field in (
            "commission_fixed_eur",
            "commission_pct",
            "min_commission_eur",
            "max_commission_eur",
            "custody_fee_annual_pct",
            "fx_spread_pct",
        ):
            setattr(broker, field, Decimal(str(value)) if value is not None else None)
        else:
            setattr(broker, field, value)

    # Handle default broker
    if update_data.get("is_default"):
        db.query(Broker).filter(
            Broker.id != broker_id, Broker.is_default == True
        ).update({"is_default": False})

    db.commit()
    db.refresh(broker)
    return BrokerResponse.model_validate(broker)


@router.delete("/{broker_id}", status_code=204)
def delete_broker(broker_id: int, db: Session = Depends(get_db)) -> None:
    """Delete a broker by ID."""
    broker = db.query(Broker).filter(Broker.id == broker_id).first()
    if broker is None:
        raise HTTPException(status_code=404, detail="Broker no encontrado.")

    db.delete(broker)
    db.commit()
