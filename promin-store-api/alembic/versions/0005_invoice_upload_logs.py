"""add invoice upload logs

Revision ID: 0005_invoice_upload_logs
Revises: 0004_rocket_store_requests
Create Date: 2026-05-14
"""
from alembic import op
import sqlalchemy as sa

revision = "0005_invoice_upload_logs"
down_revision = "0004_rocket_store_requests"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "invoice_upload_logs",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("store_id", sa.Integer(), nullable=False),
        sa.Column("device_id", sa.Integer(), nullable=False),
        sa.Column("employee_id", sa.Integer(), nullable=True),
        sa.Column("request_type", sa.String(length=64), nullable=False),
        sa.Column("rocket_room_id", sa.String(length=128), nullable=False),
        sa.Column("rocket_file_id", sa.String(length=128), nullable=True),
        sa.Column("rocket_message_id", sa.String(length=128), nullable=True),
        sa.Column("status", sa.String(length=16), nullable=False),
        sa.Column("error_text", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("sent_at", sa.DateTime(timezone=True), nullable=True),
        sa.CheckConstraint(
            "request_type IN ('incoming', 'return', 'writeoff', 'assembly')",
            name="ck_invoice_upload_logs_request_type",
        ),
        sa.CheckConstraint("status IN ('sent', 'failed')", name="ck_invoice_upload_logs_status"),
        sa.ForeignKeyConstraint(["device_id"], ["devices.id"]),
        sa.ForeignKeyConstraint(["employee_id"], ["employees.id"]),
        sa.ForeignKeyConstraint(["store_id"], ["stores.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_invoice_upload_logs_created_at"), "invoice_upload_logs", ["created_at"], unique=False)
    op.create_index(op.f("ix_invoice_upload_logs_request_type"), "invoice_upload_logs", ["request_type"], unique=False)
    op.create_index(op.f("ix_invoice_upload_logs_store_id"), "invoice_upload_logs", ["store_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_invoice_upload_logs_store_id"), table_name="invoice_upload_logs")
    op.drop_index(op.f("ix_invoice_upload_logs_request_type"), table_name="invoice_upload_logs")
    op.drop_index(op.f("ix_invoice_upload_logs_created_at"), table_name="invoice_upload_logs")
    op.drop_table("invoice_upload_logs")
