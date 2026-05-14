from datetime import datetime

from sqlalchemy import Boolean, CheckConstraint, DateTime, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base
from app.models.base import TimestampMixin


class PhotoReportTemplate(TimestampMixin, Base):
    __tablename__ = "photo_report_templates"
    __table_args__ = (
        UniqueConstraint("store_id", "item_key", name="uq_photo_report_templates_store_item_key"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    store_id: Mapped[int] = mapped_column(ForeignKey("stores.id"), nullable=False)
    item_key: Mapped[str] = mapped_column(String(64), nullable=False)
    item_name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False)
    is_required: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    store = relationship("Store", back_populates="photo_report_templates")


class PhotoReport(Base):
    __tablename__ = "photo_reports"
    __table_args__ = (
        CheckConstraint("status IN ('sent', 'failed')", name="ck_photo_reports_status"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    store_id: Mapped[int] = mapped_column(ForeignKey("stores.id"), nullable=False)
    device_id: Mapped[int] = mapped_column(ForeignKey("devices.id"), nullable=False)
    employee_id: Mapped[int | None] = mapped_column(ForeignKey("employees.id"), nullable=True)
    items_done: Mapped[int] = mapped_column(Integer, nullable=False)
    items_total: Mapped[int] = mapped_column(Integer, nullable=False)
    status: Mapped[str] = mapped_column(String(16), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    sent_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class PhotoReportItem(Base):
    __tablename__ = "photo_report_items"
    __table_args__ = (
        CheckConstraint("status IN ('sent', 'failed')", name="ck_photo_report_items_status"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    report_id: Mapped[int] = mapped_column(ForeignKey("photo_reports.id"), nullable=False)
    template_id: Mapped[int] = mapped_column(ForeignKey("photo_report_templates.id"), nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    rocket_room_id: Mapped[str] = mapped_column(String(128), nullable=False)
    rocket_file_id: Mapped[str | None] = mapped_column(String(128), nullable=True)
    rocket_message_id: Mapped[str | None] = mapped_column(String(128), nullable=True)
    status: Mapped[str] = mapped_column(String(16), nullable=False)
    error_text: Mapped[str | None] = mapped_column(String(1000), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    sent_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
