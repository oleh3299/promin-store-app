from datetime import datetime, time, timezone
from pathlib import Path, PurePath
from uuid import uuid4
from zoneinfo import ZoneInfo

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.models import (
    Device,
    Store,
    StoreTask,
    StoreTaskAttachment,
    StoreTaskEvent,
)
from app.schemas.store_task import StoreTaskAttachmentRead, StoreTaskDetail, StoreTaskEventRead, StoreTaskRead
from app.services.store_request_service import StoreRequestError, resolve_employee_id


LOCAL_TIMEZONE = ZoneInfo("Europe/Uzhgorod")
STORE_TASK_STORAGE_ROOT = Path("storage") / "store-tasks"
MAX_STORE_TASK_FILE_SIZE = 10 * 1024 * 1024
ALLOWED_STORE_TASK_CONTENT_TYPES = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
}
ACTIVE_STORE_TASK_STATUSES = {"open", "in_progress", "submitted", "rejected"}


class StoreTaskError(Exception):
    def __init__(self, code: str, message: str) -> None:
        self.code = code
        self.message = message
        super().__init__(message)


def safe_path_segment(value: str) -> str:
    safe_value = "".join(char for char in value.strip() if char.isascii() and (char.isalnum() or char in ("-", "_")))
    return safe_value[:80] or "item"


def safe_store_task_filename(filename: str | None, content_type: str) -> str:
    extension = ALLOWED_STORE_TASK_CONTENT_TYPES[content_type]
    raw_name = PurePath(filename or "").name
    stem = raw_name.rsplit(".", 1)[0] if raw_name else "task-photo"
    return f"{datetime.now(timezone.utc):%Y%m%d%H%M%S}-{uuid4().hex[:8]}-{safe_path_segment(stem)[:48]}.{extension}"


def store_task_file_url(file_path: str | None) -> str | None:
    if not file_path:
        return None
    if file_path.startswith(("http://", "https://", "/")):
        return file_path
    normalized_path = file_path.replace("\\", "/")
    return f"/{normalized_path}"


def combine_due_datetime(task: StoreTask) -> datetime | None:
    if task.due_date is None:
        return None

    due_time = task.due_time or time.max
    return datetime.combine(task.due_date, due_time, tzinfo=LOCAL_TIMEZONE)


def is_task_overdue(task: StoreTask) -> bool:
    if task.status not in ACTIVE_STORE_TASK_STATUSES:
        return False

    due_at = combine_due_datetime(task)
    return due_at is not None and due_at < datetime.now(LOCAL_TIMEZONE)


def task_to_read(task: StoreTask) -> StoreTaskRead:
    return StoreTaskRead(
        id=task.id,
        title=task.title,
        description=task.description,
        status=task.status,
        priority=task.priority,
        due_date=task.due_date.isoformat() if task.due_date else None,
        due_time=task.due_time.strftime("%H:%M") if task.due_time else None,
        department_name=task.department.name if task.department else None,
        requires_photo=task.requires_photo,
        requires_comment=task.requires_comment,
        requires_verification=task.requires_verification,
        completed_at=task.completed_at.isoformat() if task.completed_at else None,
        is_overdue=is_task_overdue(task),
        created_at=task.created_at.isoformat(),
    )


def task_to_detail(task: StoreTask) -> StoreTaskDetail:
    return StoreTaskDetail(
        **task_to_read(task).model_dump(),
        attachments=[
            StoreTaskAttachmentRead(
                id=attachment.id,
                attachment_type=attachment.attachment_type,
                file_url=store_task_file_url(attachment.file_path),
                created_at=attachment.created_at.isoformat(),
            )
            for attachment in sorted(task.attachments, key=lambda item: item.created_at)
        ],
        events=[
            StoreTaskEventRead(
                id=event.id,
                event_type=event.event_type,
                author_type=event.author_type,
                comment=event.comment,
                created_at=event.created_at.isoformat(),
            )
            for event in sorted(task.events, key=lambda item: item.created_at)
        ],
    )


def add_task_event(
    db: Session,
    task: StoreTask,
    event_type: str,
    author_type: str,
    author_id: int | None = None,
    comment: str | None = None,
) -> StoreTaskEvent:
    event = StoreTaskEvent(
        task_id=task.id,
        event_type=event_type,
        author_type=author_type,
        author_id=author_id,
        comment=comment,
        created_at=datetime.now(timezone.utc),
    )
    db.add(event)
    return event


def get_store_task_for_device(db: Session, device: Device, task_id: int) -> StoreTask:
    if device.store_id is None:
        raise StoreTaskError("device_store_required", "Device is not linked to a store")

    task = db.scalar(
        select(StoreTask)
        .options(
            selectinload(StoreTask.department),
            selectinload(StoreTask.attachments),
            selectinload(StoreTask.events),
        )
        .where(StoreTask.id == task_id, StoreTask.store_id == device.store_id),
    )
    if task is None:
        raise StoreTaskError("task_not_found", "Task not found")

    return task


