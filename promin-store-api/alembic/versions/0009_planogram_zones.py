"""add planogram zones

Revision ID: 0009_planogram_zones
Revises: 0008_photo_tpl_admin
Create Date: 2026-05-14
"""
from alembic import op
import sqlalchemy as sa

revision = "0009_planogram_zones"
down_revision = "0008_photo_tpl_admin"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "planogram_zones",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("store_id", sa.Integer(), nullable=False),
        sa.Column("zone_key", sa.String(length=64), nullable=False),
        sa.Column("zone_name", sa.String(length=255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("is_active", sa.Boolean(), server_default=sa.true(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["store_id"], ["stores.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("store_id", "zone_key", name="uq_planogram_zones_store_zone_key"),
    )
    op.create_index(op.f("ix_planogram_zones_store_id"), "planogram_zones", ["store_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_planogram_zones_store_id"), table_name="planogram_zones")
    op.drop_table("planogram_zones")
