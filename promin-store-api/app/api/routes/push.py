from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.config import Settings, get_settings
from app.db import get_db
from app.models import Device, PushSubscription
from app.schemas.push import PushPublicKeyResponse, PushRegisterRequest, PushSubscriptionRead, PushTestResponse
from app.security import get_current_device
from app.services.push_service import send_test_push_to_device

router = APIRouter(prefix="/push", tags=["push"])


@router.get("/public-key", response_model=PushPublicKeyResponse)
def get_push_public_key(settings: Settings = Depends(get_settings)) -> PushPublicKeyResponse:
    return PushPublicKeyResponse(public_key=settings.vapid_public_key)


@router.post("/register", response_model=PushSubscriptionRead)
def register_push_subscription(
    payload: PushRegisterRequest,
    db: Session = Depends(get_db),
    current_device: Device = Depends(get_current_device),
) -> PushSubscription:
    existing = (
        db.query(PushSubscription)
        .filter(
            PushSubscription.device_id == current_device.id,
            PushSubscription.endpoint == payload.endpoint,
        )
        .one_or_none()
    )
    if existing is not None:
        existing.p256dh = payload.p256dh
        existing.auth = payload.auth
        existing.user_agent = payload.user_agent
        db.add(existing)
        db.commit()
        db.refresh(existing)
        return existing

    subscription = PushSubscription(
        device_id=current_device.id,
        endpoint=payload.endpoint,
        p256dh=payload.p256dh,
        auth=payload.auth,
        user_agent=payload.user_agent,
    )
    db.add(subscription)
    db.commit()
    db.refresh(subscription)
    return subscription


@router.post("/test", response_model=PushTestResponse)
def send_test_push(
    db: Session = Depends(get_db),
    current_device: Device = Depends(get_current_device),
) -> PushTestResponse:
    sent_count, reason = send_test_push_to_device(db, current_device)
    return PushTestResponse(ok=sent_count > 0, sent_count=sent_count, reason=reason)
