"""add photo reports

Revision ID: 0006_photo_reports
Revises: 0005_invoice_upload_logs
Create Date: 2026-05-14
"""
from alembic import op
import sqlalchemy as sa

revision = "0006_photo_reports"
down_revision = "0005_invoice_upload_logs"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "photo_report_templates",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("store_id", sa.Integer(), nullable=False),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("sort_order", sa.Integer(), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["store_id"], ["stores.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_photo_report_templates_store_id"), "photo_report_templates", ["store_id"], unique=False)

    op.create_table(
        "photo_reports",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("store_id", sa.Integer(), nullable=False),
        sa.Column("device_id", sa.Integer(), nullable=False),
        sa.Column("employee_id", sa.Integer(), nullable=True),
        sa.Column("items_done", sa.Integer(), nullable=False),
        sa.Column("items_total", sa.Integer(), nullable=False),
        sa.Column("status", sa.String(length=16), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("sent_at", sa.DateTime(timezone=True), nullable=True),
        sa.CheckConstraint("status IN ('sent', 'failed')", name="ck_photo_reports_status"),
        sa.ForeignKeyConstraint(["device_id"], ["devices.id"]),
        sa.ForeignKeyConstraint(["employee_id"], ["employees.id"]),
        sa.ForeignKeyConstraint(["store_id"], ["stores.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_photo_reports_created_at"), "photo_reports", ["created_at"], unique=False)
    op.create_index(op.f("ix_photo_reports_store_id"), "photo_reports", ["store_id"], unique=False)

    op.create_table(
        "photo_report_items",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("report_id", sa.Integer(), nullable=False),
        sa.Column("template_id", sa.Integer(), nullable=False),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("rocket_room_id", sa.String(length=128), nullable=False),
        sa.Column("rocket_file_id", sa.String(length=128), nullable=True),
        sa.Column("rocket_message_id", sa.String(length=128), nullable=True),
        sa.Column("status", sa.String(length=16), nullable=False),
        sa.Column("error_text", sa.String(length=1000), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("sent_at", sa.DateTime(timezone=True), nullable=True),
        sa.CheckConstraint("status IN ('sent', 'failed')", name="ck_photo_report_items_status"),
        sa.ForeignKeyConstraint(["report_id"], ["photo_reports.id"]),
        sa.ForeignKeyConstraint(["template_id"], ["photo_report_templates.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_photo_report_items_report_id"), "photo_report_items", ["report_id"], unique=False)
    op.create_index(op.f("ix_photo_report_items_template_id"), "photo_report_items", ["template_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_photo_report_items_template_id"), table_name="photo_report_items")
    op.drop_index(op.f("ix_photo_report_items_report_id"), table_name="photo_report_items")
    op.drop_table("photo_report_items")
    op.drop_index(op.f("ix_photo_reports_store_id"), table_name="photo_reports")
    op.drop_index(op.f("ix_photo_reports_created_at"), table_name="photo_reports")
    op.drop_table("photo_reports")
    op.drop_index(op.f("ix_photo_report_templates_store_id"), table_name="photo_report_templates")
    op.drop_table("photo_report_templates")
