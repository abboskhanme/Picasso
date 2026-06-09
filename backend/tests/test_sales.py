"""Sotuv biznes-logikasi (sale_service) — stok, kassa va nasiya yaxlitligi."""
from app import models, schemas
from app.services.sale_service import create_sale, delete_sale


def _product(db, **kw):
    p = models.Product(name=kw.get("name", "Mahsulot"), price=kw.get("price", 5000),
                       unit="dona", stock=kw.get("stock", 10))
    db.add(p); db.flush()
    return p


def test_cash_sale_decrements_stock_and_records_income(db):
    p = _product(db, stock=10, price=5000)
    db.commit()
    data = schemas.SaleCreate(kind="dona", payment_method="naqd",
        items=[schemas.SaleItemIn(product_id=p.id, qty=3, unit_price=5000)])
    sale = create_sale(db, data)
    db.refresh(p)

    assert sale.total == 15000
    assert float(p.stock) == 7.0
    cf = db.query(models.CashFlow).filter_by(sale_id=sale.id).first()
    assert cf is not None and cf.amount == 15000 and cf.direction == "in"


def test_nasiya_sale_creates_customer_and_no_cash(db):
    p = _product(db, stock=10, price=5000)
    db.commit()
    data = schemas.SaleCreate(kind="dona", payment_method="nasiya",
        items=[schemas.SaleItemIn(product_id=p.id, qty=2, unit_price=5000)],
        customer_name="Ali", customer_phone="+998901234567")
    sale = create_sale(db, data)

    assert sale.total == 10000
    # nasiyada kassaga pul kirmaydi
    assert db.query(models.CashFlow).filter_by(sale_id=sale.id).count() == 0
    cust = db.query(models.Customer).filter_by(phone="+998901234567").first()
    assert cust is not None and sale.customer_id == cust.id


def test_delete_sale_reverts_stock_and_cash(db):
    p = _product(db, stock=10, price=5000)
    db.commit()
    data = schemas.SaleCreate(kind="dona", payment_method="naqd",
        items=[schemas.SaleItemIn(product_id=p.id, qty=4, unit_price=5000)])
    sale = create_sale(db, data)
    db.refresh(p)
    assert float(p.stock) == 6.0

    delete_sale(db, sale)
    db.refresh(p)
    assert float(p.stock) == 10.0   # stok qaytdi
    assert db.query(models.CashFlow).filter_by(sale_id=sale.id).count() == 0
