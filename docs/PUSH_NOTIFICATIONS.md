# Push Notifications

## Purpose

Push notifications notify store devices about incoming work, especially Rocket.Chat-originated store messages and photo tasks.

## Components

Frontend:

- `src/lib/pwa.ts`
- `src/pages/SettingsPage.tsx`
- `src/api/client.ts`
- `public/push-sw.js`
- `vite.config.ts`

Backend:

- `app/api/routes/push.py`
- `app/services/push_service.py`
- `app/models/push.py`
- `app/models/device.py`

Database:

- `push_subscriptions`

Dependency:

- `pywebpush`

## Subscription Flow

1. Device is logged in through device auth.
2. Settings requests browser notification permission.
3. PWA fetches VAPID public key from `GET /api/push/public-key`.
4. Browser creates or reuses `PushSubscription`.
5. PWA sends subscription to `POST /api/push/register`.
6. Backend stores subscription against current `device_id`.

If a subscription already exists for the same device and endpoint, backend updates its keys/user agent.

## Backend Test Flow

Settings "Тест сповіщення" calls:

- `POST /api/push/test`

This endpoint:

1. Requires device auth.
2. Uses current device.
3. Selects push subscriptions for that device.
4. Sends real backend Web Push using `pywebpush`.
5. Returns sent count and skip/failure reason.

This verifies the production push path. It is not a local `new Notification(...)` browser-only test.

## Store Task Push Flow

When Rocket.Chat webhook creates a store task:

1. `send_store_task_push(db, task)` is called.
2. Service validates:
   - `task.store_id` exists.
   - VAPID settings exist.
   - `pywebpush` is installed.
3. Service selects subscriptions by active devices:
   - `Device.store_id == task.store_id`
   - `Device.is_active == true`
   - `Device.status == active`
4. Service sends payload through `pywebpush`.
5. Stale subscriptions with 404/410 are deleted.

## Payload Routing

For `category='photo_report'`:

- title: administration.
- target screen: `photo_tasks`.
- URL: `/?open=photo-tasks`.

For `category='accounting'`:

- title: accounting.
- target screen: `messages`.
- URL: `/?open=messages`.

For general/technical/admin:

- target screen: `messages`.
- URL: `/?open=messages`.

The service worker opens or navigates the PWA window to the payload URL.

## Diagnostics Logs

Expected log events:

- `push_test_attempt`
- `push_test_sent`
- `push_test_failed`
- `push_test_skipped`
- `store_task_push_attempt`
- `store_task_push_sent`
- `store_task_push_failed`
- `store_task_push_skipped`

Important reasons:

- `pywebpush_not_installed`
- `vapid_not_configured`
- `no_subscriptions`
- `device_not_active`
- `subscription_send_failed`

## Production Requirements

The production virtual environment must include:

- `pywebpush`

Production env must include:

- `VAPID_PRIVATE_KEY`
- `VAPID_PUBLIC_KEY`
- `VAPID_CLAIMS_SUBJECT`

The code also supports `VAPID_SUBJECT` as the default subject value.

## Known Risks

- Browser-local notifications do not prove backend push delivery.
- Existing installed PWAs may use old service workers until update.
- Push subscriptions are bound to devices, while delivery for tasks targets all active devices in a store.
- If a device is inactive or not status active, it is excluded from store task push delivery.
- If no push is sent, production logs should be checked before changing code.
