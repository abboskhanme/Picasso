import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from .. import models, schemas
from ..database import get_db
from ..deps import get_current_user

router = APIRouter(prefix="/sets", tags=["sets"], dependencies=[Depends(get_current_user)])


@router.get("", response_model=list[schemas.SetOut])
def list_sets(db: Session = Depends(get_db)):
    return db.query(models.ProductSet).filter_by(is_active=True).all()


@router.post("", response_model=schemas.SetOut)
def create_set(data: schemas.SetCreate, db: Session = Depends(get_db)):
    if not data.items:
        raise HTTPException(400, "Kamida 1 ta mahsulot tanlang")
    pset = models.ProductSet(name=data.name, emoji=data.emoji, image_url=data.image_url, price=data.price)
    pset.items = [models.ProductSetItem(product_id=i.product_id, qty=i.qty) for i in data.items]
    pset.packaging = [models.ProductSetPackaging(material_id=p.material_id, qty=p.qty) for p in data.packaging]
    db.add(pset); db.commit(); db.refresh(pset)
    return pset


@router.put("/{sid}", response_model=schemas.SetOut)
def update_set(sid: uuid.UUID, data: schemas.SetUpdate, db: Session = Depends(get_db)):
    pset = db.get(models.ProductSet, sid)
    if not pset:
        raise HTTPException(404, "To'plam topilmadi")
    if not data.items:
        raise HTTPException(400, "Kamida 1 ta mahsulot tanlang")
    pset.name = data.name
    pset.emoji = data.emoji
    pset.image_url = data.image_url
    pset.price = data.price
    # tarkib va qadoqlashni to'liq almashtiramiz (cascade=delete-orphan eskilarini o'chiradi)
    pset.items = [models.ProductSetItem(product_id=i.product_id, qty=i.qty) for i in data.items]
    pset.packaging = [models.ProductSetPackaging(material_id=p.material_id, qty=p.qty) for p in data.packaging]
    db.commit(); db.refresh(pset)
    return pset


@router.delete("/{sid}")
def archive_set(sid: uuid.UUID, db: Session = Depends(get_db)):
    s = db.get(models.ProductSet, sid)
    if not s:
        raise HTTPException(404, "To'plam topilmadi")
    s.is_active = False
    db.commit()
    return {"ok": True}
