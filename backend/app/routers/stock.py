import uuid
from datetime import datetime, timezone, timedelta, date
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_
from .. import models, schemas
from ..database import get_db
from ..deps import get_current_user
from ..services import inventory_service as inv

router = APIRouter(prefix="/stock", tags=["stock"], dependencies=[Depends(get_current_user)])


# ============================================================
#  Xomashyo / qadoqlash ro'yxati va CRUD
# ============================================================
@router.get("/raw", response_model=list[schemas.RawMaterialOut])
def list_raw(category: str | None = Query(default=None), db: Session = Depends(get_db)):
    q = db.query(models.RawMaterial).filter_by(is_active=True)
    if category:
        q = q.filter(models.RawMaterial.category == category)
    return q.order_by(models.RawMaterial.name).all()


@router.post("/raw", response_model=schemas.RawMaterialOut)
def create_raw(data: schemas.RawCreate, user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    payload = data.model_dump()
    initial = float(payload.pop("stock", 0) or 0)
    rm = models.RawMaterial(stock=0, **payload)
    db.add(rm); db.flush()
    if initial > 0:
        inv.apply_movement(db, item=rm, item_type="raw", delta=initial, move_type="adjust",
                           note="Boshlang'ich qoldiq", created_by=user.id)
    db.commit(); db.refresh(rm)
    return rm


@router.patch("/raw/{rid}", response_model=schemas.RawMaterialOut)
def update_raw(rid: uuid.UUID, data: schemas.RawUpdate, db: Session = Depends(get_db)):
    rm = db.get(models.RawMaterial, rid)
    if not rm:
        raise HTTPException(404, "Topilmadi")
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(rm, k, v)
    db.commit(); db.refresh(rm)
    return rm


@router.delete("/raw/{rid}")
def archive_raw(rid: uuid.UUID, db: Session = Depends(get_db)):
    rm = db.get(models.RawMaterial, rid)
    if not rm:
        raise HTTPException(404, "Topilmadi")
    rm.is_active = False
    db.commit()
    return {"ok": True}


@router.post("/raw/buy", response_model=schemas.RawMaterialOut)
def buy_raw(data: schemas.RawBuy, user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    if data.material_id:
        rm = db.get(models.RawMaterial, data.material_id)
        if not rm:
            raise HTTPException(404, "Topilmadi")
    else:
        if not data.name:
            raise HTTPException(400, "Nom kiriting")
        rm = db.query(models.RawMaterial).filter(models.RawMaterial.name.ilike(data.name)).first()
        if not rm:
            rm = models.RawMaterial(name=data.name, category=data.category, unit=data.unit, stock=0)
            db.add(rm); db.flush()
    inv.buy_raw(db, item=rm, qty=data.qty, cost=data.cost,
                expiry_date=data.expiry_date, note=data.note, created_by=user.id,
                occurred_at=data.occurred_at)
    db.commit(); db.refresh(rm)
    return rm


@router.post("/raw/use", response_model=schemas.RawMaterialOut)
def use_raw(data: schemas.RawUse, user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    rm = db.get(models.RawMaterial, data.material_id)
    if not rm:
        raise HTTPException(404, "Topilmadi")
    inv.use_raw(db, item=rm, qty=data.qty, note=data.note, created_by=user.id,
                occurred_at=data.occurred_at)
    db.commit(); db.refresh(rm)
    return rm


# ============================================================
#  Inventarizatsiya va brak (har ikkala tur uchun)
# ============================================================
@router.post("/count")
def stock_count(data: schemas.StockCount, user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    item = inv.get_item(db, data.item_type, data.item_id)
    inv.adjust(db, item=item, item_type=data.item_type, actual_qty=data.actual_qty,
               note=data.note or "Inventarizatsiya", created_by=user.id,
               occurred_at=data.occurred_at)
    db.commit()
    return {"ok": True, "stock": float(item.stock)}


@router.post("/writeoff")
def stock_writeoff(data: schemas.WriteOff, user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    item = inv.get_item(db, data.item_type, data.item_id)
    inv.writeoff(db, item=item, item_type=data.item_type, qty=data.qty,
                 note=data.note or "Brak / yo'qotish", created_by=user.id,
                 occurred_at=data.occurred_at)
    db.commit()
    return {"ok": True, "stock": float(item.stock)}


# ============================================================
#  Tayyor mahsulot qoldig'ini qo'lda o'zgartirish (jurnal bilan)
# ============================================================
@router.post("/product/{pid}/adjust", response_model=schemas.ProductOut)
def product_adjust(pid: uuid.UUID, data: schemas.StockUpdate,
                   user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    p = db.get(models.Product, pid)
    if not p:
        raise HTTPException(404, "Mahsulot topilmadi")
    if data.mode == "set":
        inv.adjust(db, item=p, item_type="product", actual_qty=data.qty,
                   note="Qoldiq o'rnatildi", created_by=user.id, occurred_at=data.occurred_at)
    else:
        inv.apply_movement(db, item=p, item_type="product", delta=data.qty, move_type="manual",
                           note="Qo'lda kirim", created_by=user.id, allow_negative=True,
                           occurred_at=data.occurred_at)
    db.commit(); db.refresh(p)
    return p


# ============================================================
#  Harakatlar tarixi (jurnal) — sana / tur / element bo'yicha filtr
# ============================================================
@router.get("/movements", response_model=list[schemas.MovementOut])
def list_movements(
    item_type: str | None = Query(default=None),
    item_id: uuid.UUID | None = Query(default=None),
    move_type: str | None = Query(default=None),
    date_from: date | None = Query(default=None),
    date_to: date | None = Query(default=None),
    limit: int = Query(default=200, le=1000),
    db: Session = Depends(get_db),
):
    q = db.query(models.InventoryMovement)
    if item_type:
        q = q.filter(models.InventoryMovement.item_type == item_type)
    if item_id:
        q = q.filter(models.InventoryMovement.item_id == item_id)
    if move_type:
        q = q.filter(models.InventoryMovement.move_type == move_type)
    if date_from:
        q = q.filter(models.InventoryMovement.occurred_at >= datetime.combine(date_from, datetime.min.time(), tzinfo=timezone.utc))
    if date_to:
        q = q.filter(models.InventoryMovement.occurred_at < datetime.combine(date_to + timedelta(days=1), datetime.min.time(), tzinfo=timezone.utc))
    return q.order_by(models.InventoryMovement.occurred_at.desc()).limit(limit).all()


@router.delete("/movements/{mid}")
def remove_movement(mid: uuid.UUID, db: Session = Depends(get_db)):
    """Jurnal yozuvini o'chiradi — stok va bog'liq kassa yozuvi orqaga qaytadi.
    Sotuv/ishlab chiqarishga bog'liq yozuvlar ota yozuvi orqali o'chiriladi."""
    mv = db.get(models.InventoryMovement, mid)
    if not mv:
        raise HTTPException(404, "Yozuv topilmadi")
    inv.delete_movement(db, mv)
    db.commit()
    return {"ok": True}


# ============================================================
#  Retsept (BOM)
# ============================================================
def _recipe_cost(db: Session, lines: list[models.ProductRecipe]) -> int:
    total = 0
    for r in lines:
        mat = db.get(models.RawMaterial, r.material_id)
        if mat:
            total += int(round(float(mat.unit_price or 0) * float(r.qty)))
    return total


@router.get("/recipe/{pid}", response_model=schemas.RecipeOut)
def get_recipe(pid: uuid.UUID, db: Session = Depends(get_db)):
    lines = db.query(models.ProductRecipe).filter_by(product_id=pid).all()
    return schemas.RecipeOut(
        product_id=pid,
        items=[schemas.RecipeLineOut.model_validate(l) for l in lines],
        cost_estimate=_recipe_cost(db, lines),
    )


@router.put("/recipe/{pid}", response_model=schemas.RecipeOut)
def set_recipe(pid: uuid.UUID, data: schemas.RecipeSet, db: Session = Depends(get_db)):
    p = db.get(models.Product, pid)
    if not p:
        raise HTTPException(404, "Mahsulot topilmadi")
    db.query(models.ProductRecipe).filter_by(product_id=pid).delete()
    for it in data.items:
        db.add(models.ProductRecipe(product_id=pid, material_id=it.material_id, qty=it.qty))
    db.commit()
    lines = db.query(models.ProductRecipe).filter_by(product_id=pid).all()
    return schemas.RecipeOut(
        product_id=pid,
        items=[schemas.RecipeLineOut.model_validate(l) for l in lines],
        cost_estimate=_recipe_cost(db, lines),
    )


# ============================================================
#  Ishlab chiqarish
# ============================================================
@router.post("/produce", response_model=schemas.ProductionOut)
def produce(data: schemas.ProduceIn, user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    product = db.get(models.Product, data.product_id)
    if not product:
        raise HTTPException(404, "Mahsulot topilmadi")
    prod = inv.produce(db, product=product, qty=data.qty, expiry_date=data.expiry_date,
                       note=data.note, created_by=user.id, occurred_at=data.occurred_at)
    db.commit(); db.refresh(prod)
    return prod


@router.delete("/productions/{pid}")
def remove_production(pid: uuid.UUID, db: Session = Depends(get_db)):
    """Ishlab chiqarishni o'chiradi — xomashyo qaytadi, tayyor mahsulot kirimi bekor bo'ladi."""
    prod = db.get(models.Production, pid)
    if not prod:
        raise HTTPException(404, "Yozuv topilmadi")
    inv.delete_production(db, prod)
    db.commit()
    return {"ok": True}


@router.get("/productions", response_model=list[schemas.ProductionOut])
def list_productions(limit: int = Query(default=100, le=500), db: Session = Depends(get_db)):
    return db.query(models.Production).order_by(models.Production.occurred_at.desc()).limit(limit).all()


# ============================================================
#  Partiya / muddat
# ============================================================
@router.get("/batches", response_model=list[schemas.BatchOut])
def list_batches(
    expiring_days: int | None = Query(default=None, description="N kun ichida muddati o'tadiganlar"),
    db: Session = Depends(get_db),
):
    q = db.query(models.Batch).filter(models.Batch.is_active.is_(True), models.Batch.qty_remaining > 0)
    if expiring_days is not None:
        limit_date = date.today() + timedelta(days=expiring_days)
        q = q.filter(models.Batch.expiry_date.isnot(None), models.Batch.expiry_date <= limit_date)
    return q.order_by(models.Batch.expiry_date.is_(None), models.Batch.expiry_date.asc()).all()


# ============================================================
#  Reorder — min_stock dan past tushganlar uchun buyurtma tavsiyasi
# ============================================================
@router.get("/reorder", response_model=list[schemas.ReorderOut])
def reorder(db: Session = Depends(get_db)):
    out: list[schemas.ReorderOut] = []
    # Xomashyo + qadoqlash
    raws = db.query(models.RawMaterial).filter(
        models.RawMaterial.is_active, models.RawMaterial.stock <= models.RawMaterial.min_stock
    ).all()
    for r in raws:
        target = float(r.min_stock) * 2  # min ning 2 barobarigacha to'ldirish tavsiyasi
        sug = max(target - float(r.stock), 0)
        out.append(schemas.ReorderOut(
            item_type="raw", item_id=r.id, name=r.name, unit=r.unit, stock=float(r.stock),
            min_stock=float(r.min_stock), suggested_qty=round(sug, 3),
            unit_price=int(r.unit_price or 0), est_cost=int(round((r.unit_price or 0) * sug)),
        ))
    # Tayyor mahsulot
    prods = db.query(models.Product).filter(
        models.Product.is_active, models.Product.stock <= models.Product.min_stock
    ).all()
    for p in prods:
        target = float(p.min_stock) * 2
        sug = max(target - float(p.stock), 0)
        out.append(schemas.ReorderOut(
            item_type="product", item_id=p.id, name=p.name, unit=p.unit, stock=float(p.stock),
            min_stock=float(p.min_stock), suggested_qty=round(sug, 2),
            unit_price=int(p.cost_price or 0), est_cost=int(round((p.cost_price or 0) * sug)),
        ))
    return out
