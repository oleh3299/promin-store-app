"""add photo report rocket thread fields

Revision ID: 0015_photo_report_thread
Revises: 0014_rocket_store_msg
Create Date: 2026-05-20
"""
from alembic import op
import sqlalchemy as sa

revision = "0015_photo_report_thread"
down_revision = "0014_rocket_store_msg"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("photo_reports", sa.Column("rocket_room_id", sa.String(length=128), nullable=True))
    op.add_column("photo_reports", sa.Column("rocket_parent_message_id", sa.String(length=128), nullable=True))
    op.create_index("ix_photo_reports_rocket_parent_message_id", "photo_reports", ["rocket_parent_message_id"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_photo_reports_rocket_parent_message_id", table_name="photo_reports")
    op.drop_column("photo_reports", "rocket_parent_message_id")
    op.drop_column("photo_reports", "rocket_room_id")
