"""add planogram images

Revision ID: 0010_planogram_images
Revises: 0009_planogram_zones
Create Date: 2026-05-14
"""
from alembic import op
import sqlalchemy as sa

revision = "0010_planogram_images"
down_revision = "0009_planogram_zones"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "planograms",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("store_id", sa.Integer(), nullable=False),
        sa.Column("category_name", sa.String(length=255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("image_path", sa.String(length=500), nullable=False),
        sa.Column("uploaded_by", sa.String(length=255), nullable=True),
        sa.Column("uploaded_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("is_active", sa.Boolean(), server_default=sa.true(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["store_id"], ["stores.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_planograms_store_id"), "planograms", ["store_id"], unique=False)
    op.create_index(op.f("ix_planograms_category_name"), "planograms", ["category_name"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_planograms_category_name"), table_name="planograms")
    op.drop_index(op.f("ix_planograms_store_id"), table_name="planograms")
    op.drop_table("planograms")
