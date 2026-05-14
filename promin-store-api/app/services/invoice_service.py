from dataclasses import dataclass
from datetime import datetime, time, timezone
import logging
from pathlib import PurePath
from zoneinfo import ZoneInfo

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Device, Employee, InvoiceUploadLog, Store
from app.schemas.invoice import InvoiceRequestType, InvoiceTodayItem
from app.services.rocket_chat_service import RocketChatError, RocketChatService
from app.services.store_request_service import StoreRequestError, resolve_employee_id, resolve_route


MAX_INVOICE_FILE_SIZE = 10 * 1024 * 1024
ALLOWED_INVOICE_CONTENT_TYPES = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
}
INVOICE_TYPE_LABELS: dict[InvoiceRequestType, str] = {
    "incoming": "Поступлення",
    "return": "Повернення",
    "writeoff": "Списання",
    "assembly": "Комплектація",
}
LOCAL_TIMEZONE = ZoneInfo("Europe/Uzhgorod")

logger = logging.getLogger(__name__)


@dataclass
class InvoiceUploadResult:
    status: str
    request_type: str


def build_invoice_message(
    store: Store,
    request_type: InvoiceRequestType,
    employee: Employee | None,
    comment: str | None,
    created_at: datetime,
) -> str:
    local_created_at = created_at.astimezone(LOCAL_TIMEZONE)
    employee_label = employee.full_name if employee is not None else "не вказано"
    comment_label = comment if comment else "не вказано"
    lines = [
        f"Магазин: {store.name} / {store.code}",
        f"Дата: {local_created_at:%d.%m.%Y}",
        f"Час: {local_created_at:%H:%M}",
        f"Тип документа: {INVOICE_TYPE_LABELS[request_type]}",
        f"Співробітник: {employee_label}",
        f"Коментар: {comment_label}",
    ]
    return "\n".join(lines)


def get_today_invoice_uploads(db: Session, device: Device) -> list[InvoiceTodayItem]:
    if device.store_id is None:
        return []

    now_local = datetime.now(LOCAL_TIMEZONE)
    day_start_local = datetime.combine(now_local.date(), time.min, tzinfo=LOCAL_TIMEZONE)
    day_end_local = datetime.combine(now_local.date(), time.max, tzinfo=LOCAL_TIMEZONE)
    day_start_utc = day_start_local.astimezone(timezone.utc)
    day_end_utc = day_end_local.astimezone(timezone.utc)

    rows = db.execute(
        select(InvoiceUploadLog, Employee.full_name)
        .outerjoin(Employee, Employee.id == InvoiceUploadLog.employee_id)
        .where(
            InvoiceUploadLog.store_id == device.store_id,
            InvoiceUploadLog.device_id == device.id,
            InvoiceUploadLog.status == "sent",
            InvoiceUploadLog.created_at >= day_start_utc,
            InvoiceUploadLog.created_at <= day_end_utc,
        )
        .order_by(InvoiceUploadLog.created_at.desc())
    ).all()

    return [
        InvoiceTodayItem(
            id=log.id,
            request_type=log.request_type,
            request_type_label=INVOICE_TYPE_LABELS.get(log.request_type, log.request_type),
            employee_name=employee_name,
            status=log.status,
            created_at=log.created_at.isoformat(),
            sent_at=log.sent_at.isoformat() if log.sent_at else None,
        )
        for log, employee_name in rows
    ]


def safe_invoice_filename(filename: str | None, content_type: str) -> str:
    extension = ALLOWED_INVOICE_CONTENT_TYPES[content_type]
    raw_name = PurePath(filename or "").name
    stem = raw_name.rsplit(".", 1)[0] if raw_name else "invoice"
    safe_stem = "".join(char for char in stem if char.isascii() and (char.isalnum() or char in ("-", "_")))[:48]
    return f"{safe_stem or 'invoice'}.{extension}"


def upload_invoice(
    db: Session,
    device: Device,
    request_type: InvoiceRequestType,
    employee_id: int | None,
    comment: str | None,
    filename: str | None,
    content_type: str,
    file_bytes: bytes,
) -> InvoiceUploadResult:
    if device.store_id is None:
        raise StoreRequestError("device_store_required", "Пристрій не прив'язаний до магазину")

    store = db.get(Store, device.store_id)
    if store is None:
        raise StoreRequestError("store_not_found", "Магазин не знайдено")

    if content_type not in ALLOWED_INVOICE_CONTENT_TYPES:
        raise StoreRequestError("invalid_file_type", "Підтримуються лише JPEG, PNG або WEBP")

    if len(file_bytes) > MAX_INVOICE_FILE_SIZE:
        raise StoreRequestError("file_too_large", "Фото завелике")

    resolved_employee_id = resolve_employee_id(db, device.store_id, employee_id)
    employee = db.get(Employee, resolved_employee_id) if resolved_employee_id is not None else None
    route = resolve_route(db, "accounting", device.store_id)
    if route is None:
        raise StoreRequestError(
            "route_not_configured",
            "Маршрут для бухгалтерії не налаштований",
        )

    now = datetime.now(timezone.utc)
    log = InvoiceUploadLog(
        store_id=device.store_id,
        device_id=device.id,
        employee_id=resolved_employee_id,
        request_type=request_type,
        rocket_room_id=route.room_id,
        status="failed",
        created_at=now,
    )
    message = build_invoice_message(store, request_type, employee, comment.strip() if comment else None, now)

    logger.info(
        "invoice_upload_started",
        extra={
            "request_type": request_type,
            "store_id": device.store_id,
            "device_id": device.id,
            "room_id": route.room_id,
            "status": "pending",
        },
    )
    try:
        result = RocketChatService().upload_file(
            route.room_id,
            safe_invoice_filename(filename, content_type),
            content_type,
            file_bytes,
            message,
            "",
        )
    except RocketChatError as exc:
        log.error_text = str(exc)
        db.add(log)
        db.commit()
        logger.warning(
            "invoice_upload_failed",
            extra={
                "request_type": request_type,
                "store_id": device.store_id,
                "device_id": device.id,
                "room_id": route.room_id,
                "status": "failed",
            },
        )
        raise StoreRequestError("delivery_failed", "Не вдалося надіслати накладну") from exc

    log.status = "sent"
    log.rocket_file_id = result.file_id
    log.rocket_message_id = result.message_id
    log.sent_at = datetime.now(timezone.utc)
    db.add(log)
    db.commit()
    logger.info(
        "invoice_upload_sent",
        extra={
            "request_type": request_type,
            "store_id": device.store_id,
            "device_id": device.id,
            "room_id": route.room_id,
            "status": "sent",
        },
    )
    return InvoiceUploadResult(status="sent", request_type=request_type)
