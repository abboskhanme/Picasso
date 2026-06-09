"""Ishlab chiqarish (inventory_service.produce) — birlik konvertatsiyasi va tannarx."""
from app import models
from app.services import inventory_service as inv


def test_produce_converts_recipe_units(db):
    # Un omborda KG da, retseptda GRAMM da ishlatiladi
    un = models.RawMaterial(name="Un", category="xomashyo", unit="kg", unit_price=12000, stock=10)
    db.add(un); db.flush()
    prod = models.Product(name="Pechenye", price=5000, unit="dona", stock=0)
    db.add(prod); db.flush()
    db.add(models.ProductRecipe(product_id=prod.id, material_id=un.id, qty=50, unit="gramm"))
    db.commit()

    # 20 dona -> 20 * 50gr = 1000gr = 1kg un sarflanadi
    production = inv.produce(db, product=prod, qty=20)
    db.commit(); db.refresh(un); db.refresh(prod)

    assert float(un.stock) == 9.0            # 10 - 1 kg
    assert production.cost_total == 12000    # 1 kg * 12000
    assert production.unit_cost == 600       # 12000 / 20
    assert float(prod.stock) == 20.0
    assert prod.cost_price == 600            # tannarx yangilandi


def test_produce_without_recipe_fails(db):
    prod = models.Product(name="Bo'sh", price=1000, unit="dona", stock=0)
    db.add(prod); db.commit()
    import pytest
    from fastapi import HTTPException
    with pytest.raises(HTTPException):
        inv.produce(db, product=prod, qty=5)


def test_produce_insufficient_stock_fails(db):
    un = models.RawMaterial(name="Shakar", category="xomashyo", unit="kg", unit_price=8000, stock=0.5)
    db.add(un); db.flush()
    prod = models.Product(name="Tort", price=20000, unit="dona", stock=0)
    db.add(prod); db.flush()
    db.add(models.ProductRecipe(product_id=prod.id, material_id=un.id, qty=1, unit="kg"))
    db.commit()
    import pytest
    from fastapi import HTTPException
    with pytest.raises(HTTPException):
        inv.produce(db, product=prod, qty=1)   # 1 kg kerak, 0.5 bor
