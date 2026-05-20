# Rocket.Chat Integration

## Purpose

Rocket.Chat is the office-side operational channel. Promin Store API hides Rocket.Chat credentials, room ids, and routing from the PWA.

## Main Components

Backend:

- `app/models/rocket.py`
- `app/api/routes/rocket_chat_integration.py`
- `app/api/routes/rocket_routes.py`
- `app/services/rocket_chat_service.py`
- `app/services/rocket_chat_webhook_service.py`
- `app/services/store_request_service.py`
- `app/services/photo_report_service.py`
- `app/services/store_task_service.py`

Database:

- `rocket_routes`
- `store_tasks`
- `store_task_events`
- `store_task_attachments`
- `photo_reports`
- `photo_report_items`

## Route Keys

Known route keys:

- `accounting`
- `photo_report`
- `it`
- additional routes can fall back to general behavior depending on service.

`rocket_routes` should remain the source of room mapping.

## Outgoing Store Requests

PWA "Допомога" sends store-originated requests.

Flow:

1. PWA sends problem type and message.
2. Backend maps to a route key.
3. Backend resolves store route through `rocket_routes`.
4. Backend sends message/file to Rocket.Chat.

This is not the same as incoming `Повідомлення`.

## Incoming Store Messages

Rocket.Chat outgoing webhook:

- Endpoint: `POST /api/integration/rocket-chat/webhook`
- Auth:
  - `X-Rocket-Webhook-Token`
  - or query `token`

Supported payload shapes:

- Flat payload with `text`, `roomId`, `messageId`, `user_name`.
- Nested Rocket.Chat message object with `message.msg`, `message.rid`, `message._id`, `message.u.username`.
- Classic outgoing webhook with `channel_id`, `message_id`, `user_name`, `text`.

Processing:

1. Parse payload.
2. Check for `#Повідомлення магазину`.
3. Resolve `rocket_routes` by room id.
4. Determine category by route key:
   - `accounting -> accounting`
   - `photo_report -> photo_report`
   - fallback -> `general`
5. Create `store_tasks`.
6. Send Web Push to devices in the target store.

Idempotency:

- Uses `source_message_id`.
- If missing, uses hash fallback.
- Duplicate messages do not create new tasks and do not send push.

Skip reasons:

- `missing_text`
- `tag_not_found`
- `missing_room_id`
- `duplicate`
- `route_not_found`
- `empty_clean_text`

## Incoming Photo Tasks

If a tagged message comes from `photo-reports_*` and the route has `route_key='photo_report'`, the created task has:

- `source='rocket_chat'`
- `category='photo_report'`

PWA should treat this as a photo task, not as the production evening photo report.

## Replies From Store

When a store submits a Rocket.Chat-originated store task:

1. Backend creates task events and attachments.
2. If `task.source='rocket_chat'`, backend sends a reply to the source Rocket.Chat room/thread.
3. If file exists, backend uploads file as a reply.
4. Otherwise, backend sends a text reply.

Relevant file:

- `app/services/store_task_service.py`

## Photo Report Upload To Rocket.Chat

Production photo report flow uses Rocket.Chat differently:

- One parent message per report.
- Photos as thread replies.
- Parent progress updated after each successful DB-recorded item.

This flow should not be replaced by store tasks.

## Operational Risks

- Wrong `rocket_routes.room_id` means webhook cannot resolve store.
- Missing route key mapping can put messages into `general`.
- Duplicate detection relies on Rocket.Chat message ids or fallback hashes.
- Rocket.Chat API failures can leave partial state in DB/channel.
- Thread support must remain compatible with current Rocket.Chat deployment.
