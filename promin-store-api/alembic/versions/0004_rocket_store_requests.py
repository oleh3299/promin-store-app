"""add rocket chat routed store requests

Revision ID: 0004_rocket_store_requests
Revises: 0003_device_accounts
Create Date: 2026-05-13
"""
from alembic import op
import sqlalchemy as sa

revision = "0004_rocket_store_requests"
down_revision = "0003_device_accounts"
branch_labels = None
depends_on = None


route_key_check = (
    "route_key IN ('purchase', 'accounting', 'it', 'manager', 'security', 'repair', 'cash', 'other')"
)


def upgrade() -> None:
    op.create_table(
        "rocket_routes",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("route_key", sa.String(length=32), nullable=False),
        sa.Column("scope", sa.String(length=16), nullable=False),
        sa.Column("store_id", sa.Integer(), nullable=True),
        sa.Column("room_id", sa.String(length=128), nullable=False),
        sa.Column("room_name", sa.String(length=255), nullable=True),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.CheckConstraint(route_key_check, name="ck_rocket_routes_route_key"),
        sa.CheckConstraint("scope IN ('global', 'store')", name="ck_rocket_routes_scope"),
        sa.CheckConstraint(
            "(scope = 'global' AND store_id IS NULL) OR (scope = 'store' AND store_id IS NOT NULL)",
            name="ck_rocket_routes_scope_store",
        ),
        sa.ForeignKeyConstraint(["store_id"], ["stores.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_rocket_routes_global_unique",
        "rocket_routes",
        ["route_key", "scope"],
        unique=True,
        postgresql_where=sa.text("scope = 'global' AND store_id IS NULL"),
    )
    op.create_index(
        "ix_rocket_routes_store_unique",
        "rocket_routes",
        ["route_key", "scope", "store_id"],
        unique=True,
        postgresql_where=sa.text("scope = 'store' AND store_id IS NOT NULL"),
    )
    op.create_index(op.f("ix_rocket_routes_route_key"), "rocket_routes", ["route_key"], unique=False)

    op.create_table(
        "store_request_logs",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("store_id", sa.Integer(), nullable=False),
        sa.Column("device_id", sa.Integer(), nullable=False),
        sa.Column("employee_id", sa.Integer(), nullable=True),
        sa.Column("route_key", sa.String(length=32), nullable=False),
        sa.Column("request_type", sa.String(length=64), nullable=True),
        sa.Column("rocket_room_id", sa.String(length=128), nullable=False),
        sa.Column("rocket_message_id", sa.String(length=128), nullable=True),
        sa.Column("status", sa.String(length=16), nullable=False),
        sa.Column("error_text", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("sent_at", sa.DateTime(timezone=True), nullable=True),
        sa.CheckConstraint(route_key_check, name="ck_store_request_logs_route_key"),
        sa.CheckConstraint("status IN ('sent', 'failed')", name="ck_store_request_logs_status"),
        sa.ForeignKeyConstraint(["device_id"], ["devices.id"]),
        sa.ForeignKeyConstraint(["employee_id"], ["employees.id"]),
        sa.ForeignKeyConstraint(["store_id"], ["stores.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_store_request_logs_created_at"), "store_request_logs", ["created_at"], unique=False)
    op.create_index(op.f("ix_store_request_logs_route_key"), "store_request_logs", ["route_key"], unique=False)
    op.create_index(op.f("ix_store_request_logs_store_id"), "store_request_logs", ["store_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_store_request_logs_store_id"), table_name="store_request_logs")
    op.drop_index(op.f("ix_store_request_logs_route_key"), table_name="store_request_logs")
    op.drop_index(op.f("ix_store_request_logs_created_at"), table_name="store_request_logs")
    op.drop_table("store_request_logs")
    op.drop_index(op.f("ix_rocket_routes_route_key"), table_name="rocket_routes")
    op.drop_index("ix_rocket_routes_store_unique", table_name="rocket_routes")
    op.drop_index("ix_rocket_routes_global_unique", table_name="rocket_routes")
    op.drop_table("rocket_routes")
