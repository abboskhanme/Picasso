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
    imgs = {p.name: p.image_url for p in db.query(models.Product.name, models.Product.image_url).all()}
    top = [{"name": r[0], "emoji": r[1], "image_url": imgs.get(r[0]), "revenue": int(r[2]), "qty": float(r[3])} for r in rows]

    low = db.query(models.Product).filter(models.Product.is_active, models.Product.stock <= models.Product.min_stock).all()

    # 30 kunlik sotuv trendi
    start30 = today - timedelta(days=29)
    daily_map: dict = {}
    for s in sales:
        d = s.occurred_at.date()
        if d >= start30:
            e = daily_map.setdefault(d, {"revenue": 0, "count": 0})
            e["revenue"] += s.total
            e["count"] += 1
    daily_sales = []
    for i in range(30):
        d = start30 + timedelta(days=i)
        e = daily_map.get(d, {"revenue": 0, "count": 0})
        daily_sales.append({"date": d.isoformat(), "revenue": int(e["revenue"]), "count": e["count"]})

    # to'lov usullari taqsimoti (joriy oy)
    pm: dict = {}
    for s in month_sales:
        pm[s.payment_method] = pm.get(s.payment_method, 0) + s.total
    payment_methods = [{"method": k, "value": int(v)} for k, v in sorted(pm.items(), key=lambda x: -x[1])]

    # kunlik kirim/chiqim (oxirgi 14 kun)
    start14 = today - timedelta(days=13)
    flows = db.query(models.CashFlow).filter(models.CashFlow.occurred_at >= datetime.combine(start14, datetime.min.time(), tzinfo=timezone.utc)).all()
    cf_map: dict = {}
    for f in flows:
        d = f.occurred_at.date()
        if d >= start14:
            e = cf_map.setdefault(d, {"in": 0, "out": 0})
            e[f.direction] += f.amount
    cashflow_daily = []
    for i in range(14):
        d = start14 + timedelta(days=i)
        e = cf_map.get(d, {"in": 0, "out": 0})
        cashflow_daily.append({"date": d.isoformat(), "in": int(e["in"]), "out": int(e["out"])})

    # o'tgan oy bilan solishtirish (shu kungacha)
    prev_month_end = month_start - timedelta(days=1)
    prev_month_start = prev_month_end.replace(day=1)
    try:
        prev_cutoff = prev_month_start.replace(day=today.day)
    except ValueError:
        prev_cutoff = prev_month_end
    prev_revenue = sum(s.total for s in sales if prev_month_start <= s.occurred_at.date() <= min(prev_cutoff, prev_month_end))

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
        "low_stock": [{"name": p.name, "emoji": p.emoji, "image_url": p.image_url, "stock": float(p.stock), "unit": p.unit} for p in low],
        "daily_sales": daily_sales,
        "payment_methods": payment_methods,
        "cashflow_daily": cashflow_daily,
        "prev_month_revenue": int(prev_revenue),
    }
