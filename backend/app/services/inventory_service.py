"""Ombor biznes-logikasi — barcha stok o'zgarishlari shu yerdan o'tadi.

Markaziy g'oya: har qanday kirim/chiqim `apply_movement` orqali amalga oshadi.
U (1) item.stock ni yangilaydi, (2) InventoryMovement jurnaliga balance_after bilan
yozadi, (3) muddat bo'lsa partiya (Batch) bilan FEFO bo'yicha ishlaydi.

Shu tufayli keyinchalik istalgan davr bo'yicha harakatlar tarixini va istalgan
vaqtdagi qoldiqni (balance_after) ko'rib chiqish mumkin.
"""
import uuid
from datetime import date, datetime
from fastapi import HTTPException
from sqlalchemy.orm import Session
from .. import models

# Stok manbai (item_type -> model)
_MODEL = {"product": models.Product, "raw": models.RawMaterial}

# Chiqim hisoblanadigan harakat turlari (delta < 0 bo'lishi kerak)
OUT_TYPES = {"use", "sale", "writeoff"}
IN_TYPES = {"buy", "produce", "return"}


def get_item(db: Session, item_type: str, item_id: uuid.UUID):
    model = _MODEL.get(item_type)
    if not model:
        raise HTTPException(400, "Noto'g'ri element turi")
    item = db.get(model, item_id)
    if not item:
        raise HTTPException(404, "Element topilmadi")
    return item


def apply_movement(
    db: Session,
    *,
    item,
    item_type: str,
    delta: float,
    move_type: str,
    unit_cost: int = 0,
    cost: int = 0,
    ref_type: str | None = None,
    ref_id: uuid.UUID | None = None,
    note: str | None = None,
    created_by: uuid.UUID | None = None,
    occurred_at: datetime | None = None,
    allow_negative: bool = False,
) -> models.InventoryMovement:
    """Stokni o'zgartiradi va jurnalga yozadi. delta ishorali (+ kirim, - chiqim)."""
    delta = float(delta)
    new_stock = float(item.stock) + delta
    if new_stock < -1e-9 and not allow_negative:
        raise HTTPException(400, f"Omborda yetarli emas: {item.name} ({item.stock} {getattr(item, 'unit', '')})")

    item.stock = new_stock
    mv = models.InventoryMovement(
        item_type=item_type,
        item_id=item.id,
        item_name=item.name,
        item_category=getattr(item, "category", None),
        unit=getattr(item, "unit", None),
        move_type=move_type,
        delta=delta,
        balance_after=new_stock,
        unit_cost=int(unit_cost or 0),
        cost=int(cost or 0),
        ref_type=ref_type,
        ref_id=ref_id,
        note=note,
        created_by=created_by,
    )
    if occurred_at:
        mv.occurred_at = occurred_at
    db.add(mv)
    return mv


# ---------------- Partiya / muddat (FEFO) ----------------
def create_batch(
    db: Session,
    *,
    item,
    item_type: str,
    qty: float,
    unit_cost: int = 0,
    production_date: date | None = None,
    expiry_date: date | None = None,
    note: str | None = None,
) -> models.Batch:
    b = models.Batch(
        item_type=item_type,
        item_id=item.id,
        item_name=item.name,
        qty_initial=qty,
        qty_remaining=qty,
        unit=getattr(item, "unit", None),
        production_date=production_date,
        expiry_date=expiry_date,
        unit_cost=int(unit_cost or 0),
        note=note,
    )
    db.add(b)
    return b


def consume_fefo(db: Session, item_type: str, item_id: uuid.UUID, qty: float) -> None:
    """Partiyalardan eng yaqin muddatlisidan boshlab (FEFO) yechib boradi.
    Partiya bo'lmasa hech narsa qilmaydi (stok baribir apply_movement da hisoblangan)."""
    qty = float(qty)
    if qty <= 0:
        return
    batches = (
        db.query(models.Batch)
        .filter(
            models.Batch.item_type == item_type,
            models.Batch.item_id == item_id,
            models.Batch.is_active.is_(True),
            models.Batch.qty_remaining > 0,
        )
        .order_by(models.Batch.expiry_date.is_(None), models.Batch.expiry_date.asc())
        .all()
    )
    remaining = qty
    for b in batches:
        if remaining <= 1e-9:
            break
        take = min(float(b.qty_remaining), remaining)
        b.qty_remaining = float(b.qty_remaining) - take
        if b.qty_remaining <= 1e-9:
            b.is_active = False
        remaining -= take


