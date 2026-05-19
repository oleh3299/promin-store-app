from typing import Any

from fastapi import APIRouter, Depends, Header, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.config import Settings, get_settings
from app.db import get_db
from app.services.rocket_chat_webhook_service import create_store_task_from_rocket_webhook


router = APIRouter(prefix="/integration/rocket-chat", tags=["integration"])


def verify_rocket_webhook_token(
    x_rocket_webhook_token: str | None = Header(default=None, alias="X-Rocket-Webhook-Token"),
    token: str | None = Query(default=None),
    settings: Settings = Depends(get_settings),
) -> None:
    expected_token = settings.rocket_chat_webhook_token
    if not expected_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Rocket.Chat webhook token is not configured",
        )

    provided_token = x_rocket_webhook_token or token
    if not provided_token or provided_token != expected_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid Rocket.Chat webhook token",
        )


@router.post("/webhook", dependencies=[Depends(verify_rocket_webhook_token)])
def rocket_chat_webhook(
    payload: dict[str, Any],
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    task = create_store_task_from_rocket_webhook(db, payload)
    return {
        "ok": True,
        "created": task is not None,
        "task_id": task.id if task is not None else None,
    }
