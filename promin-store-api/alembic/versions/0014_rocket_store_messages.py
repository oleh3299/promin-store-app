"""add rocket chat store task source fields

Revision ID: 0014_rocket_store_msg
Revises: 0013_hr_candidates
Create Date: 2026-05-19
"""
from alembic import op
import sqlalchemy as sa

revision = "0014_rocket_store_msg"
down_revision = "0013_hr_candidates"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.drop_constraint("ck_store_tasks_source", "store_tasks", type_="check")
    op.create_check_constraint(
        "ck_store_tasks_source",
        "store_tasks",
        "source IN ('admin', 'operator', 'system', 'rocket_chat')",
    )
    op.add_column("store_tasks", sa.Column("source_room_id", sa.String(length=128), nullable=True))
    op.add_column("store_tasks", sa.Column("source_message_id", sa.String(length=128), nullable=True))
    op.add_column("store_tasks", sa.Column("source_route_key", sa.String(length=32), nullable=True))
    op.add_column("store_tasks", sa.Column("source_user_name", sa.String(length=255), nullable=True))
    op.add_column("store_tasks", sa.Column("category", sa.String(length=32), nullable=True))
    op.create_check_constraint(
        "ck_store_tasks_category",
        "store_tasks",
        "category IS NULL OR category IN ('accounting', 'photo_report', 'general')",
    )
    op.create_index("ix_store_tasks_source_message_id", "store_tasks", ["source_message_id"], unique=False)
    op.create_index("ix_store_tasks_source_room_id", "store_tasks", ["source_room_id"], unique=False)
    op.create_index(
        "uq_store_tasks_rocket_message_id",
        "store_tasks",
        ["source_message_id"],
        unique=True,
        postgresql_where=sa.text("source = 'rocket_chat' AND source_message_id IS NOT NULL"),
    )


def downgrade() -> None:
    op.drop_index("uq_store_tasks_rocket_message_id", table_name="store_tasks")
    op.drop_index("ix_store_tasks_source_room_id", table_name="store_tasks")
    op.drop_index("ix_store_tasks_source_message_id", table_name="store_tasks")
    op.drop_constraint("ck_store_tasks_category", "store_tasks", type_="check")
    op.drop_column("store_tasks", "category")
    op.drop_column("store_tasks", "source_user_name")
    op.drop_column("store_tasks", "source_route_key")
    op.drop_column("store_tasks", "source_message_id")
    op.drop_column("store_tasks", "source_room_id")
    op.drop_constraint("ck_store_tasks_source", "store_tasks", type_="check")
    op.create_check_constraint(
        "ck_store_tasks_source",
        "store_tasks",
        "source IN ('admin', 'operator', 'system')",
    )
