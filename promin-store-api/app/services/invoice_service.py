from dataclasses import dataclass
from datetime import datetime, timezone
import logging
from pathlib import PurePath

from sqlalchemy.orm import Session

from app.models import Device, Employee, InvoiceUploadLog, Store
from app.schemas.invoice import InvoiceRequestType
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

logger = logging.getLogger(__name__)


@dataclass
class InvoiceUploadResult:
    status: str
    request_type: str


def build_invoice_message(
    store: Store,
    device: Device,
    request_type: InvoiceRequestType,
    employee: Employee | None,
    comment: str | None,
) -> str:
    employee_label = employee.full_name if employee is not None else "не вказано"
    device_label = device.login or device.device_name
    lines = [
        f"Магазин: {store.name} / {store.code}",
        f"Пристрій: {device_label}",
        f"Тип документа: {INVOICE_TYPE_LABELS[request_type]}",
        f"Співробітник: {employee_label}",
    ]
    if comment:
        lines.extend(["", f"Коментар: {comment}"])
    lines.extend(["", "Файл: фото накладної"])
    return "\n".join(lines)


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
    message = build_invoice_message(store, device, request_type, employee, comment.strip() if comment else None)

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
            "Фото накладної",
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
