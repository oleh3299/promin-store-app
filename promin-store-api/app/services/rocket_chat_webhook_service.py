from __future__ import annotations

from datetime import datetime, timezone
import hashlib
import logging
import re
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import RocketRoute, StoreTask, StoreTaskEvent
from app.services.push_service import send_store_task_push


logger = logging.getLogger(__name__)

STORE_MESSAGE_TAG = "#Повідомлення магазину"
STORE_MESSAGE_TITLE = "Повідомлення магазину"


def _string_value(payload: dict[str, Any], *keys: str) -> str | None:
    for key in keys:
        value = payload.get(key)
        if value is not None:
            return str(value)
    return None


def _dict_value(payload: dict[str, Any], key: str) -> dict[str, Any]:
    value = payload.get(key)
    return value if isinstance(value, dict) else {}


def _safe_payload_for_log(value: Any) -> Any:
    if isinstance(value, dict):
        return {
            key: "***" if key.lower() in {"token", "auth_token", "x-rocket-webhook-token"} else _safe_payload_for_log(item)
            for key, item in value.items()
        }
    if isinstance(value, list):
        return [_safe_payload_for_log(item) for item in value]
    return value


def _parse_rocket_payload(payload: dict[str, Any]) -> dict[str, str | None]:
    message = _dict_value(payload, "message")
    user = _dict_value(message, "u")

    return {
        "text": _string_value(payload, "text", "msg") or _string_value(message, "msg", "text"),
        "room_id": (
            _string_value(payload, "roomId", "room_id", "channel_id", "rid")
            or _string_value(message, "rid", "roomId", "room_id")
        ),
        "message_id": (
            _string_value(payload, "messageId", "message_id", "_id", "id")
            or _string_value(message, "_id", "messageId", "message_id", "id")
        ),
        "user_name": (
            _string_value(payload, "user_name", "username", "userName")
            or _string_value(user, "username", "name")
        ),
    }


def clean_store_message_text(text: str) -> str:
    cleaned = re.sub(re.escape(STORE_MESSAGE_TAG), "", text, flags=re.IGNORECASE)
    cleaned = re.sub(r"\n{3,}", "\n\n", cleaned)
    return cleaned.strip()


def contains_store_message_tag(text: str | None) -> bool:
    return bool(text and STORE_MESSAGE_TAG.casefold() in text.casefold())


def category_for_route(route_key: str) -> str:
    if route_key == "accounting":
        return "accounting"
    if route_key == "photo_report":
        return "photo_report"
    return "general"


def fallback_message_id(room_id: str, text: str) -> str:
    digest = hashlib.sha256(f"{room_id}\n{text}".encode("utf-8")).hexdigest()
    return f"hash:{digest[:48]}"


def create_store_task_from_rocket_webhook(db: Session, payload: dict[str, Any]) -> StoreTask | None:
    logger.debug("rocket_store_message_payload_received", extra={"payload": _safe_payload_for_log(payload)})
    parsed = _parse_rocket_payload(payload)
    text = parsed["text"] or ""
    if not text:
        logger.warning("rocket_store_message_skipped", extra={"reason": "missing_text"})
        return None

    if not contains_store_message_tag(text):
        logger.info("rocket_store_message_skipped", extra={"reason": "tag_not_found"})
        return None

    room_id = parsed["room_id"]
    if not room_id:
        logger.warning("rocket_store_message_skipped", extra={"reason": "missing_room_id"})
        return None

    source_message_id = parsed["message_id"]
    if not source_message_id:
        source_message_id = fallback_message_id(room_id, text)
        logger.info(
            "rocket_store_message_fallback_message_id",
            extra={"room_id": room_id, "source_message_id": source_message_id},
        )

    existing_task = db.scalar(
        select(StoreTask).where(
            StoreTask.source == "rocket_chat",
            StoreTask.source_message_id == source_message_id,
        ),
    )
    if existing_task is not None:
        logger.info(
            "rocket_store_message_skipped",
            extra={"reason": "duplicate", "source_message_id": source_message_id, "task_id": existing_task.id},
        )
        return existing_task

    route = db.scalar(
        select(RocketRoute)
        .where(
            RocketRoute.room_id == room_id,
            RocketRoute.scope == "store",
            RocketRoute.is_active.is_(True),
        )
        .limit(1),
    )
    if route is None or route.store_id is None:
        logger.warning("rocket_store_message_skipped", extra={"reason": "route_not_found", "room_id": room_id})
        return None

    description = clean_store_message_text(text)
    if not description:
        logger.warning(
            "rocket_store_message_skipped",
            extra={"reason": "empty_clean_text", "room_id": room_id, "source_message_id": source_message_id},
        )
        return None

    user_name = parsed["user_name"]
    now = datetime.now(timezone.utc)
    task = StoreTask(
        store_id=route.store_id,
        source="rocket_chat",
        source_room_id=room_id,
        source_message_id=source_message_id,
        source_route_key=route.route_key,
        source_user_name=user_name,
        category=category_for_route(route.route_key),
        title=STORE_MESSAGE_TITLE,
        description=description,
        status="open",
        priority="normal",
        requires_photo=False,
        requires_comment=False,
        requires_verification=False,
        created_at=now,
        updated_at=now,
    )
    db.add(task)
    db.flush()
    db.add(
        StoreTaskEvent(
            task_id=task.id,
            event_type="created",
            author_type="system",
            comment=f"Rocket.Chat: {user_name}" if user_name else "Rocket.Chat",
            created_at=now,
        ),
    )
    db.commit()
    db.refresh(task)
    send_store_task_push(db, task)
    logger.info(
        "rocket_store_message_created",
        extra={
            "task_id": task.id,
            "store_id": task.store_id,
            "room_id": room_id,
            "message_id": source_message_id,
            "route_key": route.route_key,
        },
    )
    return task