def list_store_tasks_for_device(db: Session, device: Device, statuses: list[str] | None = None) -> list[StoreTaskRead]:
    if device.store_id is None:
        return []

    selected_statuses = statuses or sorted(ACTIVE_STORE_TASK_STATUSES)
    tasks = list(
        db.scalars(
            select(StoreTask)
            .options(selectinload(StoreTask.department))
            .where(StoreTask.store_id == device.store_id, StoreTask.status.in_(selected_statuses))
            .order_by(StoreTask.due_date.asc().nulls_last(), StoreTask.due_time.asc().nulls_last(), StoreTask.id.desc()),
        ),
    )
    return [task_to_read(task) for task in tasks]


def start_store_task(db: Session, device: Device, task_id: int) -> StoreTaskRead:
    task = get_store_task_for_device(db, device, task_id)
    if task.status in {"open", "rejected"}:
        task.status = "in_progress"
        add_task_event(db, task, "started", "device", device.id)
        db.add(task)
        db.commit()
        db.refresh(task)

    return task_to_read(task)


def save_store_task_file(store: Store, task: StoreTask, filename: str | None, content_type: str, file_bytes: bytes) -> str:
    if content_type not in ALLOWED_STORE_TASK_CONTENT_TYPES:
        raise StoreTaskError("invalid_file_type", "Only JPEG, PNG, or WEBP are supported")
    if len(file_bytes) > MAX_STORE_TASK_FILE_SIZE:
        raise StoreTaskError("file_too_large", "Photo is too large")

    task_dir = STORE_TASK_STORAGE_ROOT / safe_path_segment(store.code) / str(task.id)
    task_dir.mkdir(parents=True, exist_ok=True)
    file_path = task_dir / safe_store_task_filename(filename, content_type)
    file_path.write_bytes(file_bytes)
    return file_path.as_posix()


def submit_store_task(
    db: Session,
    device: Device,
    task_id: int,
    employee_id: int | None,
    comment: str | None,
    filename: str | None,
    content_type: str | None,
    file_bytes: bytes | None,
) -> StoreTaskRead:
    task = get_store_task_for_device(db, device, task_id)
    if task.status not in {"open", "in_progress", "rejected"}:
        raise StoreTaskError("invalid_status", "Task cannot be submitted in current status")
    if device.store_id is None:
        raise StoreTaskError("device_store_required", "Device is not linked to a store")

    clean_comment = comment.strip() if comment else None
    if task.requires_photo and not file_bytes:
        raise StoreTaskError("file_required", "Add a photo")
    if task.requires_comment and not clean_comment:
        raise StoreTaskError("comment_required", "Add a comment")

    store = db.get(Store, device.store_id)
    if store is None:
        raise StoreTaskError("store_not_found", "Store not found")

    try:
        resolved_employee_id = resolve_employee_id(db, device.store_id, employee_id)
    except StoreRequestError as exc:
        raise StoreTaskError(exc.code, exc.message) from exc

    now = datetime.now(timezone.utc)
    if file_bytes:
        if content_type is None:
            raise StoreTaskError("invalid_file_type", "Only JPEG, PNG, or WEBP are supported")
        file_path = save_store_task_file(store, task, filename, content_type, file_bytes)
        db.add(
            StoreTaskAttachment(
                task_id=task.id,
                file_path=file_path,
                rocket_file_id=None,
                attachment_type="completion_photo",
                created_at=now,
            ),
        )
        add_task_event(db, task, "attachment_added", "device", device.id)

    task.completed_by_employee_id = resolved_employee_id
    task.completed_at = now
    task.status = "submitted" if task.requires_verification else "completed"
    add_task_event(
        db,
        task,
        task.status,
        "employee" if resolved_employee_id is not None else "device",
        resolved_employee_id or device.id,
        clean_comment,
    )
    db.add(task)
    db.commit()
    db.refresh(task)
    return task_to_read(task)


def verify_store_task(db: Session, task: StoreTask, user_id: int | None = None) -> StoreTask:
    task.status = "verified"
    task.verified_by = user_id
    task.verified_at = datetime.now(timezone.utc)
    add_task_event(db, task, "verified", "admin", user_id)
    db.add(task)
    return task


def reject_store_task(db: Session, task: StoreTask, reason: str, user_id: int | None = None) -> StoreTask:
    clean_reason = reason.strip()
    if not clean_reason:
        raise StoreTaskError("comment_required", "Reject reason is required")

    task.status = "rejected"
    add_task_event(db, task, "rejected", "admin", user_id, clean_reason)
    db.add(task)
    return task
