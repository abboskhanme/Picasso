import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from .. import models, schemas
from ..database import get_db
from ..deps import require_owner
from ..logging_config import logger

# Moliya bo'limi — to'liq egasi/administrator huquqini talab qiladi
router = APIRouter(prefix="/finance", tags=["finance"], dependencies=[Depends(require_owner)])


@router.get("/cash-flows", response_model=list[schemas.CashFlowOut])
def cash_flows(db: Session = Depends(get_db)):
    return db.query(models.CashFlow).order_by(models.CashFlow.occurred_at.desc()).limit(200).all()


@router.post("/cash-flows", response_model=schemas.CashFlowOut)
def add_cash_flow(data: schemas.CashFlowCreate, db: Session = Depends(get_db)):
    payload = data.model_dump(exclude_none=True)
    cf = models.CashFlow(**payload)
    db.add(cf); db.commit(); db.refresh(cf)
    return cf


@router.delete("/cash-flows/{cid}")
def remove_cash_flow(cid: uuid.UUID, db: Session = Depends(get_db)):
    """Kassa yozuvini o'chiradi. Bog'liq transaksiyalar ham orqaga qaytadi:
    - sotuv tushumi → sotuvni o'chirish kerak (bu yerda bloklanadi)
    - ombor xaridi chiqimi → ombor kirimini o'chirish kerak (bloklanadi)
    - nasiya to'lovi → to'lov ham o'chadi (qarz tiklanadi)
    """
    cf = db.get(models.CashFlow, cid)
    if not cf:
        raise HTTPException(404, "Yozuv topilmadi")
    if cf.sale_id:
        raise HTTPException(400, "Bu yozuv sotuvga bog'liq — Sotuvlar bo'limida sotuvni o'chiring, hammasi birga qaytadi")
    if cf.ref_type == "movement":
        raise HTTPException(400, "Bu yozuv ombor kirimiga bog'liq — Harakatlar tarixida o'sha kirimni o'chiring, hammasi birga qaytadi")
    if cf.ref_type == "nasiya" and cf.ref_id:
        p = db.get(models.NasiyaPayment, cf.ref_id)
        if p:
            db.delete(p)  # to'lov bekor → mijoz qarzi tiklanadi
    db.delete(cf)
    db.commit()
    logger.info("Kassa yozuvi o'chirildi id=%s yo'nalish=%s summa=%s", cid, cf.direction, cf.amount)
    return {"ok": True}


@router.get("/balance")
def balance(db: Session = Depends(get_db)):
    inc = db.query(func.coalesce(func.sum(models.CashFlow.amount), 0)).filter_by(direction="in").scalar()
    out = db.query(func.coalesce(func.sum(models.CashFlow.amount), 0)).filter_by(direction="out").scalar()
    return {"balance": int(inc) - int(out), "total_in": int(inc), "total_out": int(out)}
