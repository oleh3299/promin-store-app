"""add hr candidates

Revision ID: 0013_hr_candidates
Revises: 0012_store_dept_order
Create Date: 2026-05-15
"""
from alembic import op
import sqlalchemy as sa

revision = "0013_hr_candidates"
down_revision = "0012_store_dept_order"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'hr_manager'")
    op.execute("ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'hr_tablet'")
    op.execute("ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'store_manager'")
    op.execute("ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'employee'")

    op.add_column("employees", sa.Column("tax_code", sa.String(length=32), nullable=True))
    op.create_index(op.f("ix_employees_tax_code"), "employees", ["tax_code"], unique=False)

    op.create_table(
        "hr_candidates",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("first_name", sa.String(length=128), nullable=False),
        sa.Column("last_name", sa.String(length=128), nullable=False),
        sa.Column("middle_name", sa.String(length=128), nullable=True),
        sa.Column("birth_date", sa.Date(), nullable=True),
        sa.Column("phone1", sa.String(length=32), nullable=True),
        sa.Column("phone2", sa.String(length=32), nullable=True),
        sa.Column("passport_code", sa.String(length=64), nullable=True),
        sa.Column("tax_code", sa.String(length=32), nullable=True),
        sa.Column("residence_address", sa.Text(), nullable=True),
        sa.Column("registration_address", sa.Text(), nullable=True),
        sa.Column("marital_status", sa.String(length=32), nullable=True),
        sa.Column("has_children", sa.Boolean(), server_default=sa.false(), nullable=False),
        sa.Column("has_credits", sa.Boolean(), server_default=sa.false(), nullable=False),
        sa.Column("credits_amount", sa.Numeric(12, 2), nullable=True),
        sa.Column("previous_workplace", sa.String(length=255), nullable=True),
        sa.Column("work_experience", sa.String(length=255), nullable=True),
        sa.Column("interview_date", sa.Date(), nullable=True),
        sa.Column("internship_datetime", sa.DateTime(timezone=True), nullable=True),
        sa.Column("position", sa.String(length=128), nullable=True),
        sa.Column("hr_comment", sa.Text(), nullable=True),
        sa.Column("decision", sa.String(length=32), server_default="trainee", nullable=False),
        sa.Column("sync_status", sa.String(length=32), server_default="candidate", nullable=False),
        sa.Column("synced_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("imported_employee_id", sa.Integer(), nullable=True),
        sa.Column("created_by", sa.Integer(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.CheckConstraint(
            "decision IN ('rejected', 'trainee', 'approved')",
            name="ck_hr_candidates_decision",
        ),
        sa.CheckConstraint(
            "sync_status IN ('candidate', 'trainee', 'approved', 'rejected', 'synced_to_1c', 'imported_from_1c')",
            name="ck_hr_candidates_sync_status",
        ),
        sa.ForeignKeyConstraint(["created_by"], ["users.id"]),
        sa.ForeignKeyConstraint(["imported_employee_id"], ["employees.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_hr_candidates_sync_status"), "hr_candidates", ["sync_status"], unique=False)
    op.create_index(op.f("ix_hr_candidates_tax_code"), "hr_candidates", ["tax_code"], unique=False)
    op.create_index(op.f("ix_hr_candidates_imported_employee_id"), "hr_candidates", ["imported_employee_id"], unique=False)

    op.create_table(
        "hr_candidate_events",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("candidate_id", sa.Integer(), nullable=False),
        sa.Column("event_type", sa.String(length=64), nullable=False),
        sa.Column("author_user_id", sa.Integer(), nullable=True),
        sa.Column("comment", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["author_user_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["candidate_id"], ["hr_candidates.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_hr_candidate_events_candidate_id"), "hr_candidate_events", ["candidate_id"], unique=False)

    op.create_table(
        "hr_candidate_documents",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("candidate_id", sa.Integer(), nullable=False),
        sa.Column("document_type", sa.String(length=64), nullable=False),
        sa.Column("is_added", sa.Boolean(), server_default=sa.false(), nullable=False),
        sa.Column("file_path", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["candidate_id"], ["hr_candidates.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("candidate_id", "document_type", name="uq_hr_candidate_documents_candidate_type"),
    )
    op.create_index(op.f("ix_hr_candidate_documents_candidate_id"), "hr_candidate_documents", ["candidate_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_hr_candidate_documents_candidate_id"), table_name="hr_candidate_documents")
    op.drop_table("hr_candidate_documents")
    op.drop_index(op.f("ix_hr_candidate_events_candidate_id"), table_name="hr_candidate_events")
    op.drop_table("hr_candidate_events")
    op.drop_index(op.f("ix_hr_candidates_tax_code"), table_name="hr_candidates")
    op.drop_index(op.f("ix_hr_candidates_sync_status"), table_name="hr_candidates")
    op.drop_index(op.f("ix_hr_candidates_imported_employee_id"), table_name="hr_candidates")
    op.drop_table("hr_candidates")
    op.drop_index(op.f("ix_employees_tax_code"), table_name="employees")
    op.drop_column("employees", "tax_code")
