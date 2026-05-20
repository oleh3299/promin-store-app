from datetime import datetime
from zoneinfo import ZoneInfo

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import Device, RocketRoute, Store
from app.schemas.rocket_route import PhotoReportRouteTestResponse
from app.security import get_current_device
from app.services.rocket_chat_service import RocketChatError, RocketChatService


router = APIRouter(prefix="/rocket-routes", tags=["rocket-routes"])
LOCAL_TIMEZONE = ZoneInfo("Europe/Uzhgorod")


@router.post("/photo-report/test", response_model=PhotoReportRouteTestResponse)
def send_photo_report_route_test(
    db: Session = Depends(get_db),
    current_device: Device = Depends(get_current_device),
) -> PhotoReportRouteTestResponse:
    if current_device.store_id is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Device is not linked to a store",
        )

    store = db.get(Store, current_device.store_id)
    if store is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Store not found")

    route = db.scalar(
        select(RocketRoute)
        .where(
            RocketRoute.route_key == "photo_report",
            RocketRoute.scope == "store",
            RocketRoute.store_id == current_device.store_id,
            RocketRoute.is_active.is_(True),
        )
        .limit(1),
    )
    if route is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Photo report Rocket.Chat route is not configured for this store",
        )

    sent_at = datetime.now(LOCAL_TIMEZONE).strftime("%d.%m.%Y %H:%M")
    message = f"Тест контуру фотозвіту\nМагазин: {store.name}\nЧас: {sent_at}"
    try:
        RocketChatService().send_message(route.room_id, message)
    except RocketChatError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Rocket.Chat send failed: {exc}",
        ) from exc

    return PhotoReportRouteTestResponse(
        ok=True,
        sent=True,
        room_name=route.room_name,
        room_id=route.room_id,
    )