# ---------------- Yuqori darajadagi amallar ----------------
def buy_raw(
    db: Session,
    *,
    item,
    qty: float,
    cost: int,
    expiry_date: date | None = None,
    note: str | None = None,
    created_by: uuid.UUID | None = None,
):
    """Xomashyo/qadoqlash kirimi: stok +, kassa chiqimi, partiya (muddat bo'lsa)."""
    unit_cost = int(round(cost / qty)) if qty else 0
    apply_movement(
        db, item=item, item_type="raw", delta=qty, move_type="buy",
        unit_cost=unit_cost, cost=cost,
        ref_type="purchase", note=note, created_by=created_by,
    )
    if expiry_date:
        create_batch(db, item=item, item_type="raw", qty=qty, unit_cost=unit_cost,
                     expiry_date=expiry_date, note=note)
    if cost:
        cat = "Qadoqlash" if getattr(item, "category", "") == "qadoqlash" else "Xom ashyo"
        db.add(models.CashFlow(direction="out", amount=cost, category=cat,
                               note=f"{item.name} sotib olindi"))


def use_raw(db: Session, *, item, qty: float, note: str | None = None,
            ref_type: str | None = None, ref_id: uuid.UUID | None = None,
            created_by: uuid.UUID | None = None):
    """Xomashyo sarfi: stok -, jurnal, FEFO partiya yechimi."""
    apply_movement(db, item=item, item_type="raw", delta=-abs(qty), move_type="use",
                   note=note, ref_type=ref_type, ref_id=ref_id, created_by=created_by)
    consume_fefo(db, "raw", item.id, abs(qty))


def writeoff(db: Session, *, item, item_type: str, qty: float, note: str | None = None,
             created_by: uuid.UUID | None = None):
    """Brak / muddati o'tgan / yo'qotish: stok -, jurnal."""
    apply_movement(db, item=item, item_type=item_type, delta=-abs(qty),
                   move_type="writeoff", note=note, created_by=created_by)
    consume_fefo(db, item_type, item.id, abs(qty))


def adjust(db: Session, *, item, item_type: str, actual_qty: float, note: str | None = None,
           created_by: uuid.UUID | None = None):
    """Inventarizatsiya: real sanab chiqilgan miqdorga moslaydi (delta = actual - joriy)."""
    delta = float(actual_qty) - float(item.stock)
    if abs(delta) < 1e-9:
        return None
    return apply_movement(db, item=item, item_type=item_type, delta=delta,
                          move_type="adjust", note=note, created_by=created_by,
                          allow_negative=True)


def produce(
    db: Session,
    *,
    product: "models.Product",
    qty: float,
    expiry_date: date | None = None,
    note: str | None = None,
    created_by: uuid.UUID | None = None,
) -> models.Production:
    """Ishlab chiqarish: retsept bo'yicha xomashyo sarflanadi, tayyor mahsulot oshadi,
    tannarx hisoblanadi va product.cost_price yangilanadi."""
    recipes = db.query(models.ProductRecipe).filter_by(product_id=product.id).all()
    if not recipes:
        raise HTTPException(400, "Bu mahsulot uchun retsept belgilanmagan")

    # 1) Yetarlilikni tekshirish
    cost_total = 0
    for r in recipes:
        mat = db.get(models.RawMaterial, r.material_id)
        if not mat:
            raise HTTPException(404, "Retseptdagi xomashyo topilmadi")
        need = float(r.qty) * float(qty)
        if float(mat.stock) < need - 1e-9:
            raise HTTPException(400, f"Xomashyo yetarli emas: {mat.name} (kerak {need:g}, bor {mat.stock:g} {mat.unit})")

    prod = models.Production(product_id=product.id, product_name=product.name, qty=qty, note=note, created_by=created_by)
    db.add(prod)
    db.flush()  # prod.id

    # 2) Xomashyoni sarflash
    for r in recipes:
        mat = db.get(models.RawMaterial, r.material_id)
        need = float(r.qty) * float(qty)
        line_cost = int(round(float(mat.unit_price or 0) * need))
        cost_total += line_cost
        apply_movement(db, item=mat, item_type="raw", delta=-need, move_type="use",
                       unit_cost=int(mat.unit_price or 0), cost=line_cost,
                       ref_type="production", ref_id=prod.id, created_by=created_by,
                       note=f"{product.name} i.ch.")
        consume_fefo(db, "raw", mat.id, need)

    # 3) Tayyor mahsulotni kirim qilish
    unit_cost = int(round(cost_total / float(qty))) if qty else 0
    apply_movement(db, item=product, item_type="product", delta=qty, move_type="produce",
                   unit_cost=unit_cost, cost=cost_total, ref_type="production", ref_id=prod.id,
                   created_by=created_by, note=note)
    if expiry_date:
        create_batch(db, item=product, item_type="product", qty=qty, unit_cost=unit_cost,
                     production_date=date.today(), expiry_date=expiry_date, note=note)

    # 4) Tannarxni yangilash
    prod.cost_total = cost_total
    prod.unit_cost = unit_cost
    if unit_cost:
        product.cost_price = unit_cost
    return prod
