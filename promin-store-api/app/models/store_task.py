from datetime import date, datetime, time

from sqlalchemy import Boolean, CheckConstraint, Date, DateTime, ForeignKey, Integer, String, Text, Time, UniqueConstraint, func
from sqlalchemy.orm.exc import DetachedInstanceError
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base
from app.models.base import TimestampMixin


class StoreDepartment(TimestampMixin, Base):
    __tablename__ = "store_departments"

    id: Mapped[int] = mapped_column(primary_key=True)
    store_id: Mapped[int] = mapped_column(ForeignKey("stores.id"), index=True, nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    sort_order: Mapped[int] = mapped_column(Integer, default=10, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    store = relationship("Store", back_populates="departments")
    tasks = relationship("StoreTask", back_populates="department")

    def __str__(self) -> str:
        try:
            if self.store is not None:
                return f"{self.store.code} — {self.store.name} / {self.name}"
        except DetachedInstanceError:
            pass
        return self.name


class TaskTemplate(TimestampMixin, Base):
    __tablename__ = "task_templates"
    __table_args__ = (
        CheckConstraint("task_type IN ('routine', 'manual', 'correction', 'display', 'inspection')", name="ck_task_templates_task_type"),
        CheckConstraint("priority IN ('low', 'normal', 'high', 'urgent')", name="ck_task_templates_priority"),
        UniqueConstraint("template_key", name="uq_task_templates_template_key"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    template_key: Mapped[str | None] = mapped_column(String(128), nullable=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    task_type: Mapped[str] = mapped_column(String(32), nullable=False)
    requires_photo: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    requires_comment: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    requires_verification: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    priority: Mapped[str] = mapped_column(String(16), default="normal", nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    tasks = relationship("StoreTask", back_populates="template")

    def __str__(self) -> str:
        return self.title


class StoreTask(TimestampMixin, Base):
    __tablename__ = "store_tasks"
    __table_args__ = (
        CheckConstraint("source IN ('admin', 'operator', 'system')", name="ck_store_tasks_source"),
        CheckConstraint(
            "status IN ('open', 'in_progress', 'submitted', 'completed', 'verified', 'rejected', 'cancelled')",
            name="ck_store_tasks_status",
        ),
        CheckConstraint("priority IN ('low', 'normal', 'high', 'urgent')", name="ck_store_tasks_priority"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    store_id: Mapped[int] = mapped_column(ForeignKey("stores.id"), nullable=False)
    department_id: Mapped[int | None] = mapped_column(ForeignKey("store_departments.id"), nullable=True)
    template_id: Mapped[int | None] = mapped_column(ForeignKey("task_templates.id"), index=True, nullable=True)
    source: Mapped[str] = mapped_column(String(32), nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(32), default="open", nullable=False)
    priority: Mapped[str] = mapped_column(String(16), default="normal", nullable=False)
    due_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    due_time: Mapped[time | None] = mapped_column(Time, nullable=True)
    requires_photo: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    requires_comment: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    requires_verification: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    assigned_employee_id: Mapped[int | None] = mapped_column(ForeignKey("employees.id"), index=True, nullable=True)
    completed_by_employee_id: Mapped[int | None] = mapped_column(ForeignKey("employees.id"), index=True, nullable=True)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    verified_by: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    verified_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    related_entity_type: Mapped[str | None] = mapped_column(String(64), nullable=True)
    related_entity_id: Mapped[int | None] = mapped_column(Integer, nullable=True)

    store = relationship("Store", back_populates="tasks")
    department = relationship("StoreDepartment", back_populates="tasks")
    template = relationship("TaskTemplate", back_populates="tasks")
    assigned_employee = relationship("Employee", foreign_keys=[assigned_employee_id], back_populates="assigned_store_tasks")
    completed_by_employee = relationship("Employee", foreign_keys=[completed_by_employee_id], back_populates="completed_store_tasks")
    verifier = relationship("User", back_populates="verified_store_tasks")
    attachments = relationship("StoreTaskAttachment", back_populates="task")
    events = relationship("StoreTaskEvent", back_populates="task")

    def __str__(self) -> str:
        return self.title


class StoreTaskAttachment(Base):
    __tablename__ = "store_task_attachments"
    __table_args__ = (
        CheckConstraint(
            "attachment_type IN ('completion_photo', 'reference_photo', 'admin_attachment')",
            name="ck_store_task_attachments_attachment_type",
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    task_id: Mapped[int] = mapped_column(ForeignKey("store_tasks.id"), index=True, nullable=False)
    file_path: Mapped[str | None] = mapped_column(Text, nullable=True)
    rocket_file_id: Mapped[str | None] = mapped_column(Text, nullable=True)
    attachment_type: Mapped[str] = mapped_column(String(32), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    task = relationship("StoreTask", back_populates="attachments")


class StoreTaskEvent(Base):
    __tablename__ = "store_task_events"
    __table_args__ = (
        CheckConstraint(
            "event_type IN ('created', 'assigned', 'started', 'submitted', 'completed', 'verified', 'rejected', 'cancelled', 'attachment_added', 'commented')",
            name="ck_store_task_events_event_type",
        ),
        CheckConstraint("author_type IN ('admin', 'operator', 'employee', 'device', 'system')", name="ck_store_task_events_author_type"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    task_id: Mapped[int] = mapped_column(ForeignKey("store_tasks.id"), nullable=False)
    event_type: Mapped[str] = mapped_column(String(32), nullable=False)
    author_type: Mapped[str] = mapped_column(String(32), nullable=False)
    author_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    comment: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    task = relationship("StoreTask", back_populates="events")
