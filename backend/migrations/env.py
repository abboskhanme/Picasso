"""Alembic muhiti — app modellaridan metadata va sozlamalardan DATABASE_URL oladi.

Faqat online rejim ishlatiladi (mavjud engine ulanishi orqali).
"""
from alembic import context

from app.database import Base, engine
from app import models  # noqa: F401  — modellarni metadata'ga ro'yxatga olish uchun

target_metadata = Base.metadata


def run_migrations_online() -> None:
    with engine.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            compare_type=True,
        )
        with context.begin_transaction():
            context.run_migrations()


run_migrations_online()
