from __future__ import annotations

import json
import logging
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import get_settings
from app.models import Device, DeviceStatus, PushSubscription, StoreTask

try:
    from pywebpush import WebPushException, webpush
except ImportError:  # pragma: no cover - production dependency is declared in requirements.txt
    WebPushException = Exception  # type: ignore[assignment]
    webpush = None  # type: ignore[assignment]


logger = logging.getLogger(__name__)


def store_task_push_payload(task: StoreTask) -> dict[str, Any]:
    if task.category == "photo_report":
        return {
            "title": "Адміністрація",
            "body": "Нове фото-завдання",
            "target_screen": "photo_tasks",
            "url": "/?open=photo-tasks",
            "task_id": task.id,
        }

    if task.category == "accounting":
        return {
            "title": "Бухгалтерія",
            "body": "Нове повідомлення для магазину",
            "target_screen": "messages",
            "url": "/?open=messages",
            "task_id": task.id,
        }

    if task.source_route_key == "it":
        title = "Технічна служба"
    else:
        title = "Адміністрація"

    return {
        "title": title,
        "body": "Нове повідомлення для магазину",
        "target_screen": "messages",
        "url": "/?open=messages",
        "task_id": task.id,
    }


def send_store_task_push(db: Session, task: StoreTask) -> int:
    if task.store_id is None:
        logger.info("store_task_push_skipped", extra={"reason": "missing_store_id", "task_id": task.id})
        return 0

    settings = get_settings()
    if not settings.vapid_private_key or not settings.vapid_public_key:
        logger.info("store_task_push_skipped", extra={"reason": "vapid_not_configured", "task_id": task.id, "store_id": task.store_id})
        return 0
    if webpush is None:
        logger.info("store_task_push_skipped", extra={"reason": "pywebpush_not_installed", "task_id": task.id, "store_id": task.store_id})
        return 0

    subscriptions = db.scalars(
        select(PushSubscription)
        .join(Device, PushSubscription.device_id == Device.id)
        .where(
            Device.store_id == task.store_id,
            Device.is_active.is_(True),
            Device.status == DeviceStatus.active,
        ),
    ).all()

    if not subscriptions:
        logger.info("store_task_push_skipped", extra={"reason": "no_subscriptions", "task_id": task.id, "store_id": task.store_id})
        return 0

    payload = json.dumps(store_task_push_payload(task), ensure_ascii=False)
    sent_count = 0
    stale_subscriptions: list[PushSubscription] = []

    for subscription in subscriptions:
        try:
            webpush(
                subscription_info={
                    "endpoint": subscription.endpoint,
                    "keys": {
                        "p256dh": subscription.p256dh,
                        "auth": subscription.auth,
                    },
                },
                data=payload,
                vapid_private_key=settings.vapid_private_key,
                vapid_claims={"sub": settings.vapid_subject},
            )
            sent_count += 1
        except WebPushException as exc:
            status_code = getattr(getattr(exc, "response", None), "status_code", None)
            if status_code in {404, 410}:
                stale_subscriptions.append(subscription)
            logger.warning(
                "store_task_push_failed",
                extra={
                    "task_id": task.id,
                    "store_id": task.store_id,
                    "subscription_id": subscription.id,
                    "status_code": status_code,
                },
            )
        except Exception:
            logger.exception(
                "store_task_push_failed",
                extra={
                    "task_id": task.id,
                    "store_id": task.store_id,
                    "subscription_id": subscription.id,
                    "status_code": None,
                },
            )

    for subscription in stale_subscriptions:
        db.delete(subscription)
    if stale_subscriptions:
        db.commit()

    logger.info(
        "store_task_push_sent",
        extra={"task_id": task.id, "store_id": task.store_id, "count": sent_count},
    )
    return sent_count
