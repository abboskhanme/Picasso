"""O'lchov birliklari va ular orasidagi mutanosib (proportional) konvertatsiya.

Bir o'lchamdagi (dimension) birliklar o'zaro aylantiriladi:
kg ↔ gramm, litr ↔ ml, metr ↔ sm. Har bir birlik shu o'lchamning kanonik
bazasiga nisbatan koeffitsient bilan belgilanadi (masalan, 1 kg = 1000 gramm).

Maqsad: xomashyo omborda bir birlikda tursa ham (un — kg), retseptda boshqa,
qulayroq birlikda kiritilishi mumkin (1 dona mahsulotga 5 gramm un). Sarflashda
va tannarx hisobida miqdor avtomatik xomashyoning ombor birligiga aylantiriladi.

dona / quti / paket kabi sanoq birliklari faqat o'ziga teng (aylantirilmaydi).
"""

# birlik nomi -> (o'lcham, kanonik bazaga koeffitsient)
_UNITS: dict[str, tuple[str, float]] = {
    # massa (baza: gramm)
    "gramm": ("mass", 1.0), "gr": ("mass", 1.0), "g": ("mass", 1.0),
    "kg": ("mass", 1000.0),
    # hajm (baza: ml)
    "ml": ("volume", 1.0),
    "litr": ("volume", 1000.0), "l": ("volume", 1000.0),
    # uzunlik (baza: sm)
    "sm": ("length", 1.0), "cm": ("length", 1.0),
    "metr": ("length", 100.0), "m": ("length", 100.0),
}


def _info(unit: str | None) -> tuple[str, float] | None:
    if not unit:
        return None
    return _UNITS.get(unit.strip().lower())


def compatible(a: str | None, b: str | None) -> bool:
    """a va b ni o'zaro aylantirib bo'ladimi (bir o'lchamdami)?"""
    ia, ib = _info(a), _info(b)
    if ia and ib:
        return ia[0] == ib[0]
    # noma'lum birliklar (dona, quti, paket, ...) faqat o'ziga teng
    return (a or "").strip().lower() == (b or "").strip().lower()


def convert(qty: float, from_unit: str | None, to_unit: str | None) -> float:
    """qty ni from_unit dan to_unit ga aylantiradi.

    Birliklar teng yoki biri ko'rsatilmagan bo'lsa qiymat o'zgarmaydi
    (retsept birligi bo'sh = xomashyo birligi bilan bir xil deb olinadi).
    Birliklar har xil o'lchamda bo'lsa ValueError ko'tariladi.
    """
    qty = float(qty)
    if not from_unit or not to_unit or from_unit == to_unit:
        return qty
    fi, ti = _info(from_unit), _info(to_unit)
    if fi and ti:
        if fi[0] != ti[0]:
            raise ValueError(f"'{from_unit}' va '{to_unit}' birliklari mos kelmaydi")
        return qty * fi[1] / ti[1]
    raise ValueError(f"'{from_unit}' va '{to_unit}' birliklari mos kelmaydi")
