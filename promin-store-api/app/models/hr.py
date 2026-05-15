from datetime import date, datetime
from decimal import Decimal

from sqlalchemy import Boolean, CheckConstraint, Date, DateTime, ForeignKey, Numeric, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base
from app.models.base import TimestampMixin


class HRCandidate(TimestampMixin, Base):
    __tablename__ = "hr_candidates"
    __table_args__ = (
        CheckConstraint("decision IN ('rejected', 'trainee', 'approved')", name="ck_hr_candidates_decision"),
        CheckConstraint(
            "sync_status IN ('candidate', 'trainee', 'approved', 'rejected', 'synced_to_1c', 'imported_from_1c')",
            name="ck_hr_candidates_sync_status",
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    first_name: Mapped[str] = mapped_column(String(128), nullable=False)
    last_name: Mapped[str] = mapped_column(String(128), nullable=False)
    middle_name: Mapped[str | None] = mapped_column(String(128), nullable=True)
    birth_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    phone1: Mapped[str | None] = mapped_column(String(32), nullable=True)
    phone2: Mapped[str | None] = mapped_column(String(32), nullable=True)
    passport_code: Mapped[str | None] = mapped_column(String(64), nullable=True)
    tax_code: Mapped[str | None] = mapped_column(String(32), nullable=True, index=True)
    residence_address: Mapped[str | None] = mapped_column(Text, nullable=True)
    registration_address: Mapped[str | None] = mapped_column(Text, nullable=True)
    marital_status: Mapped[str | None] = mapped_column(String(32), nullable=True)
    has_children: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    has_credits: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    credits_amount: Mapped[Decimal | None] = mapped_column(Numeric(12, 2), nullable=True)
    previous_workplace: Mapped[str | None] = mapped_column(String(255), nullable=True)
    work_experience: Mapped[str | None] = mapped_column(String(255), nullable=True)
    interview_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    internship_datetime: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    position: Mapped[str | None] = mapped_column(String(128), nullable=True)
    hr_comment: Mapped[str | None] = mapped_column(Text, nullable=True)
    decision: Mapped[str] = mapped_column(String(32), default="trainee", nullable=False)
    sync_status: Mapped[str] = mapped_column(String(32), default="candidate", nullable=False, index=True)
    synced_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    imported_employee_id: Mapped[int | None] = mapped_column(ForeignKey("employees.id"), nullable=True)
    created_by: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)

    imported_employee = relationship("Employee")
    creator = relationship("User")
    events = relationship("HRCandidateEvent", back_populates="candidate", cascade="all, delete-orphan")
    documents = relationship("HRCandidateDocument", back_populates="candidate", cascade="all, delete-orphan")

    def __str__(self) -> str:
        return " ".join(part for part in [self.last_name, self.first_name, self.middle_name] if part)


class HRCandidateEvent(Base):
    __tablename__ = "hr_candidate_events"

    id: Mapped[int] = mapped_column(primary_key=True)
    candidate_id: Mapped[int] = mapped_column(ForeignKey("hr_candidates.id"), nullable=False, index=True)
    event_type: Mapped[str] = mapped_column(String(64), nullable=False)
    author_user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    comment: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    candidate = relationship("HRCandidate", back_populates="events")
    author = relationship("User")


class HRCandidateDocument(Base):
    __tablename__ = "hr_candidate_documents"
    __table_args__ = (
        UniqueConstraint("candidate_id", "document_type", name="uq_hr_candidate_documents_candidate_type"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    candidate_id: Mapped[int] = mapped_column(ForeignKey("hr_candidates.id"), nullable=False, index=True)
    document_type: Mapped[str] = mapped_column(String(64), nullable=False)
    is_added: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    file_path: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    candidate = relationship("HRCandidate", back_populates="documents")
