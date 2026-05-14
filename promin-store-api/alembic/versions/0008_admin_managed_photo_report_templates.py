"""admin managed photo report templates

Revision ID: 0008_admin_managed_photo_report_templates
Revises: 0007_photo_report_route_key
Create Date: 2026-05-14
"""
from alembic import op
import sqlalchemy as sa

revision = "0008_admin_managed_photo_report_templates"
down_revision = "0007_photo_report_route_key"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.alter_column("photo_report_templates", "title", new_column_name="item_name")
    op.add_column("photo_report_templates", sa.Column("item_key", sa.String(length=64), nullable=True))
    op.add_column("photo_report_templates", sa.Column("description", sa.Text(), nullable=True))
    op.add_column(
        "photo_report_templates",
        sa.Column("is_required", sa.Boolean(), server_default=sa.true(), nullable=False),
    )

    op.execute(
        sa.text(
            "UPDATE photo_report_templates "
            "SET item_key = 'item_' || id::text "
            "WHERE item_key IS NULL"
        )
    )

    op.alter_column("photo_report_templates", "item_key", nullable=False)
    op.alter_column("photo_report_templates", "is_required", server_default=None)
    op.create_unique_constraint(
        "uq_photo_report_templates_store_item_key",
        "photo_report_templates",
        ["store_id", "item_key"],
    )


def downgrade() -> None:
    op.drop_constraint(
        "uq_photo_report_templates_store_item_key",
        "photo_report_templates",
        type_="unique",
    )
    op.drop_column("photo_report_templates", "is_required")
    op.drop_column("photo_report_templates", "description")
    op.drop_column("photo_report_templates", "item_key")
    op.alter_column("photo_report_templates", "item_name", new_column_name="title")
