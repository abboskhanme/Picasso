import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from .. import models, schemas
from ..database import get_db
from ..deps import get_current_user

router = APIRouter(prefix="/nasiya", tags=["nasiya"], dependencies=[Depends(get_current_user)])


def _debt(db: Session, customer_id) -> int:
    nasiya = db.query(func.coalesce(func.sum(models.Sale.total), 0)).filter(
        models.Sale.customer_id == customer_id, models.Sale.payment_method == "nasiya").scalar()
    paid = db.query(func.coalesce(func.sum(models.NasiyaPayment.amount), 0)).filter(
        models.NasiyaPayment.customer_id == customer_id).scalar()
    return int(nasiya) - int(paid)


@router.get("", response_model=list[schemas.CustomerBalanceOut])
def list_balances(db: Session = Depends(get_db)):
    out = []
    for c in db.query(models.Customer).all():
        nasiya = db.query(func.coalesce(func.sum(models.Sale.total), 0)).filter(
            models.Sale.customer_id == c.id, models.Sale.payment_method == "nasiya").scalar()
        paid = db.query(func.coalesce(func.sum(models.NasiyaPayment.amount), 0)).filter(
            models.NasiyaPayment.customer_id == c.id).scalar()
        if int(nasiya) == 0:
            continue
        out.append(schemas.CustomerBalanceOut(
            customer_id=c.id, name=c.name, phone=c.phone,
            total_nasiya=int(nasiya), total_paid=int(paid), debt=int(nasiya) - int(paid)))
    return out


@router.post("/{customer_id}/pay")
def pay(customer_id: uuid.UUID, data: schemas.NasiyaPay, db: Session = Depends(get_db)):
    c = db.get(models.Customer, customer_id)
    if not c:
        raise HTTPException(404, "Mijoz topilmadi")
    debt = _debt(db, customer_id)
    if data.amount > debt:
        raise HTTPException(400, "To'lov qarzdan ko'p")
    db.add(models.NasiyaPayment(customer_id=customer_id, amount=data.amount, note=data.note))
    db.add(models.CashFlow(direction="in", amount=data.amount, category="Nasiya",
                           note=f"{c.name} nasiya to'lovi"))
    db.commit()
    return {"ok": True, "remaining": debt - data.amount}
