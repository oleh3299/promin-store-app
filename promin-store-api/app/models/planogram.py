from sqlalchemy import Boolean, ForeignKey, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base
from app.models.base import TimestampMixin


class PlanogramZone(TimestampMixin, Base):
    __tablename__ = "planogram_zones"
    __table_args__ = (
        UniqueConstraint("store_id", "zone_key", name="uq_planogram_zones_store_zone_key"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    store_id: Mapped[int] = mapped_column(ForeignKey("stores.id"), nullable=False)
    zone_key: Mapped[str] = mapped_column(String(64), nullable=False)
    zone_name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    store = relationship("Store", back_populates="planogram_zones")
