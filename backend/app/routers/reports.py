from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from .. import models
from ..database import get_db
from ..deps import get_current_user

router = APIRouter(prefix="/reports", tags=["reports"], dependencies=[Depends(get_current_user)])


@router.get("/dashboard")
def dashboard(db: Session = Depends(get_db)):
    now = datetime.now(timezone.utc)
    today = now.date()
    month_start = today.replace(day=1)

    sales = db.query(models.Sale).all()
    today_sales = [s for s in sales if s.occurred_at.date() == today]
    month_sales = [s for s in sales if s.occurred_at.date() >= month_start]

    inc = db.query(func.coalesce(func.sum(models.CashFlow.amount), 0)).filter_by(direction="in").scalar()
    out = db.query(func.coalesce(func.sum(models.CashFlow.amount), 0)).filter_by(direction="out").scalar()

    # nasiya jami qarz
    nasiya = db.query(func.coalesce(func.sum(models.Sale.total), 0)).filter_by(payment_method="nasiya").scalar()
    paid = db.query(func.coalesce(func.sum(models.NasiyaPayment.amount), 0)).scalar()

    # haftalik
    week = []
    names = ["Ya", "Du", "Se", "Ch", "Pa", "Ju", "Sh"]
    for i in range(6, -1, -1):
        d = today - timedelta(days=i)
        v = sum(s.total for s in sales if s.occurred_at.date() == d)
        week.append({"day": names[d.weekday() if False else d.isoweekday() % 7], "value": int(v)})

    # top mahsulotlar
    rows = db.query(
        models.SaleItem.name_snapshot, models.SaleItem.emoji_snapshot,
        func.sum(models.SaleItem.line_total).label("rev"), func.sum(models.SaleItem.qty).label("qty"),
    ).group_by(models.SaleItem.name_snapshot, models.SaleItem.emoji_snapshot).order_by(func.sum(models.SaleItem.line_total).desc()).limit(5).all()
    top = [{"name": r[0], "emoji": r[1], "revenue": int(r[2]), "qty": float(r[3])} for r in rows]

    low = db.query(models.Product).filter(models.Product.is_active, models.Product.stock <= models.Product.min_stock).all()

    return {
        "today_revenue": int(sum(s.total for s in today_sales)),
        "today_count": len(today_sales),
        "month_revenue": int(sum(s.total for s in month_sales)),
        "balance": int(inc) - int(out),
        "month_in": int(inc),
        "month_out": int(out),
        "nasiya_total": int(nasiya) - int(paid),
        "week_sales": week,
        "top_products": top,
        "low_stock": [{"name": p.name, "emoji": p.emoji, "stock": float(p.stock), "unit": p.unit} for p in low],
    }
