from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from .. import models
from ..database import get_db
from ..deps import get_current_user

router = APIRouter(prefix="/reports", tags=["reports"], dependencies=[Depends(get_current_user)])


def _utc_start(d) -> datetime:
    """Sana boshini (00:00 UTC) timestamp'ga aylantiradi — filtr chegaralari uchun."""
    return datetime.combine(d, datetime.min.time(), tzinfo=timezone.utc)


@router.get("/dashboard")
def dashboard(db: Session = Depends(get_db)):
    """Bosh sahifa ko'rsatkichlari — barcha hisob-kitoblar bazada (SQL agregatlari)
    bajariladi, sotuvlar xotiraga yuklanmaydi. Shu sabab katta hajmda ham tez ishlaydi."""
    now = datetime.now(timezone.utc)
    today = now.date()
    month_start = today.replace(day=1)
    sale_date = func.date(models.Sale.occurred_at)   # UTC kunига keltiradi (occurred_at UTC saqlanadi)

    # --- bugun / oy tushumi (alohida agregatlar) ---
    today_rev, today_cnt = db.query(
        func.coalesce(func.sum(models.Sale.total), 0), func.count(models.Sale.id)
    ).filter(models.Sale.occurred_at >= _utc_start(today)).one()
    month_rev = db.query(func.coalesce(func.sum(models.Sale.total), 0)).filter(
        models.Sale.occurred_at >= _utc_start(month_start)).scalar()

    # --- kassa balansi (jami) va nasiya qarzi ---
    inc = db.query(func.coalesce(func.sum(models.CashFlow.amount), 0)).filter_by(direction="in").scalar()
    out = db.query(func.coalesce(func.sum(models.CashFlow.amount), 0)).filter_by(direction="out").scalar()
    nasiya = db.query(func.coalesce(func.sum(models.Sale.total), 0)).filter_by(payment_method="nasiya").scalar()
    paid = db.query(func.coalesce(func.sum(models.NasiyaPayment.amount), 0)).scalar()

    # --- 30 kunlik kunlik tushum xaritasi (week ham shundan olinadi) ---
    start30 = today - timedelta(days=29)
    rev_rows = db.query(
        sale_date.label("d"),
        func.coalesce(func.sum(models.Sale.total), 0).label("rev"),
        func.count(models.Sale.id).label("cnt"),
    ).filter(models.Sale.occurred_at >= _utc_start(start30)).group_by(sale_date).all()
    rev_map = {r.d: (int(r.rev), int(r.cnt)) for r in rev_rows}

    names = ["Ya", "Du", "Se", "Ch", "Pa", "Ju", "Sh"]
    week = [{"day": names[(today - timedelta(days=i)).isoweekday() % 7],
             "value": rev_map.get(today - timedelta(days=i), (0, 0))[0]} for i in range(6, -1, -1)]
    daily_sales = [{"date": (start30 + timedelta(days=i)).isoformat(),
                    "revenue": rev_map.get(start30 + timedelta(days=i), (0, 0))[0],
                    "count": rev_map.get(start30 + timedelta(days=i), (0, 0))[1]} for i in range(30)]

    # --- top mahsulotlar ---
    rows = db.query(
        models.SaleItem.name_snapshot, models.SaleItem.emoji_snapshot,
        func.sum(models.SaleItem.line_total).label("rev"), func.sum(models.SaleItem.qty).label("qty"),
    ).group_by(models.SaleItem.name_snapshot, models.SaleItem.emoji_snapshot).order_by(func.sum(models.SaleItem.line_total).desc()).limit(5).all()
    imgs = {p.name: p.image_url for p in db.query(models.Product.name, models.Product.image_url).all()}
    top = [{"name": r[0], "emoji": r[1], "image_url": imgs.get(r[0]), "revenue": int(r[2]), "qty": float(r[3])} for r in rows]

    low = db.query(models.Product).filter(models.Product.is_active, models.Product.stock <= models.Product.min_stock).all()

    # --- to'lov usullari taqsimoti (joriy oy) ---
    pm_rows = db.query(
        models.Sale.payment_method, func.coalesce(func.sum(models.Sale.total), 0),
    ).filter(models.Sale.occurred_at >= _utc_start(month_start)).group_by(models.Sale.payment_method).all()
    payment_methods = [{"method": k, "value": int(v)} for k, v in sorted(pm_rows, key=lambda x: -x[1])]

    # --- kunlik kirim/chiqim (oxirgi 14 kun) ---
    start14 = today - timedelta(days=13)
    flow_date = func.date(models.CashFlow.occurred_at)
    cf_rows = db.query(
        flow_date.label("d"), models.CashFlow.direction,
        func.coalesce(func.sum(models.CashFlow.amount), 0).label("amt"),
    ).filter(models.CashFlow.occurred_at >= _utc_start(start14)).group_by(flow_date, models.CashFlow.direction).all()
    cf_map: dict = {}
    for r in cf_rows:
        cf_map.setdefault(r.d, {"in": 0, "out": 0})[r.direction] = int(r.amt)
    cashflow_daily = [{"date": (start14 + timedelta(days=i)).isoformat(),
                       "in": cf_map.get(start14 + timedelta(days=i), {}).get("in", 0),
                       "out": cf_map.get(start14 + timedelta(days=i), {}).get("out", 0)} for i in range(14)]

    # --- o'tgan oy bilan solishtirish (shu kungacha) ---
    prev_month_end = month_start - timedelta(days=1)
    prev_month_start = prev_month_end.replace(day=1)
    try:
        prev_cutoff = prev_month_start.replace(day=today.day)
    except ValueError:
        prev_cutoff = prev_month_end
    cutoff = min(prev_cutoff, prev_month_end)
    prev_revenue = db.query(func.coalesce(func.sum(models.Sale.total), 0)).filter(
        models.Sale.occurred_at >= _utc_start(prev_month_start),
        models.Sale.occurred_at < _utc_start(cutoff + timedelta(days=1)),
    ).scalar()

    return {
        "today_revenue": int(today_rev),
        "today_count": int(today_cnt),
        "month_revenue": int(month_rev),
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
