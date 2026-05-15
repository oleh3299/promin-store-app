from sqlalchemy import Boolean, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base
from app.models.base import TimestampMixin


class Employee(TimestampMixin, Base):
    __tablename__ = "employees"

    id: Mapped[int] = mapped_column(primary_key=True)
    store_id: Mapped[int | None] = mapped_column(ForeignKey("stores.id"), nullable=True)
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    barcode: Mapped[str] = mapped_column(String(128), unique=True, index=True, nullable=False)
    tax_code: Mapped[str | None] = mapped_column(String(32), nullable=True, index=True)
    position: Mapped[str] = mapped_column(String(128), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    external_1c_id: Mapped[str | None] = mapped_column(String(128), nullable=True, index=True)

    store = relationship("Store", back_populates="employees")
    shifts = relationship("AttendanceShift", back_populates="employee")
    events = relationship("AttendanceEvent", back_populates="employee")
    store_request_logs = relationship("StoreRequestLog", back_populates="employee")
    assigned_store_tasks = relationship(
        "StoreTask",
        foreign_keys="StoreTask.assigned_employee_id",
        back_populates="assigned_employee",
    )
    completed_store_tasks = relationship(
        "StoreTask",
        foreign_keys="StoreTask.completed_by_employee_id",
        back_populates="completed_by_employee",
    )

    def __str__(self) -> str:
        return self.full_name
