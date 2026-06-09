"""baseline — joriy sxema (create_all bilan yaratilgan) uchun boshlang'ich nuqta

Bu migratsiya bo'sh: mavjud sxema `Base.metadata.create_all` orqali quriladi va
ishga tushganda `alembic stamp head` bilan shu revisiyaga belgilanadi. Bundan
keyingi har bir sxema o'zgarishi uchun yangi migratsiya yaratiladi:

    docker compose exec backend alembic revision --autogenerate -m "tavsif"
    docker compose exec backend alembic upgrade head

Revision ID: 0001_baseline
Revises:
"""

revision = "0001_baseline"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
