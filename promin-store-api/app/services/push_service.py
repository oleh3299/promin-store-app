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


def _vapid_skip_reason() -> str | None:
    settings = get_settings()
    if not settings.vapid_private_key or not settings.vapid_public_key:
        return "vapid_not_configured"
    if webpush is None:
        return "pywebpush_not_installed"
    return None


def _send_web_push_payload(
    db: Session,
    subscriptions: list[PushSubscription],
    payload: dict[str, Any],
    *,
    log_name: str,
    log_context: dict[str, Any],
) -> int:
    settings = get_settings()
    subject = settings.vapid_claims_subject or settings.vapid_subject
    data = json.dumps(payload, ensure_ascii=False)
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
                data=data,
                vapid_private_key=settings.vapid_private_key,
                vapid_claims={"sub": subject},
            )
            sent_count += 1
        except WebPushException as exc:
            status_code = getattr(getattr(exc, "response", None), "status_code", None)
            if status_code in {404, 410}:
                stale_subscriptions.append(subscription)
            logger.warning(
                f"{log_name}_failed",
                extra={
                    **log_context,
                    "reason": "subscription_send_failed",
                    "subscription_id": subscription.id,
                    "status_code": status_code,
                },
            )
        except Exception:
            logger.exception(
                f"{log_name}_failed",
                extra={
                    **log_context,
                    "reason": "subscription_send_failed",
                    "subscription_id": subscription.id,
                    "status_code": None,
                },
            )

    for subscription in stale_subscriptions:
        db.delete(subscription)
    if stale_subscriptions:
        db.commit()

    return sent_count


def send_test_push_to_device(db: Session, device: Device) -> tuple[int, str | None]:
    log_context = {"device_id": device.id, "store_id": device.store_id}
    if not device.is_active or device.status != DeviceStatus.active:
        logger.info("push_test_skipped", extra={**log_context, "reason": "device_not_active", "subscriptions_count": 0})
        return 0, "device_not_active"

    skip_reason = _vapid_skip_reason()
    if skip_reason:
        logger.info("push_test_skipped", extra={**log_context, "reason": skip_reason, "subscriptions_count": 0})
        return 0, skip_reason

    subscriptions = db.scalars(
        select(PushSubscription).where(PushSubscription.device_id == device.id),
    ).all()
    subscriptions_count = len(subscriptions)
    logger.info("push_test_attempt", extra={**log_context, "subscriptions_count": subscriptions_count})

    if not subscriptions:
        logger.info("push_test_skipped", extra={**log_context, "reason": "no_subscriptions", "subscriptions_count": subscriptions_count})
        return 0, "no_subscriptions"

    sent_count = _send_web_push_payload(
        db,
        subscriptions,
        {
            "title": "Promin Store",
            "body": "Тестове сповіщення надіслано",
            "target_screen": "messages",
            "url": "/?open=messages",
        },
        log_name="push_test",
        log_context={**log_context, "subscriptions_count": subscriptions_count},
    )
    logger.info("push_test_sent", extra={**log_context, "subscriptions_count": subscriptions_count, "count": sent_count})
    return sent_count, None if sent_count > 0 else "subscription_send_failed"


def send_store_task_push(db: Session, task: StoreTask) -> int:
    log_context = {"task_id": task.id, "store_id": task.store_id}
    if task.store_id is None:
        logger.info("store_task_push_skipped", extra={**log_context, "reason": "missing_store_id", "subscriptions_count": 0})
        return 0

    skip_reason = _vapid_skip_reason()
    if skip_reason:
        logger.info("store_task_push_skipped", extra={**log_context, "reason": skip_reason, "subscriptions_count": 0})
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

    subscriptions_count = len(subscriptions)
    logger.info("store_task_push_attempt", extra={**log_context, "subscriptions_count": subscriptions_count})

    if not subscriptions:
        logger.info("store_task_push_skipped", extra={**log_context, "reason": "no_subscriptions", "subscriptions_count": subscriptions_count})
        return 0

    sent_count = _send_web_push_payload(
        db,
        subscriptions,
        store_task_push_payload(task),
        log_name="store_task_push",
        log_context={**log_context, "subscriptions_count": subscriptions_count},
    )

    logger.info(
        "store_task_push_sent",
        extra={**log_context, "subscriptions_count": subscriptions_count, "count": sent_count},
    )
    return sent_count
