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
    db.add(pset); db.commit(); db.refresh(pset)
    return pset


@router.delete("/{sid}")
def archive_set(sid: uuid.UUID, db: Session = Depends(get_db)):
    s = db.get(models.ProductSet, sid)
    if not s:
        raise HTTPException(404, "To'plam topilmadi")
    s.is_active = False
    db.commit()
    return {"ok": True}
