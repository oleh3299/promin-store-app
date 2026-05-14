from sqlalchemy import select
from sqlalchemy.orm import Session
from fastapi import APIRouter, Depends

from app.db import get_db
from app.models import Device, Planogram
from app.schemas.planogram import PlanogramListResponse, PlanogramRead
from app.security import get_current_device

router = APIRouter(prefix="/planograms", tags=["planograms"])


def planogram_image_url(image_path: str) -> str:
    if image_path.startswith(("http://", "https://", "/")):
        return image_path
    normalized_path = image_path.replace("\\", "/")
    return f"/{normalized_path}"


@router.get("", response_model=PlanogramListResponse)
def get_planograms(
    db: Session = Depends(get_db),
    current_device: Device = Depends(get_current_device),
) -> PlanogramListResponse:
    if current_device.store_id is None:
        return PlanogramListResponse(items=[])

    planograms = list(
        db.scalars(
            select(Planogram)
            .where(
                Planogram.store_id == current_device.store_id,
                Planogram.is_active.is_(True),
            )
            .order_by(Planogram.category_name.asc(), Planogram.uploaded_at.desc(), Planogram.id.desc()),
        ),
    )
    return PlanogramListResponse(
        items=[
            PlanogramRead(
                id=planogram.id,
                category_name=planogram.category_name,
                description=planogram.description,
                image_url=planogram_image_url(planogram.image_path),
                uploaded_at=planogram.uploaded_at.isoformat(),
            )
            for planogram in planograms
        ],
    )
