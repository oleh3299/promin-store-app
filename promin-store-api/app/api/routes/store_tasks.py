from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import Device
from app.schemas.store_task import StoreTaskActionResponse, StoreTaskDetail, StoreTaskListResponse
from app.security import get_current_device
from app.services.store_task_service import (
    MAX_STORE_TASK_FILE_SIZE,
    StoreTaskError,
    get_store_task_for_device,
    list_store_tasks_for_device,
    start_store_task,
    submit_store_task,
    task_to_detail,
)

router = APIRouter(prefix="/store-tasks", tags=["store-tasks"])


def parse_status_filter(status_filter: str | None) -> list[str] | None:
    if not status_filter:
        return None
    return [status.strip() for status in status_filter.split(",") if status.strip()]


@router.get("", response_model=StoreTaskListResponse)
def get_store_tasks(
    status: str | None = None,
    status_filter: str | None = None,
    db: Session = Depends(get_db),
    current_device: Device = Depends(get_current_device),
) -> StoreTaskListResponse:
    return StoreTaskListResponse(
        items=list_store_tasks_for_device(db, current_device, parse_status_filter(status_filter or status)),
    )


@router.get("/{task_id}", response_model=StoreTaskDetail)
def get_store_task(
    task_id: int,
    db: Session = Depends(get_db),
    current_device: Device = Depends(get_current_device),
) -> StoreTaskDetail:
    try:
        task = get_store_task_for_device(db, current_device, task_id)
    except StoreTaskError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=exc.code) from exc
    return task_to_detail(task)


@router.post("/{task_id}/start", response_model=StoreTaskActionResponse)
def start_task(
    task_id: int,
    db: Session = Depends(get_db),
    current_device: Device = Depends(get_current_device),
) -> StoreTaskActionResponse:
    try:
        task = start_store_task(db, current_device, task_id)
    except StoreTaskError as exc:
        return StoreTaskActionResponse(ok=False, error=exc.code, message=exc.message)
    return StoreTaskActionResponse(ok=True, status=task.status, task=task)


@router.post("/{task_id}/submit", response_model=StoreTaskActionResponse)
async def submit_task(
    task_id: int,
    employee_id: int | None = Form(default=None),
    comment: str | None = Form(default=None),
    file: UploadFile | None = File(default=None),
    db: Session = Depends(get_db),
    current_device: Device = Depends(get_current_device),
) -> StoreTaskActionResponse:
    file_bytes: bytes | None = None
    if file is not None and file.filename:
        file_bytes = await file.read(MAX_STORE_TASK_FILE_SIZE + 1)

    try:
        task = submit_store_task(
            db,
            current_device,
            task_id,
            employee_id,
            comment,
            file.filename if file else None,
            file.content_type if file else None,
            file_bytes,
        )
    except StoreTaskError as exc:
        return StoreTaskActionResponse(ok=False, error=exc.code, message=exc.message)

    return StoreTaskActionResponse(ok=True, status=task.status, task=task)
