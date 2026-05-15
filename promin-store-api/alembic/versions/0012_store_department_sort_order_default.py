"""set store department sort order default

Revision ID: 0012_store_dept_order
Revises: 0011_store_tasks_foundation
Create Date: 2026-05-14
"""
from alembic import op

revision = "0012_store_dept_order"
down_revision = "0011_store_tasks_foundation"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.alter_column("store_departments", "sort_order", server_default="10")


def downgrade() -> None:
    op.alter_column("store_departments", "sort_order", server_default="100")
