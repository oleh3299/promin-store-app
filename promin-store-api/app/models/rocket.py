from datetime import datetime

from sqlalchemy import Boolean, CheckConstraint, DateTime, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base
from app.models.base import TimestampMixin


ROCKET_ROUTE_KEYS = (
    "purchase",
    "accounting",
    "it",
    "manager",
    "security",
    "repair",
    "cash",
    "other",
)
ROCKET_ROUTE_SCOPES = ("global", "store")
STORE_REQUEST_STATUSES = ("sent", "failed")


class RocketRoute(TimestampMixin, Base):
    __tablename__ = "rocket_routes"
    __table_args__ = (
        CheckConstraint(
            "route_key IN ('purchase', 'accounting', 'it', 'manager', 'security', 'repair', 'cash', 'other')",
            name="ck_rocket_routes_route_key",
        ),
        CheckConstraint("scope IN ('global', 'store')", name="ck_rocket_routes_scope"),
        CheckConstraint(
            "(scope = 'global' AND store_id IS NULL) OR (scope = 'store' AND store_id IS NOT NULL)",
            name="ck_rocket_routes_scope_store",
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    route_key: Mapped[str] = mapped_column(String(32), nullable=False)
    scope: Mapped[str] = mapped_column(String(16), nullable=False)
    store_id: Mapped[int | None] = mapped_column(ForeignKey("stores.id"), nullable=True)
    room_id: Mapped[str] = mapped_column(String(128), nullable=False)
    room_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    store = relationship("Store", back_populates="rocket_routes")


class StoreRequestLog(Base):
    __tablename__ = "store_request_logs"
    __table_args__ = (
        CheckConstraint(
            "route_key IN ('purchase', 'accounting', 'it', 'manager', 'security', 'repair', 'cash', 'other')",
            name="ck_store_request_logs_route_key",
        ),
        CheckConstraint("status IN ('sent', 'failed')", name="ck_store_request_logs_status"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    store_id: Mapped[int] = mapped_column(ForeignKey("stores.id"), nullable=False)
    device_id: Mapped[int] = mapped_column(ForeignKey("devices.id"), nullable=False)
    employee_id: Mapped[int | None] = mapped_column(ForeignKey("employees.id"), nullable=True)
    route_key: Mapped[str] = mapped_column(String(32), nullable=False)
    request_type: Mapped[str | None] = mapped_column(String(64), nullable=True)
    rocket_room_id: Mapped[str] = mapped_column(String(128), nullable=False)
    rocket_message_id: Mapped[str | None] = mapped_column(String(128), nullable=True)
    status: Mapped[str] = mapped_column(String(16), nullable=False)
    error_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    sent_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    store = relationship("Store", back_populates="store_request_logs")
    device = relationship("Device", back_populates="store_request_logs")
    employee = relationship("Employee", back_populates="store_request_logs")
