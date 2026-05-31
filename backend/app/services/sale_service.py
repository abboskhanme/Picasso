"""Sotuv biznes-logikasi: stok kamayishi + kassa/nasiya — bitta tranzaksiyada."""
from fastapi import HTTPException
from sqlalchemy.orm import Session
from .. import models, schemas


def create_sale(db: Session, data: schemas.SaleCreate) -> models.Sale:
    sale = models.Sale(
        kind=data.kind,
        payment_method=data.payment_method,
        note=data.note,
        total=0,
    )

    total = 0
    item_rows: list[models.SaleItem] = []

    if data.kind == "set":
        if not data.set_id:
            raise HTTPException(400, "To'plam tanlanmagan")
        pset = db.get(models.ProductSet, data.set_id)
        if not pset:
            raise HTTPException(404, "To'plam topilmadi")
        if not pset.price:
            raise HTTPException(400, "To'plam narxi belgilanmagan")
        sale.set_id = pset.id
        total = pset.price
        # to'plam tarkibidagi har mahsulot stokini kamaytir
        for it in pset.items:
            prod = db.get(models.Product, it.product_id)
            if not prod:
                continue
            if float(prod.stock) < float(it.qty):
                raise HTTPException(400, f"Omborda yetarli emas: {prod.name}")
            prod.stock = float(prod.stock) - float(it.qty)
            item_rows.append(models.SaleItem(
                product_id=prod.id, name_snapshot=prod.name, emoji_snapshot=prod.emoji,
                qty=it.qty, unit_price=int(prod.price), line_total=int(round(prod.price * float(it.qty))),
            ))
    else:
        if not data.items:
            raise HTTPException(400, "Mahsulot tanlanmagan")
        for it in data.items:
            prod = db.get(models.Product, it.product_id)
            if not prod:
                raise HTTPException(404, "Mahsulot topilmadi")
            if float(prod.stock) < float(it.qty):
                raise HTTPException(400, f"Omborda yetarli emas: {prod.name} ({prod.stock} {prod.unit})")
            prod.stock = float(prod.stock) - float(it.qty)
            line = int(round(it.unit_price * float(it.qty)))
            total += line
            item_rows.append(models.SaleItem(
                product_id=prod.id, name_snapshot=prod.name, emoji_snapshot=prod.emoji,
                qty=it.qty, unit_price=it.unit_price, line_total=line,
            ))

    sale.total = total
    sale.items = item_rows
    db.add(sale)
    db.flush()  # sale.id kerak

    if data.payment_method == "nasiya":
        if not data.customer_name or not data.customer_phone:
            raise HTTPException(400, "Nasiya uchun mijoz ismi va telefoni kerak")
        customer = db.query(models.Customer).filter_by(phone=data.customer_phone).first()
        if not customer:
            customer = models.Customer(name=data.customer_name, phone=data.customer_phone)
            db.add(customer)
            db.flush()
        sale.customer_id = customer.id
        # nasiyada kassaga pul kirmaydi (keyin to'lanadi)
    else:
        db.add(models.CashFlow(
            direction="in", amount=total, category="Sotuv",
            note="Sotuv tushumi", sale_id=sale.id,
        ))

    db.commit()
    db.refresh(sale)
    return sale
