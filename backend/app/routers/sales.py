import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from .. import models, schemas
from ..database import get_db
from ..deps import get_current_user, require_owner
from ..services.sale_service import create_sale, delete_sale
from ..logging_config import logger

router = APIRouter(prefix="/sales", tags=["sales"], dependencies=[Depends(get_current_user)])


@router.get("", response_model=list[schemas.SaleOut])
def list_sales(db: Session = Depends(get_db)):
    return db.query(models.Sale).order_by(models.Sale.occurred_at.desc()).limit(200).all()


@router.post("", response_model=schemas.SaleOut)
def add_sale(data: schemas.SaleCreate, user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    sale = create_sale(db, data)
    logger.info("Sotuv yaratildi id=%s total=%s usul=%s by=%s", sale.id, sale.total, sale.payment_method, user.email)
    return sale


@router.delete("/{sid}")
def remove_sale(sid: uuid.UUID, user: models.User = Depends(require_owner), db: Session = Depends(get_db)):
    """Sotuvni o'chiradi — stok, kassa va nasiya ta'sirlari orqaga qaytadi."""
    sale = db.get(models.Sale, sid)
    if not sale:
        raise HTTPException(404, "Sotuv topilmadi")
    delete_sale(db, sale)
    logger.info("Sotuv o'chirildi id=%s total=%s by=%s", sid, sale.total, user.email)
    return {"ok": True}
