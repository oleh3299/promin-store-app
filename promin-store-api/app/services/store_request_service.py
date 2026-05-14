from dataclasses import dataclass
from datetime import datetime, timezone
import logging

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import (
    AttendanceShift,
    Device,
    Employee,
    RocketRoute,
    ShiftStatus,
    Store,
    StoreRequestLog,
)
from app.schemas.store_request import ActiveStoreEmployeeRead, StoreRequestCreate
from app.services.rocket_chat_service import RocketChatError, RocketChatService


logger = logging.getLogger(__name__)


class StoreRequestError(Exception):
    def __init__(self, code: str, message: str) -> None:
        self.code = code
        self.message = message
        super().__init__(message)


@dataclass
class StoreRequestResult:
    status: str
    route_key: str


def get_open_shift_rows(db: Session, store_id: int) -> list[tuple[AttendanceShift, Employee]]:
    return list(
        db.execute(
            select(AttendanceShift, Employee)
            .join(Employee, Employee.id == AttendanceShift.employee_id)
            .where(
                AttendanceShift.store_id == store_id,
                AttendanceShift.status == ShiftStatus.open,
            )
            .order_by(AttendanceShift.checkin_at.asc()),
        ).all(),
    )


def get_active_store_employees(db: Session, device: Device) -> list[ActiveStoreEmployeeRead]:
    if device.store_id is None:
        return []

    return [
        ActiveStoreEmployeeRead(
            employee_id=employee.id,
            full_name=employee.full_name,
            position=employee.position,
            checkin_at=shift.checkin_at,
        )
        for shift, employee in get_open_shift_rows(db, device.store_id)
    ]


def resolve_employee_id(
    db: Session,
    store_id: int,
    employee_id: int | None,
) -> int | None:
    open_shift_rows = get_open_shift_rows(db, store_id)

    if employee_id is not None:
        if any(employee.id == employee_id for _, employee in open_shift_rows):
            return employee_id
        raise StoreRequestError(
            "employee_not_on_shift",
            "Обраний співробітник не має відкритої зміни в цьому магазині",
        )

    if len(open_shift_rows) == 1:
        return open_shift_rows[0][1].id

    if len(open_shift_rows) > 1:
        raise StoreRequestError(
            "employee_required",
            "Оберіть співробітника, який відправляє заявку",
        )

    return None


def resolve_route(db: Session, route_key: str, store_id: int) -> RocketRoute | None:
    logger.info(
        "store_request_route_lookup_started",
        extra={"route_key": route_key, "store_id": store_id, "scope": "store"},
    )
    store_route = db.scalar(
        select(RocketRoute).where(
            RocketRoute.route_key == route_key,
            RocketRoute.scope == "store",
            RocketRoute.store_id == store_id,
            RocketRoute.is_active.is_(True),
        ),
    )
    if store_route is not None:
        logger.info(
            "store_request_route_resolved",
            extra={
                "route_key": route_key,
                "store_id": store_id,
                "scope": "store",
                "room_id": store_route.room_id,
            },
        )
        return store_route

    logger.info(
        "store_request_route_lookup_started",
        extra={"route_key": route_key, "store_id": store_id, "scope": "global"},
    )
    global_route = db.scalar(
        select(RocketRoute).where(
            RocketRoute.route_key == route_key,
            RocketRoute.scope == "global",
            RocketRoute.store_id.is_(None),
            RocketRoute.is_active.is_(True),
        ),
    )
    if global_route is not None:
        logger.info(
            "store_request_route_resolved",
            extra={
                "route_key": route_key,
                "store_id": store_id,
                "scope": "global",
                "room_id": global_route.room_id,
            },
        )
    else:
        logger.warning(
            "store_request_route_not_configured",
            extra={"route_key": route_key, "store_id": store_id},
        )

    return global_route


def format_store_request_message(
    store: Store,
    device: Device,
    payload: StoreRequestCreate,
    employee: Employee | None,
) -> str:
    employee_label = employee.full_name if employee is not None else "не вказано"
    request_type = payload.request_type or "не вказано"
    device_label = device.login or device.device_name
    store_label = f"{store.name} / {store.code}"

    return "\n".join(
        [
            f"Магазин: {store_label}",
            f"Пристрій: {device_label}",
            f"Тип заявки: {payload.route_key} / {request_type}",
            f"Співробітник: {employee_label}",
            "",
            "Повідомлення:",
            payload.message,
        ],
    )


def create_store_request(
    db: Session,
    device: Device,
    payload: StoreRequestCreate,
) -> StoreRequestResult:
    if device.store_id is None:
        raise StoreRequestError(
            "device_store_required",
            "Пристрій не прив'язаний до магазину",
        )

    store = db.get(Store, device.store_id)
    if store is None:
        raise StoreRequestError("store_not_found", "Магазин не знайдено")

    employee_id = resolve_employee_id(db, device.store_id, payload.employee_id)
    employee = db.get(Employee, employee_id) if employee_id is not None else None
    route = resolve_route(db, payload.route_key, device.store_id)
    if route is None:
        raise StoreRequestError(
            "route_not_configured",
            "Маршрут для цього типу заявки не налаштований",
        )

    now = datetime.now(timezone.utc)
    log = StoreRequestLog(
        store_id=device.store_id,
        device_id=device.id,
        employee_id=employee_id,
        route_key=payload.route_key,
        request_type=payload.request_type,
        rocket_room_id=route.room_id,
        status="failed",
        created_at=now,
    )

    text = format_store_request_message(store, device, payload, employee)
    logger.info(
        "store_request_delivery_started",
        extra={
            "route_key": payload.route_key,
            "store_id": device.store_id,
            "device_id": device.id,
            "room_id": route.room_id,
            "status": "pending",
        },
    )
    try:
        result = RocketChatService().send_message(route.room_id, text)
    except RocketChatError as exc:
        log.error_text = str(exc)
        db.add(log)
        db.commit()
        logger.warning(
            "store_request_delivery_failed",
            extra={
                "route_key": payload.route_key,
                "store_id": device.store_id,
                "device_id": device.id,
                "room_id": route.room_id,
                "status": "failed",
            },
        )
        raise StoreRequestError("delivery_failed", "Не вдалося відправити заявку") from exc

    log.status = "sent"
    log.rocket_message_id = result.message_id
    log.sent_at = datetime.now(timezone.utc)
    db.add(log)
    db.commit()
    logger.info(
        "store_request_delivery_sent",
        extra={
            "route_key": payload.route_key,
            "store_id": device.store_id,
            "device_id": device.id,
            "room_id": route.room_id,
            "status": "sent",
        },
    )
    return StoreRequestResult(status="sent", route_key=payload.route_key)
