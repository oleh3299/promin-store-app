"""add persistent device account fields

Revision ID: 0003_device_accounts
Revises: 0002_employee_store_nullable
Create Date: 2026-05-13
"""
from alembic import op
import sqlalchemy as sa

revision = "0003_device_accounts"
down_revision = "0002_employee_store_nullable"
branch_labels = None
depends_on = None


def has_column(table_name: str, column_name: str) -> bool:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    return any(column["name"] == column_name for column in inspector.get_columns(table_name))


def has_index(table_name: str, index_name: str) -> bool:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    return any(index["name"] == index_name for index in inspector.get_indexes(table_name))


def upgrade() -> None:
    if not has_column("devices", "login"):
        op.add_column("devices", sa.Column("login", sa.String(length=128), nullable=True))
    if not has_index("devices", "ix_devices_login"):
        op.create_index(op.f("ix_devices_login"), "devices", ["login"], unique=True)

    if not has_column("devices", "password_hash"):
        op.add_column("devices", sa.Column("password_hash", sa.String(length=255), nullable=True))

    if not has_column("devices", "is_active"):
        op.add_column(
            "devices",
            sa.Column("is_active", sa.Boolean(), server_default=sa.true(), nullable=False),
        )
        op.execute("UPDATE devices SET is_active = false WHERE status = 'revoked'")
        op.alter_column("devices", "is_active", server_default=None)

    if not has_column("devices", "disabled_at"):
        op.add_column("devices", sa.Column("disabled_at", sa.DateTime(timezone=True), nullable=True))

    if not has_column("devices", "disabled_reason"):
        op.add_column("devices", sa.Column("disabled_reason", sa.Text(), nullable=True))

    op.alter_column(
        "devices",
        "token_hash",
        existing_type=sa.String(length=255),
        nullable=True,
    )


def downgrade() -> None:
    op.alter_column(
        "devices",
        "token_hash",
        existing_type=sa.String(length=255),
        nullable=False,
    )

    if has_column("devices", "disabled_reason"):
        op.drop_column("devices", "disabled_reason")
    if has_column("devices", "disabled_at"):
        op.drop_column("devices", "disabled_at")
    if has_column("devices", "is_active"):
        op.drop_column("devices", "is_active")
    if has_column("devices", "password_hash"):
        op.drop_column("devices", "password_hash")
    if has_index("devices", "ix_devices_login"):
        op.drop_index(op.f("ix_devices_login"), table_name="devices")
    if has_column("devices", "login"):
        op.drop_column("devices", "login")
