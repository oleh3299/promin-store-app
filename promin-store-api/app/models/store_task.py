from datetime import date, datetime, time
import re

from sqlalchemy import Boolean, CheckConstraint, Date, DateTime, ForeignKey, Integer, String, Text, Time, UniqueConstraint, event, func, select
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.orm.exc import DetachedInstanceError

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


CYRILLIC_SLUG_MAP = str.maketrans(
    {
        "а": "a",
        "б": "b",
        "в": "v",
        "г": "h",
        "ґ": "g",
        "д": "d",
        "е": "e",
        "є": "ie",
        "ё": "e",
        "ж": "zh",
        "з": "z",
        "и": "y",
        "і": "i",
        "ї": "i",
        "й": "i",
        "к": "k",
        "л": "l",
        "м": "m",
        "н": "n",
        "о": "o",
        "п": "p",
        "р": "r",
        "с": "s",
        "т": "t",
        "у": "u",
        "ф": "f",
        "х": "kh",
        "ц": "ts",
        "ч": "ch",
        "ш": "sh",
        "щ": "shch",
        "ь": "",
        "ы": "y",
        "ъ": "",
        "э": "e",
        "ю": "iu",
        "я": "ia",
    },
)
TEMPLATE_KEY_OVERRIDES = {
    "помити кавоварку": "clean_coffee_machine",
    "помыть кофеварку": "clean_coffee_machine",
}


def slugify_template_title(title: str) -> str:
    normalized_title = title.strip().lower()
    if normalized_title in TEMPLATE_KEY_OVERRIDES:
        return TEMPLATE_KEY_OVERRIDES[normalized_title]

    transliterated = normalized_title.translate(CYRILLIC_SLUG_MAP)
    slug = re.sub(r"[^a-z0-9]+", "_", transliterated)
    slug = re.sub(r"_+", "_", slug).strip("_")
    return slug[:120] or "task_template"


def unique_template_key(connection, target: TaskTemplate) -> str:
    base_key = slugify_template_title(target.title)
    candidate = base_key
    index = 2

    while True:
        statement = select(TaskTemplate.id).where(TaskTemplate.template_key == candidate)
        if target.id is not None:
            statement = statement.where(TaskTemplate.id != target.id)
        existing_id = connection.execute(statement).scalar_one_or_none()
        if existing_id is None:
            return candidate

        suffix = f"_{index}"
        candidate = f"{base_key[: 128 - len(suffix)]}{suffix}"
        index += 1


@event.listens_for(TaskTemplate, "before_insert")
@event.listens_for(TaskTemplate, "before_update")
def set_task_template_key(_mapper, connection, target: TaskTemplate) -> None:
    if not target.template_key:
        target.template_key = unique_template_key(connection, target)


class StoreTask(TimestampMixin, Base):
    __tablename__ = "store_tasks"
    __table_args__ = (
        CheckConstraint("source IN ('admin', 'operator', 'system', 'rocket_chat')", name="ck_store_tasks_source"),
        CheckConstraint(
            "status IN ('open', 'in_progress', 'submitted', 'completed', 'verified', 'rejected', 'cancelled')",
            name="ck_store_tasks_status",
        ),
        CheckConstraint("priority IN ('low', 'normal', 'high', 'urgent')", name="ck_store_tasks_priority"),
        CheckConstraint("category IS NULL OR category IN ('accounting', 'photo_report', 'general')", name="ck_store_tasks_category"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    store_id: Mapped[int] = mapped_column(ForeignKey("stores.id"), nullable=False)
    department_id: Mapped[int | None] = mapped_column(ForeignKey("store_departments.id"), nullable=True)
    template_id: Mapped[int | None] = mapped_column(ForeignKey("task_templates.id"), index=True, nullable=True)
    source: Mapped[str] = mapped_column(String(32), nullable=False)
    source_room_id: Mapped[str | None] = mapped_column(String(128), nullable=True)
    source_message_id: Mapped[str | None] = mapped_column(String(128), nullable=True)
    source_route_key: Mapped[str | None] = mapped_column(String(32), nullable=True)
    source_user_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    category: Mapped[str | None] = mapped_column(String(32), nullable=True)
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
