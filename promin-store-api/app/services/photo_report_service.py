from dataclasses import dataclass
from datetime import datetime, timezone
import json
import logging
import re

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Device, Employee, PhotoReport, PhotoReportItem, PhotoReportTemplate, Store
from app.schemas.photo_report import PhotoReportTemplateItemRead
from app.services.invoice_service import ALLOWED_INVOICE_CONTENT_TYPES, MAX_INVOICE_FILE_SIZE, safe_invoice_filename
from app.services.rocket_chat_service import RocketChatError, RocketChatService
from app.services.store_request_service import StoreRequestError, resolve_employee_id


DEFAULT_PHOTO_REPORT_ITEMS = [
    ("entrance", "Вхідна група"),
    ("vegetables", "Овочева зона"),
    ("milk_fridge", "Молочна вітрина"),
    ("sausage_fridge", "Ковбасна вітрина"),
    ("cash_zone", "Прикаса"),
    ("checkout", "Каса"),
    ("promo_price_tags", "Акційні цінники"),
    ("general_view", "Загальний вигляд магазину"),
]

TRANSLIT = {
    "а": "a",
    "б": "b",
    "в": "v",
    "г": "h",
    "ґ": "g",
    "д": "d",
    "е": "e",
    "є": "je",
    "ж": "zh",
    "з": "z",
    "и": "y",
    "і": "i",
    "ї": "ji",
    "й": "j",
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
    "щ": "sch",
    "ь": "",
    "ю": "ju",
    "я": "ja",
}

logger = logging.getLogger(__name__)


@dataclass
class PhotoReportUploadResult:
    report_id: int
    items_done: int
    items_total: int
    status: str


@dataclass
class PhotoReportItemUploadResult:
    report_id: int
    item_id: int
    items_done: int
    items_total: int
    status: str


def ensure_photo_report_template(db: Session, store_id: int) -> list[PhotoReportTemplate]:
    templates = list(
        db.scalars(
            select(PhotoReportTemplate)
            .where(
                PhotoReportTemplate.store_id == store_id,
                PhotoReportTemplate.is_active.is_(True),
            )
            .order_by(PhotoReportTemplate.sort_order.asc(), PhotoReportTemplate.id.asc()),
        ),
    )
    if templates:
        return templates

    templates = [
        PhotoReportTemplate(
            store_id=store_id,
            item_key=item_key,
            item_name=item_name,
            sort_order=index,
            is_required=True,
            is_active=True,
        )
        for index, (item_key, item_name) in enumerate(DEFAULT_PHOTO_REPORT_ITEMS, start=1)
    ]
    db.add_all(templates)
    db.commit()
    for template in templates:
        db.refresh(template)
    return templates


def get_photo_report_template(db: Session, device: Device) -> list[PhotoReportTemplateItemRead]:
    if device.store_id is None:
        return []

    return [
        PhotoReportTemplateItemRead(
            id=template.id,
            item_key=template.item_key,
            item_name=template.item_name,
            title=template.item_name,
            description=template.description,
            sort_order=template.sort_order,
            is_required=template.is_required,
        )
        for template in ensure_photo_report_template(db, device.store_id)
    ]


def photo_report_channel_candidates(store: Store) -> list[str]:
    source = store.name or store.code
    transliterated = "".join(TRANSLIT.get(char.lower(), char) for char in source)
    compact = re.sub(r"[^A-Za-z0-9]+", "", transliterated)
    compact = compact or store.code
    title_compact = compact[:1].upper() + compact[1:]
    without_letter_suffix = re.sub(r"(?<=\d)[A-Za-z]+$", "", title_compact)
    candidates = [
        f"photo-reports_{title_compact}",
        f"photo-reports_{without_letter_suffix}",
        f"photo-reports_{compact.lower()}",
        f"photo-reports_{store.code}",
    ]
    return list(dict.fromkeys(candidates))


def resolve_photo_report_room_id(rocket: RocketChatService, store: Store) -> str:
    last_error: RocketChatError | None = None
    for channel_name in photo_report_channel_candidates(store):
        try:
            return rocket.get_room_id_by_name(channel_name)
        except RocketChatError as exc:
            last_error = exc

    raise RocketChatError("Rocket.Chat photo report room not found") from last_error


def format_report_date(value: datetime) -> str:
    return value.strftime("%d.%m.%Y")


def build_photo_report_message(
    store: Store,
    report_date: datetime,
    item_title: str,
    employee: Employee | None,
) -> str:
    employee_label = employee.full_name if employee is not None else "не вказано"
    return "\n".join(
        [
            f"Магазин: {store.name} / {store.code}",
            f"Дата: {format_report_date(report_date)}",
            f"Пункт: {item_title}",
            f"Співробітник: {employee_label}",
        ],
    )


