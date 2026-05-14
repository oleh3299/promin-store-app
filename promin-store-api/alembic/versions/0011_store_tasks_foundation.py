"""add store tasks foundation

Revision ID: 0011_store_tasks_foundation
Revises: 0010_planogram_images
Create Date: 2026-05-14
"""
from alembic import op
import sqlalchemy as sa

revision = "0011_store_tasks_foundation"
down_revision = "0010_planogram_images"
branch_labels = None
depends_on = None


TASK_TYPES = "'routine', 'manual', 'correction', 'display', 'inspection'"
TASK_SOURCES = "'admin', 'operator', 'system'"
TASK_STATUSES = "'open', 'in_progress', 'submitted', 'completed', 'verified', 'rejected', 'cancelled'"
TASK_PRIORITIES = "'low', 'normal', 'high', 'urgent'"
TASK_ATTACHMENT_TYPES = "'completion_photo', 'reference_photo', 'admin_attachment'"
TASK_EVENT_TYPES = (
    "'created', 'assigned', 'started', 'submitted', 'completed', 'verified', "
    "'rejected', 'cancelled', 'attachment_added', 'commented'"
)
TASK_AUTHOR_TYPES = "'admin', 'operator', 'employee', 'device', 'system'"


def upgrade() -> None:
    op.create_table(
        "store_departments",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("store_id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("sort_order", sa.Integer(), server_default="100", nullable=False),
        sa.Column("is_active", sa.Boolean(), server_default=sa.true(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["store_id"], ["stores.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_store_departments_store_id"), "store_departments", ["store_id"], unique=False)
    op.create_index(
        "ix_store_departments_store_sort_order",
        "store_departments",
        ["store_id", "sort_order"],
        unique=False,
    )

    op.create_table(
        "task_templates",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("template_key", sa.String(length=128), nullable=True),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("task_type", sa.String(length=32), nullable=False),
        sa.Column("requires_photo", sa.Boolean(), server_default=sa.true(), nullable=False),
        sa.Column("requires_comment", sa.Boolean(), server_default=sa.false(), nullable=False),
        sa.Column("requires_verification", sa.Boolean(), server_default=sa.true(), nullable=False),
        sa.Column("priority", sa.String(length=16), server_default="normal", nullable=False),
        sa.Column("is_active", sa.Boolean(), server_default=sa.true(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.CheckConstraint(f"task_type IN ({TASK_TYPES})", name="ck_task_templates_task_type"),
        sa.CheckConstraint(f"priority IN ({TASK_PRIORITIES})", name="ck_task_templates_priority"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("template_key", name="uq_task_templates_template_key"),
    )

    op.create_table(
        "store_tasks",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("store_id", sa.Integer(), nullable=False),
        sa.Column("department_id", sa.Integer(), nullable=True),
        sa.Column("template_id", sa.Integer(), nullable=True),
        sa.Column("source", sa.String(length=32), nullable=False),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("status", sa.String(length=32), server_default="open", nullable=False),
        sa.Column("priority", sa.String(length=16), server_default="normal", nullable=False),
        sa.Column("due_date", sa.Date(), nullable=True),
        sa.Column("due_time", sa.Time(), nullable=True),
        sa.Column("requires_photo", sa.Boolean(), server_default=sa.false(), nullable=False),
        sa.Column("requires_comment", sa.Boolean(), server_default=sa.false(), nullable=False),
        sa.Column("requires_verification", sa.Boolean(), server_default=sa.true(), nullable=False),
        sa.Column("assigned_employee_id", sa.Integer(), nullable=True),
        sa.Column("completed_by_employee_id", sa.Integer(), nullable=True),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("verified_by", sa.Integer(), nullable=True),
        sa.Column("verified_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("related_entity_type", sa.String(length=64), nullable=True),
        sa.Column("related_entity_id", sa.Integer(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.CheckConstraint(f"source IN ({TASK_SOURCES})", name="ck_store_tasks_source"),
        sa.CheckConstraint(f"status IN ({TASK_STATUSES})", name="ck_store_tasks_status"),
        sa.CheckConstraint(f"priority IN ({TASK_PRIORITIES})", name="ck_store_tasks_priority"),
        sa.ForeignKeyConstraint(["assigned_employee_id"], ["employees.id"]),
        sa.ForeignKeyConstraint(["completed_by_employee_id"], ["employees.id"]),
        sa.ForeignKeyConstraint(["department_id"], ["store_departments.id"]),
        sa.ForeignKeyConstraint(["store_id"], ["stores.id"]),
        sa.ForeignKeyConstraint(["template_id"], ["task_templates.id"]),
        sa.ForeignKeyConstraint(["verified_by"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_store_tasks_store_status_due", "store_tasks", ["store_id", "status", "due_date"], unique=False)
    op.create_index(op.f("ix_store_tasks_template_id"), "store_tasks", ["template_id"], unique=False)
    op.create_index(op.f("ix_store_tasks_assigned_employee_id"), "store_tasks", ["assigned_employee_id"], unique=False)
    op.create_index(
        op.f("ix_store_tasks_completed_by_employee_id"),
        "store_tasks",
        ["completed_by_employee_id"],
        unique=False,
    )

    op.create_table(
        "store_task_attachments",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("task_id", sa.Integer(), nullable=False),
        sa.Column("file_path", sa.Text(), nullable=True),
        sa.Column("rocket_file_id", sa.Text(), nullable=True),
        sa.Column("attachment_type", sa.String(length=32), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.CheckConstraint(
            f"attachment_type IN ({TASK_ATTACHMENT_TYPES})",
            name="ck_store_task_attachments_attachment_type",
        ),
        sa.ForeignKeyConstraint(["task_id"], ["store_tasks.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_store_task_attachments_task_id"), "store_task_attachments", ["task_id"], unique=False)

    op.create_table(
        "store_task_events",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("task_id", sa.Integer(), nullable=False),
        sa.Column("event_type", sa.String(length=32), nullable=False),
        sa.Column("author_type", sa.String(length=32), nullable=False),
        sa.Column("author_id", sa.Integer(), nullable=True),
        sa.Column("comment", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.CheckConstraint(f"event_type IN ({TASK_EVENT_TYPES})", name="ck_store_task_events_event_type"),
        sa.CheckConstraint(f"author_type IN ({TASK_AUTHOR_TYPES})", name="ck_store_task_events_author_type"),
        sa.ForeignKeyConstraint(["task_id"], ["store_tasks.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_store_task_events_task_created", "store_task_events", ["task_id", "created_at"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_store_task_events_task_created", table_name="store_task_events")
    op.drop_table("store_task_events")
    op.drop_index(op.f("ix_store_task_attachments_task_id"), table_name="store_task_attachments")
    op.drop_table("store_task_attachments")
    op.drop_index(op.f("ix_store_tasks_completed_by_employee_id"), table_name="store_tasks")
    op.drop_index(op.f("ix_store_tasks_assigned_employee_id"), table_name="store_tasks")
    op.drop_index(op.f("ix_store_tasks_template_id"), table_name="store_tasks")
    op.drop_index("ix_store_tasks_store_status_due", table_name="store_tasks")
    op.drop_table("store_tasks")
    op.drop_table("task_templates")
    op.drop_index("ix_store_departments_store_sort_order", table_name="store_departments")
    op.drop_index(op.f("ix_store_departments_store_id"), table_name="store_departments")
    op.drop_table("store_departments")
