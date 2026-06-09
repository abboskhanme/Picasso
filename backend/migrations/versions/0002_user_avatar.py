"""users.avatar_url ustunini qo'shish (profil rasmi)

Revision ID: 0002_user_avatar
Revises: 0001_baseline
"""
from alembic import op
import sqlalchemy as sa

revision = "0002_user_avatar"
down_revision = "0001_baseline"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("users", sa.Column("avatar_url", sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column("users", "avatar_url")
