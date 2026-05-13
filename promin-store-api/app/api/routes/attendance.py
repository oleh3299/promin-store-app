from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import AttendanceShift, Device, ShiftStatus
from app.schemas.attendance import (
    AttendanceActionResponse,
    AttendanceCheckInRequest,
    AttendanceCheckOutRequest,
    AttendanceShiftRead,
)
from app.security import get_current_device
from app.services.attendance import check_in, check_out

router = APIRouter(prefix="/attendance", tags=["attendance"])


@router.post("/checkin", response_model=AttendanceActionResponse)
def attendance_checkin(
    payload: AttendanceCheckInRequest,
    db: Session = Depends(get_db),
    current_device: Device = Depends(get_current_device),
) -> AttendanceActionResponse:
    shift, event = check_in(db, current_device, payload)
    return AttendanceActionResponse(shift=shift, event_id=event.id)


@router.post("/checkout", response_model=AttendanceActionResponse)
def attendance_checkout(
    payload: AttendanceCheckOutRequest,
    db: Session = Depends(get_db),
    current_device: Device = Depends(get_current_device),
) -> AttendanceActionResponse:
    shift, event = check_out(db, current_device, payload)
    return AttendanceActionResponse(shift=shift, event_id=event.id)


@router.get("/open-shifts", response_model=list[AttendanceShiftRead])
def open_shifts(
    db: Session = Depends(get_db),
    current_device: Device = Depends(get_current_device),
) -> list[AttendanceShift]:
    statement = select(AttendanceShift).where(AttendanceShift.status == ShiftStatus.open)
    if current_device.store_id is not None:
        statement = statement.where(AttendanceShift.store_id == current_device.store_id)

    return list(db.scalars(statement.order_by(AttendanceShift.checkin_at.desc())))
