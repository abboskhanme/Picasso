import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from .. import models, schemas
from ..database import get_db
from ..deps import get_current_user, require_owner
from ..services import inventory_service as inv

router = APIRouter(prefix="/products", tags=["products"], dependencies=[Depends(get_current_user)])


@router.get("", response_model=list[schemas.ProductOut])
def list_products(db: Session = Depends(get_db)):
    return db.query(models.Product).filter_by(is_active=True).order_by(models.Product.name).all()


@router.post("", response_model=schemas.ProductOut)
def create_product(data: schemas.ProductCreate, user: models.User = Depends(require_owner), db: Session = Depends(get_db)):
    payload = data.model_dump()
    initial = float(payload.pop("stock", 0) or 0)
    p = models.Product(stock=0, **payload)
    db.add(p); db.flush()
    if initial > 0:
        inv.apply_movement(db, item=p, item_type="product", delta=initial, move_type="adjust",
                           note="Boshlang'ich qoldiq", created_by=user.id)
    db.commit(); db.refresh(p)
    return p


@router.patch("/{pid}", response_model=schemas.ProductOut)
def update_product(pid: uuid.UUID, data: schemas.ProductUpdate, _: models.User = Depends(require_owner), db: Session = Depends(get_db)):
    p = db.get(models.Product, pid)
    if not p:
        raise HTTPException(404, "Mahsulot topilmadi")
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(p, k, v)
    db.commit(); db.refresh(p)
    return p


@router.post("/{pid}/stock", response_model=schemas.ProductOut)
def update_stock(pid: uuid.UUID, data: schemas.StockUpdate,
                 user: models.User = Depends(require_owner), db: Session = Depends(get_db)):
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


@router.delete("/{pid}")
def archive_product(pid: uuid.UUID, _: models.User = Depends(require_owner), db: Session = Depends(get_db)):
    p = db.get(models.Product, pid)
    if not p:
        raise HTTPException(404, "Mahsulot topilmadi")
    p.is_active = False
    db.commit()
    return {"ok": True}
