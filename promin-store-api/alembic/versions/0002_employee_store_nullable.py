"""make employee store nullable

Revision ID: 0002_employee_store_nullable
Revises: 0001_initial_schema
Create Date: 2026-05-13
"""
from alembic import op
import sqlalchemy as sa

revision = "0002_employee_store_nullable"
down_revision = "0001_initial_schema"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.alter_column(
        "employees",
        "store_id",
        existing_type=sa.Integer(),
        nullable=True,
    )


def downgrade() -> None:
    op.alter_column(
        "employees",
        "store_id",
        existing_type=sa.Integer(),
        nullable=False,
    )
