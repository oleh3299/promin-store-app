from datetime import datetime, timezone

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import (
    AttendanceEvent,
    AttendanceEventSource,
    AttendanceEventType,
    AttendanceShift,
    Device,
    Employee,
    ShiftStatus,
)
from app.schemas.attendance import AttendanceCheckInRequest, AttendanceCheckOutRequest


def resolve_employee(db: Session, employee_id: int | None, barcode: str | None) -> Employee:
    if employee_id is None and not barcode:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="employee_id or barcode is required",
        )

    statement = select(Employee).where(Employee.is_active.is_(True))
    if employee_id is not None:
        statement = statement.where(Employee.id == employee_id)
    else:
        statement = statement.where(Employee.barcode == barcode)

    employee = db.scalar(statement)
    if employee is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Employee not found")

    return employee


def resolve_store_id(device: Device, store_id: int | None) -> int:
    _ = store_id
    resolved_store_id = device.store_id
    if resolved_store_id is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="device store_id is required",
        )
    return resolved_store_id


def check_in(db: Session, device: Device, payload: AttendanceCheckInRequest) -> tuple[AttendanceShift, AttendanceEvent]:
    employee = resolve_employee(db, payload.employee_id, payload.barcode)
    store_id = resolve_store_id(device, payload.store_id)

    existing_shift = db.scalar(
        select(AttendanceShift).where(
            AttendanceShift.employee_id == employee.id,
            AttendanceShift.store_id == store_id,
            AttendanceShift.status == ShiftStatus.open,
        ),
    )
    if existing_shift is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Shift already open")

    event_time = payload.event_time or datetime.now(timezone.utc)
    shift = AttendanceShift(
        employee_id=employee.id,
        store_id=store_id,
        device_id=device.id,
        checkin_at=event_time,
        status=ShiftStatus.open,
    )
    db.add(shift)
    db.flush()

    event = AttendanceEvent(
        shift_id=shift.id,
        employee_id=employee.id,
        store_id=store_id,
        device_id=device.id,
        event_type=AttendanceEventType.checkin,
        event_time=event_time,
        source=AttendanceEventSource.pwa,
        raw_payload=payload.raw_payload,
    )
    db.add(event)
    db.commit()
    db.refresh(shift)
    db.refresh(event)
    return shift, event


def check_out(db: Session, device: Device, payload: AttendanceCheckOutRequest) -> tuple[AttendanceShift, AttendanceEvent]:
    employee = resolve_employee(db, payload.employee_id, payload.barcode)
    store_id = resolve_store_id(device, payload.store_id)

    shift = db.scalar(
        select(AttendanceShift).where(
            AttendanceShift.employee_id == employee.id,
            AttendanceShift.store_id == store_id,
            AttendanceShift.status == ShiftStatus.open,
        ),
    )
    if shift is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Open shift not found")

    event_time = payload.event_time or datetime.now(timezone.utc)
    shift.checkout_at = event_time
    shift.status = ShiftStatus.closed

    event = AttendanceEvent(
        shift_id=shift.id,
        employee_id=employee.id,
        store_id=store_id,
        device_id=device.id,
        event_type=AttendanceEventType.checkout,
        event_time=event_time,
        source=AttendanceEventSource.pwa,
        raw_payload=payload.raw_payload,
    )
    db.add(event)
    db.commit()
    db.refresh(shift)
    db.refresh(event)
    return shift, event