def parse_item_ids(item_ids_json: str) -> list[int]:
    try:
        raw_item_ids = json.loads(item_ids_json)
    except json.JSONDecodeError as exc:
        raise StoreRequestError("invalid_items", "Некоректний список пунктів") from exc

    if not isinstance(raw_item_ids, list):
        raise StoreRequestError("invalid_items", "Некоректний список пунктів")

    item_ids: list[int] = []
    for value in raw_item_ids:
        if not isinstance(value, int):
            raise StoreRequestError("invalid_items", "Некоректний список пунктів")
        item_ids.append(value)
    return item_ids


def create_photo_report(
    db: Session,
    device: Device,
    employee_id: int | None,
    item_ids_json: str,
    files: list[tuple[str | None, str, bytes]],
) -> PhotoReportUploadResult:
    if device.store_id is None:
        raise StoreRequestError("device_store_required", "Пристрій не прив'язаний до магазину")

    store = db.get(Store, device.store_id)
    if store is None:
        raise StoreRequestError("store_not_found", "Магазин не знайдено")

    templates = ensure_photo_report_template(db, device.store_id)
    templates_by_id = {template.id: template for template in templates}
    item_ids = parse_item_ids(item_ids_json)
    required_ids = [template.id for template in templates if template.is_required]

    if len(item_ids) != len(set(item_ids)) or len(files) != len(item_ids):
        raise StoreRequestError("invalid_items", "Некоректний список пунктів")

    unknown_ids = [item_id for item_id in item_ids if item_id not in templates_by_id]
    if unknown_ids:
        raise StoreRequestError("invalid_items", "Некоректний список пунктів")

    missing_required_ids = [item_id for item_id in required_ids if item_id not in item_ids]
    if missing_required_ids:
        raise StoreRequestError("incomplete_report", "Додайте фото до всіх обов'язкових пунктів")

    for _, content_type, file_bytes in files:
        if content_type not in ALLOWED_INVOICE_CONTENT_TYPES:
            raise StoreRequestError("invalid_file_type", "Підтримуються лише JPEG, PNG або WEBP")
        if len(file_bytes) > MAX_INVOICE_FILE_SIZE:
            raise StoreRequestError("file_too_large", "Фото завелике")

    resolved_employee_id = resolve_employee_id(db, device.store_id, employee_id)
    employee = db.get(Employee, resolved_employee_id) if resolved_employee_id is not None else None
    rocket = RocketChatService()
    room_id = resolve_photo_report_room_id(rocket, store)
    now = datetime.now(timezone.utc)

    report = PhotoReport(
        store_id=device.store_id,
        device_id=device.id,
        employee_id=resolved_employee_id,
        items_done=0,
        items_total=len(required_ids),
        status="failed",
        created_at=now,
    )
    db.add(report)
    db.commit()
    db.refresh(report)

    items_done = 0
    try:
        for item_id, (filename, content_type, file_bytes) in zip(item_ids, files, strict=True):
            template = templates_by_id[item_id]
            message = build_photo_report_message(store, now, template.item_name, employee)
            result = rocket.upload_file(
                room_id,
                safe_invoice_filename(filename, content_type),
                content_type,
                file_bytes,
                message,
                template.item_name,
            )
            db.add(
                PhotoReportItem(
                    report_id=report.id,
                    template_id=template.id,
                    title=template.item_name,
                    rocket_room_id=room_id,
                    rocket_file_id=result.file_id,
                    rocket_message_id=result.message_id,
                    status="sent",
                    created_at=now,
                    sent_at=datetime.now(timezone.utc),
                ),
            )
            items_done += 1

        required_done = sum(1 for item_id in item_ids if templates_by_id[item_id].is_required)
        report.items_done = required_done
        report.status = "sent"
        report.sent_at = datetime.now(timezone.utc)
        db.add(report)
        db.commit()
        logger.info(
            "photo_report_sent",
            extra={
                "store_id": device.store_id,
                "device_id": device.id,
                "items_done": required_done,
                "items_total": len(required_ids),
                "status": "sent",
            },
        )
        return PhotoReportUploadResult(
            report_id=report.id,
            items_done=required_done,
            items_total=len(required_ids),
            status="sent",
        )
    except RocketChatError as exc:
        report.items_done = items_done
        report.status = "failed"
        db.add(report)
        if item_ids:
            failed_template = templates_by_id[item_ids[min(items_done, len(item_ids) - 1)]]
            db.add(
                PhotoReportItem(
                    report_id=report.id,
                    template_id=failed_template.id,
                    title=failed_template.item_name,
                    rocket_room_id=room_id,
                    status="failed",
                    error_text=str(exc),
                    created_at=now,
                ),
            )
        db.commit()
        logger.warning(
            "photo_report_failed",
            extra={
                "store_id": device.store_id,
                "device_id": device.id,
                "items_done": items_done,
                "items_total": len(required_ids),
                "status": "failed",
            },
        )
        raise StoreRequestError("delivery_failed", "Не вдалося надіслати фотоотчет") from exc



