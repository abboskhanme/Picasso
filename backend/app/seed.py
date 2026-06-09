"""Boshlang'ich ma'lumotlar — real katalog.

Uch qism:
  seed(db)            — baza bo'sh bo'lsa: admin foydalanuvchi yaratadi (SEED_ON_START=true bo'lsa).
  purge_demo_data(db) — bir martalik: eski namunaviy (demo) mahsulot/xomashyo/to'plamlarni
                        o'chiradi. Demo seller hisobi mavjudligi belgi sifatida ishlatiladi,
                        shuning uchun faqat bir marta ishlaydi va real ma'lumotlarga tegmaydi.
  sync_catalog(db)    — har ishga tushganda: katalogda yetishmayotgan mahsulot va
                        qadoqlash materiallarini qo'shadi. Mavjud yozuvlarga TEGMAYDI,
                        shuning uchun foydalanuvchi kiritgan narx/qoldiqlar saqlanadi.
"""
from sqlalchemy.orm import Session

from . import models
from .core.security import hash_password
from .logging_config import logger


# (nomi, sotish narxi so'm)
PRODUCTS: list[tuple[str, int]] = [
    ("Qora shokolad bodomli",       5_900),
    ("Qora shokolad yong'oqli",     5_700),
    ("Oq shokolad malina",          5_580),
    ("Oq shokolad pistali",         5_910),
    ("Molochniy shokolad qulupnay", 5_115),
    ("Molochniy shokolad keshyu",   5_350),
]

# (nomi, dona narxi so'm) — har to'plam o'z qadoqlash retseptida qaysisidan
# nechtadan ketishini belgilaydi (To'plamlar bo'limida sozlanadi)
PACKAGING: list[tuple[str, int]] = [
    ("Karobka",             3_300),
    ("Pergament",             100),
    ("Lenta",               2_100),
    ("Sticker emblema",       200),
    ("Kraft sumkacha",      1_700),
    ("Shtrix kod stickeri",   110),
]

# Eski demo seed'dan qolgan namunaviy yozuvlar (nomi bo'yicha aniqlanadi)
_DEMO_PRODUCTS = [
    "Sut shokoladi", "Qora shokolad 70%", "Oq shokolad bodomli",
    "Oq shokolad yong'oqli", "Lavender truffel", "Shirin savol to'plami",
]
_DEMO_RAW = [
    "Kakao kukuni", "Shakar (qand)", "Kakao moyi", "Sut kukuni",
    "Bodom mag'zi", "Yong'oq mag'zi", "Lavanda ekstrakti",
    "Sovg'a qutisi", "Lenta (tasma)", "Folga o'rami", "Stiker (yorliq)",
]
_DEMO_SETS = ["Romantik kecha", "Bayram seti"]
_DEMO_USER = "sotuvchi@picasso.uz"  # faqat eski demo seed yaratgan — belgi sifatida ishlatiladi


def purge_demo_data(db: Session) -> None:
    """Eski namunaviy katalogni bir marta tozalaydi.

    Sotuv tarixiga tegmaydi (sale_items nom snapshot'lari saqlanadi),
    faqat demo mahsulot/xomashyo/to'plam va demo hisobni o'chiradi.
    """
    marker = db.query(models.User).filter_by(email=_DEMO_USER).first()
    if not marker:
        return  # demo ma'lumot yo'q yoki allaqachon tozalangan

    # 1) Demo to'plamlar
    for s in db.query(models.ProductSet).filter(models.ProductSet.name.in_(_DEMO_SETS)).all():
        db.query(models.Sale).filter_by(set_id=s.id).update({"set_id": None})
        db.delete(s)
    db.flush()

    # 2) Demo mahsulotlar (bog'liq yozuvlar bilan)
    for p in db.query(models.Product).filter(models.Product.name.in_(_DEMO_PRODUCTS)).all():
        db.query(models.SaleItem).filter_by(product_id=p.id).update({"product_id": None})
        db.query(models.ProductRecipe).filter_by(product_id=p.id).delete()
        db.query(models.ProductSetItem).filter_by(product_id=p.id).delete()
        db.query(models.Production).filter_by(product_id=p.id).delete()
        db.query(models.Batch).filter_by(item_type="product", item_id=p.id).delete()
        db.query(models.InventoryMovement).filter_by(item_type="product", item_id=p.id).delete()
        db.delete(p)
    db.flush()

    # 3) Demo xomashyo / qadoqlash
    for m in db.query(models.RawMaterial).filter(models.RawMaterial.name.in_(_DEMO_RAW)).all():
        db.query(models.ProductRecipe).filter_by(material_id=m.id).delete()
        db.query(models.RawMaterialMovement).filter_by(material_id=m.id).delete()
        db.query(models.Batch).filter_by(item_type="raw", item_id=m.id).delete()
        db.query(models.InventoryMovement).filter_by(item_type="raw", item_id=m.id).delete()
        db.delete(m)
    db.flush()

    # 4) Demo hisob (belgi) — o'chirilgach, tozalash boshqa takrorlanmaydi
    db.query(models.InventoryMovement).filter_by(created_by=marker.id).update({"created_by": None})
    db.query(models.Production).filter_by(created_by=marker.id).update({"created_by": None})
    db.delete(marker)

    db.commit()
    logger.info("[seed] Eski namunaviy katalog tozalandi")


def sync_catalog(db: Session) -> None:
    """Katalogdagi yetishmayotgan pozitsiyalarni qo'shadi (idempotent)."""
    existing_products = {name for (name,) in db.query(models.Product.name).all()}
    for name, price in PRODUCTS:
        if name not in existing_products:
            db.add(models.Product(
                name=name, emoji="🍫", price=price, cost_price=0,
                category="Shokolad", stock=0, min_stock=20, unit="dona",
            ))

    existing_raw = {name for (name,) in db.query(models.RawMaterial.name).all()}
    for name, price in PACKAGING:
        if name not in existing_raw:
            db.add(models.RawMaterial(
                name=name, category="qadoqlash", unit="dona",
                unit_price=price, stock=0, min_stock=20,
            ))

    db.commit()


def seed(db: Session) -> None:
    if db.query(models.User).first():
        return  # allaqachon sozlangan

    db.add(models.User(
        email="admin@picasso.uz", full_name="Picasso Admin",
        hashed_password=hash_password("admin123"), role="owner",
    ))
    db.commit()
    logger.info("[seed] Admin foydalanuvchi yaratildi (admin@picasso.uz)")
