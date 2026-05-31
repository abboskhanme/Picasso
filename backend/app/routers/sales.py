from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from .. import models, schemas
from ..database import get_db
from ..deps import get_current_user
from ..services.sale_service import create_sale

router = APIRouter(prefix="/sales", tags=["sales"], dependencies=[Depends(get_current_user)])


@router.get("", response_model=list[schemas.SaleOut])
def list_sales(db: Session = Depends(get_db)):
    return db.query(models.Sale).order_by(models.Sale.occurred_at.desc()).limit(200).all()


@router.post("", response_model=schemas.SaleOut)
def add_sale(data: schemas.SaleCreate, db: Session = Depends(get_db)):
    return create_sale(db, data)