def count_required_report_items(db: Session, report_id: int, required_ids: set[int]) -> int:
    if not required_ids:
        return 0

    sent_template_ids = set(
        db.scalars(
            select(PhotoReportItem.template_id).where(
                PhotoReportItem.report_id == report_id,
                PhotoReportItem.status == "sent",
                PhotoReportItem.template_id.in_(required_ids),
            ),
        ),
    )
    return len(sent_template_ids)


def upload_photo_report_item(
    db: Session,
    device: Device,
    employee_id: int | None,
    report_id: int | None,
    item_id: int,
    filename: str | None,
    content_type: str,
    file_bytes: bytes,
) -> PhotoReportItemUploadResult:
    if device.store_id is None:
        raise StoreRequestError("device_store_required", "Device is not linked to a store")

    if content_type not in ALLOWED_INVOICE_CONTENT_TYPES:
        raise StoreRequestError("invalid_file_type", "Only JPEG, PNG, or WEBP are supported")
    if len(file_bytes) > MAX_INVOICE_FILE_SIZE:
        raise StoreRequestError("file_too_large", "Photo is too large")

    store = db.get(Store, device.store_id)
    if store is None:
        raise StoreRequestError("store_not_found", "Store not found")

    templates = ensure_photo_report_template(db, device.store_id)
    templates_by_id = {template.id: template for template in templates}
    template = templates_by_id.get(item_id)
    if template is None:
        raise StoreRequestError("invalid_items", "Invalid photo report item")

    required_ids = {template.id for template in templates if template.is_required}
    resolved_employee_id = resolve_employee_id(db, device.store_id, employee_id)
    employee = db.get(Employee, resolved_employee_id) if resolved_employee_id is not None else None
    now = datetime.now(timezone.utc)

    report = db.get(PhotoReport, report_id) if report_id is not None else None
    if report_id is not None and (report is None or report.store_id != device.store_id or report.device_id != device.id):
        raise StoreRequestError("report_not_found", "Photo report not found")

    if report is None:
        report = PhotoReport(
            store_id=device.store_id,
            device_id=device.id,
            employee_id=resolved_employee_id,
            items_done=0,
            items_total=len(required_ids),
            status="failed",
            created_at=now,
        )
        db.add(report)
        db.commit()
        db.refresh(report)

    existing_item = db.scalar(
        select(PhotoReportItem).where(
            PhotoReportItem.report_id == report.id,
            PhotoReportItem.template_id == template.id,
            PhotoReportItem.status == "sent",
        ),
    )
    if existing_item is not None:
        items_done = count_required_report_items(db, report.id, required_ids)
        report.items_done = items_done
        if items_done >= len(required_ids):
            report.status = "sent"
            report.sent_at = datetime.now(timezone.utc)
        db.add(report)
        db.commit()
        return PhotoReportItemUploadResult(report.id, template.id, items_done, len(required_ids), report.status)

    rocket = RocketChatService()
    room_id = resolve_photo_report_room_id(rocket, store)
    message = build_photo_report_message(store, now, template.item_name, employee)
    try:
        result = rocket.upload_file(
            room_id,
            safe_invoice_filename(filename, content_type),
            content_type,
            file_bytes,
            message,
            template.item_name,
        )
    except RocketChatError as exc:
        db.add(
            PhotoReportItem(
                report_id=report.id,
                template_id=template.id,
                title=template.item_name,
                rocket_room_id=room_id,
                status="failed",
                error_text=str(exc),
                created_at=now,
            ),
        )
        db.commit()
        raise StoreRequestError("delivery_failed", "Could not send photo") from exc

    db.add(
        PhotoReportItem(
            report_id=report.id,
            template_id=template.id,
            title=template.item_name,
            rocket_room_id=room_id,
            rocket_file_id=result.file_id,
            rocket_message_id=result.message_id,
            status="sent",
            created_at=now,
            sent_at=datetime.now(timezone.utc),
        ),
    )
    items_done = count_required_report_items(db, report.id, required_ids)
    report.items_done = items_done
    if items_done >= len(required_ids):
        report.status = "sent"
        report.sent_at = datetime.now(timezone.utc)
    else:
        report.status = "failed"
    db.add(report)
    db.commit()

    return PhotoReportItemUploadResult(report.id, template.id, items_done, len(required_ids), report.status)
