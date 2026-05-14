from sqlalchemy import Boolean, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base
from app.models.base import TimestampMixin


class Store(TimestampMixin, Base):
    __tablename__ = "stores"

    id: Mapped[int] = mapped_column(primary_key=True)
    code: Mapped[str] = mapped_column(String(64), unique=True, index=True, nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    address: Mapped[str | None] = mapped_column(String(500), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    employees = relationship("Employee", back_populates="store")
    devices = relationship("Device", back_populates="store")
    shifts = relationship("AttendanceShift", back_populates="store")
    events = relationship("AttendanceEvent", back_populates="store")
    rocket_routes = relationship("RocketRoute", back_populates="store")
    store_request_logs = relationship("StoreRequestLog", back_populates="store")
    photo_report_templates = relationship("PhotoReportTemplate", back_populates="store")
    planogram_zones = relationship("PlanogramZone", back_populates="store")

    def __str__(self) -> str:
        return f"{self.code} — {self.name}"
