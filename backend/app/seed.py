"""Boshlang'ich test ma'lumotlari — BARCHA bo'limlar uchun namunaviy, o'zaro bog'liq dataset.

SEED_ON_START=true bo'lsa va baza bo'sh bo'lsa ishlaydi.

Bu seed haqiqiy biznes-logikani (services) ishlatadi, shuning uchun barcha stok
qoldiqlari, kassa harakatlari va nasiya qarzlari o'zaro mos keladi:

  Xarid (buy)  →  Ishlab chiqarish (produce, retsept bo'yicha xomashyo sarfi)
               →  Sotuv (naqd / karta / nasiya)  →  Nasiya to'lovi
               →  Brak (writeoff)  →  Inventarizatsiya (adjust)  →  Kassa xarajatlari

Barcha yozuvlar oxirgi ~35 kunga taqsimlangan, shu sababli Dashboard
(haftalik grafik, oylik tushum, top mahsulotlar) jonli ko'rinadi.
"""
from datetime import datetime, timedelta, timezone
from sqlalchemy.orm import Session

from . import models, schemas
from .core.security import hash_password
from .services import inventory_service as inv
from .services import sale_service


# ---------------------------------------------------------------- yordamchilar
def _days_ago(n: int, hour: int = 12) -> datetime:
    """n kun oldingi sana (UTC, soat bilan)."""
    return (datetime.now(timezone.utc) - timedelta(days=n)).replace(
        hour=hour, minute=0, second=0, microsecond=0
    )


def _retime(db: Session, ref_id, when: datetime) -> None:
    """Berilgan ref_id ga tegishli harakat/kassa yozuvlarini orqaga sanaga ko'chiradi."""
    for mv in db.query(models.InventoryMovement).filter_by(ref_id=ref_id).all():
        mv.occurred_at = when
    for cf in db.query(models.CashFlow).filter_by(sale_id=ref_id).all():
        cf.occurred_at = when


