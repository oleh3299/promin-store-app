"""admin managed photo report templates

Revision ID: 0008_photo_tpl_admin
Revises: 0007_photo_report_route_key
Create Date: 2026-05-14
"""
from alembic import op
import sqlalchemy as sa

revision = "0008_photo_tpl_admin"
down_revision = "0007_photo_report_route_key"
branch_labels = None
depends_on = None


TABLE_NAME = "photo_report_templates"
UNIQUE_CONSTRAINT = "uq_photo_report_templates_store_item_key"


def _column_names() -> set[str]:
    inspector = sa.inspect(op.get_bind())
    return {column["name"] for column in inspector.get_columns(TABLE_NAME)}


def _unique_constraint_names() -> set[str]:
    inspector = sa.inspect(op.get_bind())
    return {constraint["name"] for constraint in inspector.get_unique_constraints(TABLE_NAME)}


def upgrade() -> None:
    columns = _column_names()
    if "title" in columns and "item_name" not in columns:
        op.alter_column(TABLE_NAME, "title", new_column_name="item_name")

    columns = _column_names()
    if "item_key" not in columns:
        op.add_column(TABLE_NAME, sa.Column("item_key", sa.String(length=64), nullable=True))
    if "description" not in columns:
        op.add_column(TABLE_NAME, sa.Column("description", sa.Text(), nullable=True))
    if "is_required" not in columns:
        op.add_column(
            TABLE_NAME,
            sa.Column("is_required", sa.Boolean(), server_default=sa.true(), nullable=False),
        )

    op.execute(
        sa.text(
            f"UPDATE {TABLE_NAME} "
            "SET item_key = 'item_' || id::text "
            "WHERE item_key IS NULL"
        )
    )

    op.alter_column(TABLE_NAME, "item_key", nullable=False)
    if "is_required" in _column_names():
        op.execute(sa.text(f"UPDATE {TABLE_NAME} SET is_required = true WHERE is_required IS NULL"))
        op.alter_column(TABLE_NAME, "is_required", nullable=False, server_default=None)
    if UNIQUE_CONSTRAINT not in _unique_constraint_names():
        op.create_unique_constraint(
            UNIQUE_CONSTRAINT,
            TABLE_NAME,
            ["store_id", "item_key"],
        )


def downgrade() -> None:
    if UNIQUE_CONSTRAINT in _unique_constraint_names():
        op.drop_constraint(
            UNIQUE_CONSTRAINT,
            TABLE_NAME,
            type_="unique",
        )

    columns = _column_names()
    if "is_required" in columns:
        op.drop_column(TABLE_NAME, "is_required")
    if "description" in columns:
        op.drop_column(TABLE_NAME, "description")
    if "item_key" in columns:
        op.drop_column(TABLE_NAME, "item_key")

    columns = _column_names()
    if "item_name" in columns and "title" not in columns:
        op.alter_column(TABLE_NAME, "item_name", new_column_name="title")
