from datetime import datetime

from pydantic import BaseModel, Field

from app.models.enums import ShiftStatus


class AttendanceCheckInRequest(BaseModel):
    employee_id: int | None = None
    barcode: str | None = None
    store_id: int | None = None
    event_time: datetime | None = None
    raw_payload: dict | None = None


class AttendanceCheckOutRequest(BaseModel):
    employee_id: int | None = None
    barcode: str | None = None
    store_id: int | None = None
    event_time: datetime | None = None
    raw_payload: dict | None = None


class AttendanceShiftRead(BaseModel):
    id: int
    employee_id: int
    store_id: int
    device_id: int | None
    checkin_at: datetime
    checkout_at: datetime | None
    status: ShiftStatus

    model_config = {"from_attributes": True}


class AttendanceActionResponse(BaseModel):
    shift: AttendanceShiftRead
    event_id: int = Field(description="Created attendance event id")