# ---------------------------------------------------------------- asosiy seed
def seed(db: Session) -> None:
    if db.query(models.User).first():
        return  # allaqachon seed qilingan

    # =========================================================== 1) Foydalanuvchilar
    owner = models.User(
        email="admin@picasso.uz", full_name="Picasso Egasi",
        hashed_password=hash_password("admin123"), role="owner",
    )
    seller = models.User(
        email="sotuvchi@picasso.uz", full_name="Dilnoza Karimova",
        hashed_password=hash_password("sotuvchi123"), role="seller",
    )
    db.add_all([owner, seller])
    db.flush()

    # =========================================================== 2) Mahsulotlar
    # stock=0 — barcha qoldiq ishlab chiqarishdan keladi (ombor jurnali to'liq izohli bo'lsin)
    P = {}
    product_defs = [
        ("sut",     "Sut shokoladi",         "🍫", 15000, "Sutli shokolad plitka, 80g",      "Plitka",  10, "dona"),
        ("qora",    "Qora shokolad 70%",     "🍬", 18000, "Achchiq qora shokolad, 80g",       "Plitka",  10, "dona"),
        ("bodom",   "Oq shokolad bodomli",   "🤍", 22000, "Oq shokolad + bodom, 90g",         "Plitka",   5, "dona"),
        ("yongoq",  "Oq shokolad yong'oqli", "🥜", 23000, "Oq shokolad + yong'oq, 90g",       "Plitka",   5, "dona"),
        ("truffel", "Lavender truffel",      "🟣", 25000, "Lavanda ta'mli truffel, 6 dona",   "Truffel",  8, "quti"),
        ("savol",   "Shirin savol to'plami", "🎁", 35000, "Sovg'a qutisi, aralash shokolad",  "Sovg'a",   5, "quti"),
    ]
    for key, name, emoji, price, desc, cat, minst, unit in product_defs:
        p = models.Product(
            name=name, emoji=emoji, price=price, cost_price=0,
            description=desc, category=cat, stock=0, min_stock=minst, unit=unit,
        )
        db.add(p)
        P[key] = p
    db.flush()

    # =========================================================== 3) Xomashyo + qadoqlash
    R = {}
    raw_defs = [
        ("kakao",    "Kakao kukuni",      "xomashyo",  "kg",    36000,  2,   "muddatli"),
        ("qand",     "Shakar (qand)",     "xomashyo",  "kg",     9000,  2,   None),
        ("moy",      "Kakao moyi",        "xomashyo",  "kg",    83000,  1,   "muddatli"),
        ("sut_kuk",  "Sut kukuni",        "xomashyo",  "kg",    62000,  2,   "muddatli"),
        ("bodom_x",  "Bodom mag'zi",      "xomashyo",  "kg",    95000,  1,   "muddatli"),
        ("yongoq_x", "Yong'oq mag'zi",    "xomashyo",  "kg",    78000,  1,   "muddatli"),
        ("lavanda",  "Lavanda ekstrakti", "xomashyo",  "litr", 120000,  0.5, None),
        ("quti",     "Sovg'a qutisi",     "qadoqlash", "dona",   3000, 50,   None),
        ("lenta",    "Lenta (tasma)",     "qadoqlash", "metr",    500, 50,   None),
        ("folga",    "Folga o'rami",      "qadoqlash", "dona",    400, 50,   None),
        ("stiker",   "Stiker (yorliq)",   "qadoqlash", "dona",    200, 50,   None),
    ]
    for key, name, cat, unit, price, minst, _tag in raw_defs:
        m = models.RawMaterial(
            name=name, category=cat, unit=unit, unit_price=price,
            stock=0, min_stock=minst,
        )
        db.add(m)
        R[key] = m
    db.flush()

    # =========================================================== 4) Retseptlar (BOM)
    # 1 dona tayyor mahsulotga ketadigan xomashyo/qadoqlash miqdori
    recipes = {
        "sut":     [("kakao", 0.020), ("sut_kuk", 0.030), ("qand", 0.025), ("moy", 0.015), ("folga", 1), ("stiker", 1)],
        "qora":    [("kakao", 0.045), ("moy", 0.025), ("qand", 0.010), ("folga", 1), ("stiker", 1)],
        "bodom":   [("moy", 0.030), ("sut_kuk", 0.020), ("qand", 0.020), ("bodom_x", 0.020), ("folga", 1), ("stiker", 1)],
        "yongoq":  [("moy", 0.030), ("sut_kuk", 0.020), ("qand", 0.020), ("yongoq_x", 0.020), ("folga", 1), ("stiker", 1)],
        "truffel": [("kakao", 0.030), ("moy", 0.025), ("qand", 0.020), ("lavanda", 0.002), ("quti", 1), ("lenta", 0.5), ("stiker", 1)],
        "savol":   [("kakao", 0.040), ("sut_kuk", 0.030), ("moy", 0.030), ("qand", 0.030), ("quti", 1), ("lenta", 1.2), ("stiker", 2)],
    }
    for pkey, lines in recipes.items():
        for mkey, qty in lines:
            db.add(models.ProductRecipe(product_id=P[pkey].id, material_id=R[mkey].id, qty=qty))
    db.flush()

    # =========================================================== 5) Xomashyo xaridlari (buy)
    # (xomashyo, miqdor, narx so'm, muddat(kun keyin) yoki None, necha kun oldin)
    purchases = [
        ("kakao",    14,  14 * 36000,  None, 32),
        ("sut_kuk",  14,  14 * 62000,  365,  32),
        ("moy",      12,  12 * 83000,  365,  30),
        ("qand",     16,  16 * 9000,   None, 30),
        ("bodom_x",  3,   3 * 95000,   180,  28),
        ("yongoq_x", 3,   3 * 78000,   180,  28),
        ("lavanda",  1,   1 * 120000,  540,  28),
        ("quti",     200, 200 * 3000,  None, 27),
        ("lenta",    300, 300 * 500,   None, 27),
        ("folga",    600, 600 * 400,   None, 27),
        ("stiker",   800, 800 * 200,   None, 27),
        ("kakao",    6,   6 * 37000,   None, 9),   # qo'shimcha to'ldirish xaridi
        ("moy",      8,   8 * 84000,   365,  9),
    ]
    for mkey, qty, cost, exp_days, days in purchases:
        mat = R[mkey]
        when = _days_ago(days, hour=10)
        unit_cost = int(round(cost / qty))
        inv.apply_movement(
            db, item=mat, item_type="raw", delta=qty, move_type="buy",
            unit_cost=unit_cost, cost=cost, ref_type="purchase",
            note=f"{mat.name} yetkazib beruvchidan", occurred_at=when, created_by=owner.id,
        )
        if exp_days:
            inv.create_batch(
                db, item=mat, item_type="raw", qty=qty, unit_cost=unit_cost,
                expiry_date=(when.date() + timedelta(days=exp_days)),
                note="Xarid partiyasi",
            )
        cat = "Qadoqlash" if mat.category == "qadoqlash" else "Xom ashyo"
        db.add(models.CashFlow(
            direction="out", amount=cost, category=cat,
            note=f"{mat.name} sotib olindi", occurred_at=when,
        ))
    db.flush()

    # =========================================================== 6) Ishlab chiqarish (produce)
    # (mahsulot, miqdor, muddat(kun keyin), necha kun oldin)
    productions = [
        ("sut",     150, 240, 22),
        ("qora",    100, 240, 22),
        ("bodom",    70, 180, 20),
        ("yongoq",    8, 180, 20),   # ataylab kam — low-stock ogohlantirishini sinash uchun
        ("truffel",  80,  60, 14),
        ("savol",    45,  90, 12),
        ("sut",      60, 240, 6),   # qo'shimcha partiya
        ("truffel",  40,  60, 4),
    ]
    for pkey, qty, exp_days, days in productions:
        prod = P[pkey]
        when = _days_ago(days, hour=14)
        production = inv.produce(
            db, product=prod, qty=qty,
            expiry_date=(when.date() + timedelta(days=exp_days)),
            note=f"{prod.name} — partiya", created_by=owner.id,
        )
        db.flush()
        production.occurred_at = when
        _retime(db, production.id, when)
    db.flush()

    # =========================================================== 7) To'plamlar (sets)
    set1 = models.ProductSet(name="Romantik kecha", emoji="❤️", price=70000)
    set1.items = [
        models.ProductSetItem(product_id=P["truffel"].id, qty=1),
        models.ProductSetItem(product_id=P["bodom"].id, qty=1),
        models.ProductSetItem(product_id=P["sut"].id, qty=1),
    ]
    set2 = models.ProductSet(name="Bayram seti", emoji="🎉", price=95000)
    set2.items = [
        models.ProductSetItem(product_id=P["savol"].id, qty=1),
        models.ProductSetItem(product_id=P["qora"].id, qty=2),
        models.ProductSetItem(product_id=P["yongoq"].id, qty=1),
    ]
    db.add_all([set1, set2])
    db.flush()

    db.commit()  # baza tayyor — endi sotuvlar (har biri alohida tranzaksiya)

    # =========================================================== 8) Sotuvlar (naqd/karta/nasiya)
    # (kun_oldin, to'lov, kind, payload, mijoz, tel)
    sales_plan = [
        (28, "naqd",   "dona", [("sut", 2), ("qora", 1)], None, None),
        (27, "karta",  "dona", [("truffel", 1)], None, None),
        (26, "nasiya", "dona", [("savol", 1), ("bodom", 1)], "Aziza Yusupova", "+998901112233"),
        (24, "naqd",   "set",  "set1", None, None),
        (22, "naqd",   "dona", [("sut", 3)], None, None),
        (21, "karta",  "dona", [("yongoq", 2), ("bodom", 1)], None, None),
        (20, "nasiya", "dona", [("truffel", 2)], "Bobur Aliyev", "+998901112244"),
        (18, "naqd",   "dona", [("qora", 2)], None, None),
        (17, "karta",  "set",  "set2", None, None),
        (15, "naqd",   "dona", [("sut", 1), ("truffel", 1)], None, None),
        (14, "nasiya", "dona", [("savol", 2)], "Aziza Yusupova", "+998901112233"),
        (12, "karta",  "dona", [("bodom", 2)], None, None),
        (11, "naqd",   "dona", [("sut", 2), ("qora", 1), ("yongoq", 1)], None, None),
        (9,  "naqd",   "set",  "set1", None, None),
        (8,  "karta",  "dona", [("truffel", 1)], None, None),
        (7,  "nasiya", "dona", [("qora", 3)], "Bobur Aliyev", "+998901112244"),
        (6,  "naqd",   "dona", [("sut", 2)], None, None),
        (5,  "karta",  "dona", [("bodom", 1), ("yongoq", 1)], None, None),
        (4,  "naqd",   "dona", [("truffel", 2)], None, None),
        (3,  "naqd",   "set",  "set2", None, None),
        (2,  "karta",  "dona", [("sut", 1)], None, None),
        (1,  "naqd",   "dona", [("qora", 1), ("truffel", 1)], None, None),
        (0,  "naqd",   "dona", [("sut", 2), ("bodom", 1)], None, None),
        (0,  "karta",  "dona", [("truffel", 1)], None, None),
        (0,  "naqd",   "set",  "set1", None, None),
    ]
    sets_map = {"set1": set1, "set2": set2}
    for days, pay, kind, payload, cust, phone in sales_plan:
        when = _days_ago(days, hour=16)
        if kind == "set":
            data = schemas.SaleCreate(
                kind="set", set_id=sets_map[payload].id, payment_method=pay,
                customer_name=cust, customer_phone=phone,
            )
        else:
            items = [
                schemas.SaleItemIn(product_id=P[k].id, qty=q, unit_price=P[k].price)
                for k, q in payload
            ]
            data = schemas.SaleCreate(
                kind="dona", payment_method=pay, items=items,
                customer_name=cust, customer_phone=phone,
            )
        sale = sale_service.create_sale(db, data)
        sale.occurred_at = when
        _retime(db, sale.id, when)
        db.commit()

    # =========================================================== 9) Nasiya to'lovlari (qisman)
    aziza = db.query(models.Customer).filter_by(phone="+998901112233").first()
    bobur = db.query(models.Customer).filter_by(phone="+998901112244").first()
    if aziza:
        db.add(models.NasiyaPayment(customer_id=aziza.id, amount=50000, note="Qisman to'lov",
                                    occurred_at=_days_ago(10)))
        db.add(models.CashFlow(direction="in", amount=50000, category="Nasiya",
                               note=f"{aziza.name} nasiya to'lovi", occurred_at=_days_ago(10)))
    if bobur:
        db.add(models.NasiyaPayment(customer_id=bobur.id, amount=30000, note="Qisman to'lov",
                                    occurred_at=_days_ago(5)))
        db.add(models.CashFlow(direction="in", amount=30000, category="Nasiya",
                               note=f"{bobur.name} nasiya to'lovi", occurred_at=_days_ago(5)))
    db.commit()

    # =========================================================== 10) Brak (writeoff) + inventarizatsiya
    inv.writeoff(db, item=P["bodom"], item_type="product", qty=2,
                 note="Qadoqlash shikastlangan", created_by=owner.id)
    inv.writeoff(db, item=R["sut_kuk"], item_type="raw", qty=0.2,
                 note="Namlikdan buzildi", created_by=owner.id)
    inv.adjust(db, item=R["qand"], item_type="raw",
               actual_qty=float(R["qand"].stock) - 0.3,
               note="Oylik inventarizatsiya — kamomad", created_by=owner.id)
    db.commit()

    # =========================================================== 11) Operatsion kassa xarajatlari
    db.add_all([
        models.CashFlow(direction="in", amount=15000000, category="Investitsiya",
                        note="Boshlang'ich kapital", occurred_at=_days_ago(35)),
        models.CashFlow(direction="out", amount=2500000, category="Ijara",
                        note="Do'kon ijarasi (oylik)", occurred_at=_days_ago(25)),
        models.CashFlow(direction="out", amount=3000000, category="Oylik",
                        note="Xodimlar oyligi", occurred_at=_days_ago(20)),
        models.CashFlow(direction="out", amount=450000, category="Kommunal",
                        note="Svet/suv/gaz", occurred_at=_days_ago(18)),
        models.CashFlow(direction="out", amount=300000, category="Marketing",
                        note="Instagram reklama", occurred_at=_days_ago(15)),
        models.CashFlow(direction="out", amount=180000, category="Transport",
                        note="Yetkazib berish yoqilg'isi", occurred_at=_days_ago(6)),
    ])
    db.commit()

    print("[seed] Namunaviy ma'lumotlar muvaffaqiyatli yuklandi ✓")
