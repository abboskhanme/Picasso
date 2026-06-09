"""Test sozlamalari — alohida `*_test` bazasida ishlaydi (asosiy ma'lumotga tegmaydi).

Har bir test oldidan barcha jadvallar TRUNCATE qilinadi, shuning uchun testlar
bir-biriga ta'sir qilmaydi (servislar ichida db.commit() chaqirilsa ham).
"""
import pytest
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

from app.config import settings
from app.database import Base
from app import models  # noqa: F401  — metadata'ni to'ldirish uchun


def _test_url() -> str:
    url = settings.DATABASE_URL
    base, _, name = url.rpartition("/")
    return f"{base}/{name}_test"


def _ensure_test_db() -> None:
    """Asosiy bazaga ulanib, mavjud bo'lmasa test bazasini yaratadi."""
    admin = create_engine(settings.DATABASE_URL, isolation_level="AUTOCOMMIT")
    test_name = _test_url().rpartition("/")[2]
    with admin.connect() as c:
        exists = c.execute(text("SELECT 1 FROM pg_database WHERE datname = :n"), {"n": test_name}).scalar()
        if not exists:
            c.execute(text(f'CREATE DATABASE "{test_name}"'))
    admin.dispose()


_ensure_test_db()
_engine = create_engine(_test_url())
Base.metadata.create_all(bind=_engine)
TestSession = sessionmaker(bind=_engine, autoflush=False, autocommit=False)


@pytest.fixture()
def db():
    s = TestSession()
    tables = ", ".join(f'"{t.name}"' for t in Base.metadata.sorted_tables)
    s.execute(text(f"TRUNCATE {tables} RESTART IDENTITY CASCADE"))
    s.commit()
    try:
        yield s
    finally:
        s.rollback()
        s.close()
