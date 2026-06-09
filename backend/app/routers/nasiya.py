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
    """Qarzi bor mijozlar ro'yxati — bitta guruhli so'rovda (N+1 yo'q).
    Har mijoz uchun nasiya jami va to'langan jami subso'rovlar bilan hisoblanadi."""
    nasiya_sub = (
        db.query(
            models.Sale.customer_id.label("cid"),
            func.coalesce(func.sum(models.Sale.total), 0).label("nasiya"),
        )
        .filter(models.Sale.payment_method == "nasiya", models.Sale.customer_id.isnot(None))
        .group_by(models.Sale.customer_id)
        .subquery()
    )
    paid_sub = (
        db.query(
            models.NasiyaPayment.customer_id.label("cid"),
            func.coalesce(func.sum(models.NasiyaPayment.amount), 0).label("paid"),
        )
        .group_by(models.NasiyaPayment.customer_id)
        .subquery()
    )
    rows = (
        db.query(models.Customer, nasiya_sub.c.nasiya, paid_sub.c.paid)
        .join(nasiya_sub, models.Customer.id == nasiya_sub.c.cid)     # faqat nasiyasi borlar
        .outerjoin(paid_sub, models.Customer.id == paid_sub.c.cid)
        .all()
    )
    return [
        schemas.CustomerBalanceOut(
            customer_id=c.id, name=c.name, phone=c.phone,
            total_nasiya=int(nasiya), total_paid=int(paid or 0),
            debt=int(nasiya) - int(paid or 0),
        )
        for c, nasiya, paid in rows
    ]


@router.post("/{customer_id}/pay")
def pay(customer_id: uuid.UUID, data: schemas.NasiyaPay, db: Session = Depends(get_db)):
    c = db.get(models.Customer, customer_id)
    if not c:
        raise HTTPException(404, "Mijoz topilmadi")
    debt = _debt(db, customer_id)
    if data.amount > debt:
        raise HTTPException(400, "To'lov qarzdan ko'p")
    payment = models.NasiyaPayment(customer_id=customer_id, amount=data.amount, note=data.note)
    if data.occurred_at:
        payment.occurred_at = data.occurred_at
    db.add(payment); db.flush()
    cf = models.CashFlow(direction="in", amount=data.amount, category="Nasiya",
                         note=f"{c.name} nasiya to'lovi",
                         ref_type="nasiya", ref_id=payment.id)
    if data.occurred_at:
        cf.occurred_at = data.occurred_at
    db.add(cf)
    db.commit()
    return {"ok": True, "remaining": debt - data.amount}
