"""Boshlang'ich test ma'lumotlari. SEED_ON_START=true bo'lsa va baza bo'sh bo'lsa ishlaydi."""
from sqlalchemy.orm import Session
from . import models
from .core.security import hash_password


def seed(db: Session) -> None:
    if db.query(models.User).first():
        return  # allaqachon seed qilingan

    db.add(models.User(
        email="admin@picasso.uz",
        full_name="Picasso Egasi",
        hashed_password=hash_password("admin123"),
        role="owner",
    ))

    products = [
        models.Product(name="Sut shokoladi", emoji="🍫", price=15000, cost_price=9000, description="Sutli shokolad, sof", category="Sutli", stock=50, min_stock=10, unit="dona"),
        models.Product(name="Qora shokolad", emoji="🍬", price=18000, cost_price=11000, description="Achchiq qora shokolad 70%", category="Qora", stock=8, min_stock=10, unit="dona"),
        models.Product(name="Oq shokolad bodomli", emoji="🤍", price=22000, cost_price=13000, description="Oq shokolad + bodom", category="Oq shokolad", stock=20, min_stock=5, unit="dona"),
        models.Product(name="Oq shokolad yong'oqli", emoji="🥜", price=23000, cost_price=13500, description="Oq shokolad + yong'oq", category="Oq shokolad", stock=18, min_stock=5, unit="dona"),
        models.Product(name="Lavender truffel", emoji="🟣", price=25000, cost_price=15000, description="Lavanda ta'mli truffel", category="Truffel", stock=30, min_stock=5, unit="dona"),
        models.Product(name="Shirin savol", emoji="🎁", price=35000, cost_price=20000, description="Aralash shokolad to'plami", category="To'plam", stock=15, min_stock=5, unit="quti"),
    ]
    db.add_all(products)

    db.add_all([
        # Xomashyo
        models.RawMaterial(name="Kakao kukuni", category="xomashyo", unit="kg", unit_price=36000, stock=4.5, min_stock=2),
        models.RawMaterial(name="Qand", category="xomashyo", unit="kg", unit_price=9000, stock=8, min_stock=2),
        models.RawMaterial(name="Kakao moyi", category="xomashyo", unit="kg", unit_price=83000, stock=2, min_stock=1),
        models.RawMaterial(name="Bodom", category="xomashyo", unit="kg", unit_price=95000, stock=3, min_stock=1),
        models.RawMaterial(name="Yong'oq", category="xomashyo", unit="kg", unit_price=78000, stock=2.5, min_stock=1),
        # Qadoqlash
        models.RawMaterial(name="Sovg'a qutisi", category="qadoqlash", unit="dona", unit_price=3000, stock=120, min_stock=30),
        models.RawMaterial(name="Lenta (tasma)", category="qadoqlash", unit="metr", unit_price=500, stock=200, min_stock=50),
        models.RawMaterial(name="Shtrix-kod varog'i", category="qadoqlash", unit="dona", unit_price=150, stock=300, min_stock=50),
        models.RawMaterial(name="Stiker (yorliq)", category="qadoqlash", unit="dona", unit_price=200, stock=250, min_stock=50),
    ])

    db.add(models.CashFlow(direction="in", amount=2000000, category="Investitsiya", note="Boshlang'ich kapital"))
    db.commit()
