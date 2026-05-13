from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import Device, PushSubscription
from app.schemas.push import PushRegisterRequest, PushSubscriptionRead
from app.security import get_current_device

router = APIRouter(prefix="/push", tags=["push"])


@router.post("/register", response_model=PushSubscriptionRead)
def register_push_subscription(
    payload: PushRegisterRequest,
    db: Session = Depends(get_db),
    current_device: Device = Depends(get_current_device),
) -> PushSubscription:
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
