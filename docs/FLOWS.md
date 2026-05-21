# Production Flows

This document records current production flows without changing behavior.

## A. Evening Photo Report

Flow:

1. PWA opens `PhotoReportPage`.
2. PWA calls `GET /api/photo-reports/template`.
3. Backend resolves active `photo_report_templates` for `device.store_id`.
4. PWA stores captured photos in IndexedDB:
   - database: `promin-photo-report`
   - stores: `photos`, `meta`
5. User starts upload.
6. PWA sends one item at a time to `POST /api/photo-reports/item`.
7. Backend:
   - validates device auth.
   - validates file type and size.
   - creates or loads `photo_reports`.
   - creates a Rocket.Chat parent message if missing.
   - uploads each photo as a thread reply.
   - records `photo_report_items`.
   - recalculates uploaded count from database.
   - updates parent Rocket.Chat message progress.
8. PWA marks local item status:
   - `pending`
   - `uploading`
   - `uploaded`
   - `failed`
9. PWA clears local IndexedDB draft only after successful upload of selected pending photos.

Important files:

- `src/pages/PhotoReportPage.tsx`
- `promin-store-api/app/api/routes/photo_reports.py`
- `promin-store-api/app/services/photo_report_service.py`
- `promin-store-api/app/services/rocket_chat_service.py`

Current behavior:

- Upload is per-item, not one giant multipart request.
- Rocket.Chat output is grouped under one parent message/thread.
- Local photos are retained until upload success.
- Partial report upload is currently allowed in the frontend as temporary test mode.

## B. Rocket.Chat Store Messages

Flow:

1. Office user posts a Rocket.Chat message with `#Повідомлення магазину`.
2. Rocket.Chat calls `POST /api/integration/rocket-chat/webhook`.
3. Backend validates webhook token.
4. Backend parser supports:
   - flat payloads.
   - nested `message` payloads.
   - classic Rocket.Chat outgoing webhook payloads.
5. Backend extracts:
   - text.
   - room id.
   - message id.
   - username.
6. Backend checks the tag.
7. Backend finds `rocket_routes` by:
   - `room_id`
   - `scope='store'`
   - `is_active=true`
8. Backend creates `store_tasks`:
   - `source='rocket_chat'`
   - `store_id=rocket_routes.store_id`
   - `source_room_id`
   - `source_message_id`
   - `source_route_key`
   - `source_user_name`
   - `category`
9. Backend sends push notification through `push_service`.
10. PWA fetches tasks with `GET /api/store-tasks`.
11. `StoreTasksPage` shows regular incoming messages in `Повідомлення`.

Important files:

- `promin-store-api/app/api/routes/rocket_chat_integration.py`
- `promin-store-api/app/services/rocket_chat_webhook_service.py`
- `promin-store-api/app/services/store_task_service.py`
- `src/pages/StoreTasksPage.tsx`

## C. Rocket.Chat Photo Tasks

Flow:

1. Office user posts `#Повідомлення магазину` in a `photo-reports_*` channel.
2. Webhook receives the message.
3. `rocket_routes.room_id` resolves the store.
4. `rocket_routes.route_key='photo_report'` maps to `store_tasks.category='photo_report'`.
5. PWA shows these tasks inside the unified `Повідомлення` inbox.
6. Cards keep the sender label `Адміністрація` and show a secondary photo-check label.
7. Push payload targets `/?open=messages`.

Important files:

- `promin-store-api/app/services/rocket_chat_webhook_service.py`
- `promin-store-api/app/services/push_service.py`
- `src/App.tsx`
- `src/pages/StoreTasksPage.tsx`

## D. Web Push

Subscription flow:

1. User opens Settings.
2. PWA calls `GET /api/push/public-key`.
3. Browser creates or reuses `PushSubscription`.
4. PWA sends subscription to `POST /api/push/register` with device auth.
5. Backend stores or updates `push_subscriptions` for the current device.

Real push flow:

1. Backend creates a store task from Rocket.Chat.
2. Backend calls `send_store_task_push`.
3. Service checks VAPID configuration and `pywebpush`.
4. Service selects subscriptions by active devices in the target store.
5. `pywebpush` sends payload.
6. `public/push-sw.js` receives push.
7. Service worker shows notification.
8. Notification click opens `/?open=messages` for incoming Rocket.Chat store tasks.

Test flow:

1. Settings "Тест сповіщення" calls `POST /api/push/test`.
2. Backend uses the same `pywebpush` sending path.
3. Test no longer uses local `new Notification(...)` as the main validation.

Important files:

- `src/pages/SettingsPage.tsx`
- `src/lib/pwa.ts`
- `src/api/client.ts`
- `public/push-sw.js`
- `promin-store-api/app/api/routes/push.py`
- `promin-store-api/app/services/push_service.py`

## E. Outgoing Store Requests

Flow:

1. PWA opens `StoreRequestsPage`.
2. User selects a problem-oriented option.
3. Frontend maps the user option to backend route keys.
4. Backend resolves `rocket_routes`.
5. Backend sends message/file to Rocket.Chat.

This is separate from incoming Rocket.Chat messages.

## F. Invoice Upload

Flow:

1. PWA captures invoice photo.
2. PWA sends `POST /api/invoices/upload`.
3. Backend resolves current store through device auth.
4. Backend routes the file to accounting Rocket.Chat channel.
5. Backend logs the upload.

Invoice upload remains separate from store tasks.
