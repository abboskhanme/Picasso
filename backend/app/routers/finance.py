from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from .. import models, schemas
from ..database import get_db
from ..deps import get_current_user

router = APIRouter(prefix="/finance", tags=["finance"], dependencies=[Depends(get_current_user)])


@router.get("/cash-flows", response_model=list[schemas.CashFlowOut])
def cash_flows(db: Session = Depends(get_db)):
    return db.query(models.CashFlow).order_by(models.CashFlow.occurred_at.desc()).limit(200).all()


@router.post("/cash-flows", response_model=schemas.CashFlowOut)
def add_cash_flow(data: schemas.CashFlowCreate, db: Session = Depends(get_db)):
    cf = models.CashFlow(**data.model_dump())
    db.add(cf); db.commit(); db.refresh(cf)
    return cf


@router.get("/balance")
def balance(db: Session = Depends(get_db)):
    inc = db.query(func.coalesce(func.sum(models.CashFlow.amount), 0)).filter_by(direction="in").scalar()
    out = db.query(func.coalesce(func.sum(models.CashFlow.amount), 0)).filter_by(direction="out").scalar()
    return {"balance": int(inc) - int(out), "total_in": int(inc), "total_out": int(out)}
