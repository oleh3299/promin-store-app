from datetime import datetime

from sqlalchemy import DateTime, Enum, ForeignKey, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base
from app.models.base import TimestampMixin
from app.models.enums import AttendanceEventSource, AttendanceEventType, ShiftStatus


class AttendanceShift(TimestampMixin, Base):
    __tablename__ = "attendance_shifts"

    id: Mapped[int] = mapped_column(primary_key=True)
    employee_id: Mapped[int] = mapped_column(ForeignKey("employees.id"), nullable=False)
    store_id: Mapped[int] = mapped_column(ForeignKey("stores.id"), nullable=False)
    device_id: Mapped[int | None] = mapped_column(ForeignKey("devices.id"), nullable=True)
    checkin_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    checkout_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    status: Mapped[ShiftStatus] = mapped_column(
        Enum(ShiftStatus, name="shift_status"),
        default=ShiftStatus.open,
        nullable=False,
    )

    employee = relationship("Employee", back_populates="shifts")
    store = relationship("Store", back_populates="shifts")
    device = relationship("Device", back_populates="shifts")
    events = relationship("AttendanceEvent", back_populates="shift")


class AttendanceEvent(Base):
    __tablename__ = "attendance_events"

    id: Mapped[int] = mapped_column(primary_key=True)
    shift_id: Mapped[int | None] = mapped_column(ForeignKey("attendance_shifts.id"), nullable=True)
    employee_id: Mapped[int] = mapped_column(ForeignKey("employees.id"), nullable=False)
    store_id: Mapped[int] = mapped_column(ForeignKey("stores.id"), nullable=False)
    device_id: Mapped[int | None] = mapped_column(ForeignKey("devices.id"), nullable=True)
    event_type: Mapped[AttendanceEventType] = mapped_column(
        Enum(AttendanceEventType, name="attendance_event_type"),
        nullable=False,
    )
    event_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    source: Mapped[AttendanceEventSource] = mapped_column(
        Enum(
            AttendanceEventSource,
            name="attendance_event_source",
            values_callable=lambda enum_cls: [item.value for item in enum_cls],
        ),
        default=AttendanceEventSource.pwa,
        nullable=False,
    )
    raw_payload: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    shift = relationship("AttendanceShift", back_populates="events")
    employee = relationship("Employee", back_populates="events")
    store = relationship("Store", back_populates="events")
    device = relationship("Device", back_populates="events")
