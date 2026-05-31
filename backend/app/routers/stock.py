import uuid
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from .. import models, schemas
from ..database import get_db
from ..deps import get_current_user

router = APIRouter(prefix="/stock", tags=["stock"], dependencies=[Depends(get_current_user)])


# ---------- Ro'yxat (xomashyo yoki qadoqlash) ----------
@router.get("/raw", response_model=list[schemas.RawMaterialOut])
def list_raw(
    category: str | None = Query(default=None, description="xomashyo | qadoqlash"),
    db: Session = Depends(get_db),
):
    q = db.query(models.RawMaterial).filter_by(is_active=True)
    if category:
        q = q.filter(models.RawMaterial.category == category)
    return q.order_by(models.RawMaterial.name).all()


# ---------- Yangi yozuv qo'shish (kirimsiz) ----------
@router.post("/raw", response_model=schemas.RawMaterialOut)
def create_raw(data: schemas.RawCreate, db: Session = Depends(get_db)):
    rm = models.RawMaterial(**data.model_dump())
    db.add(rm); db.commit(); db.refresh(rm)
    return rm


# ---------- Tahrirlash ----------
@router.patch("/raw/{rid}", response_model=schemas.RawMaterialOut)
def update_raw(rid: uuid.UUID, data: schemas.RawUpdate, db: Session = Depends(get_db)):
    rm = db.get(models.RawMaterial, rid)
    if not rm:
        raise HTTPException(404, "Topilmadi")
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(rm, k, v)
    db.commit(); db.refresh(rm)
    return rm


# ---------- Arxivlash ----------
@router.delete("/raw/{rid}")
def archive_raw(rid: uuid.UUID, db: Session = Depends(get_db)):
    rm = db.get(models.RawMaterial, rid)
    if not rm:
        raise HTTPException(404, "Topilmadi")
    rm.is_active = False
    db.commit()
    return {"ok": True}


# ---------- Kirim (sotib olish) ----------
@router.post("/raw/buy", response_model=schemas.RawMaterialOut)
def buy_raw(data: schemas.RawBuy, db: Session = Depends(get_db)):
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
    rm.stock = float(rm.stock) + data.qty
    db.add(models.RawMaterialMovement(material_id=rm.id, move_type="buy", qty=data.qty, cost=data.cost))
    if data.cost:
        cat_note = "Qadoqlash" if rm.category == "qadoqlash" else "Xom ashyo"
        db.add(models.CashFlow(direction="out", amount=data.cost, category=cat_note,
                               note=f"{rm.name} sotib olindi"))
    db.commit(); db.refresh(rm)
    return rm


# ---------- Sarflash ----------
@router.post("/raw/use", response_model=schemas.RawMaterialOut)
def use_raw(data: schemas.RawUse, db: Session = Depends(get_db)):
    rm = db.get(models.RawMaterial, data.material_id)
    if not rm:
        raise HTTPException(404, "Topilmadi")
    if float(rm.stock) < data.qty:
        raise HTTPException(400, f"Omborda {rm.stock} {rm.unit} bor")
    rm.stock = float(rm.stock) - data.qty
    db.add(models.RawMaterialMovement(material_id=rm.id, move_type="use", qty=data.qty, note=data.note))
    db.commit(); db.refresh(rm)
    return rm
