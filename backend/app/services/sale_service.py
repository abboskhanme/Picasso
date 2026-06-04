"""Sotuv biznes-logikasi: stok kamayishi + kassa/nasiya — bitta tranzaksiyada."""
from fastapi import HTTPException
from sqlalchemy.orm import Session
from .. import models, schemas
from . import inventory_service as inv


def _consume_set_packaging(db: Session, sale: models.Sale, pset: models.ProductSet) -> None:
    """To'plam sotilganda qadoqlash materiallarining har biridan 1 dona ayiradi.

    Qadoqlash hisobi sotuvni to'xtatmasligi uchun qoldiq manfiy bo'lishiga
    ruxsat beriladi — kamomad ombor jurnalida ko'rinib turadi.
    """
    packaging = (
        db.query(models.RawMaterial)
        .filter_by(category="qadoqlash", is_active=True)
        .all()
    )
    for mat in packaging:
        unit_price = int(mat.unit_price or 0)
        inv.apply_movement(
            db, item=mat, item_type="raw", delta=-1.0, move_type="use",
            unit_cost=unit_price, cost=unit_price,
            ref_type="sale", ref_id=sale.id,
            note=f"To'plam qadoqlash: {pset.name}",
            allow_negative=True,
        )
        inv.consume_fefo(db, "raw", mat.id, 1.0)


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
        sale.items = []
        db.add(sale)
        db.flush()  # sale.id kerak (jurnal ref uchun)
        for it in pset.items:
            prod = db.get(models.Product, it.product_id)
            if not prod:
                continue
            inv.apply_movement(
                db, item=prod, item_type="product", delta=-float(it.qty), move_type="sale",
                unit_cost=int(prod.price), cost=int(round(prod.price * float(it.qty))),
                ref_type="sale", ref_id=sale.id, note=f"To'plam: {pset.name}",
            )
            inv.consume_fefo(db, "product", prod.id, float(it.qty))
            item_rows.append(models.SaleItem(
                product_id=prod.id, name_snapshot=prod.name, emoji_snapshot=prod.emoji,
                qty=it.qty, unit_price=int(prod.price), line_total=int(round(prod.price * float(it.qty))),
            ))
        # Har bir sotilgan to'plamga qadoqlash materiallaridan 1 donadan sarflanadi
        # (karobka, pergament, lenta, sticker, kraft sumkacha, shtrix kod va h.k.)
        _consume_set_packaging(db, sale, pset)
    else:
        if not data.items:
            raise HTTPException(400, "Mahsulot tanlanmagan")
        sale.items = []
        db.add(sale)
        db.flush()  # sale.id kerak
        for it in data.items:
            prod = db.get(models.Product, it.product_id)
            if not prod:
                raise HTTPException(404, "Mahsulot topilmadi")
            line = int(round(it.unit_price * float(it.qty)))
            total += line
            inv.apply_movement(
                db, item=prod, item_type="product", delta=-float(it.qty), move_type="sale",
                unit_cost=int(it.unit_price), cost=line, ref_type="sale", ref_id=sale.id,
            )
            inv.consume_fefo(db, "product", prod.id, float(it.qty))
            item_rows.append(models.SaleItem(
                product_id=prod.id, name_snapshot=prod.name, emoji_snapshot=prod.emoji,
                qty=it.qty, unit_price=it.unit_price, line_total=line,
            ))

    sale.total = total
    for row in item_rows:
        row.sale_id = sale.id
        db.add(row)

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
