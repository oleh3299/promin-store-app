# Promin Store Architecture

This document describes the current production architecture. It is intentionally descriptive: it does not propose runtime behavior changes.

## System Shape

Promin Store is a store operations system with three main surfaces:

- PWA frontend: React, Vite, TypeScript, PWA service worker.
- API backend: FastAPI, SQLAlchemy 2.x, PostgreSQL, Alembic.
- Operational admin: SQLAdmin on the API host.

External systems:

- Rocket.Chat: routing for accounting, IT/technical service, photo reports, and incoming store tasks.
- 1C UTP 1.2: master source for employees through integration sync.
- Browser Web Push service: delivery of push notifications to installed PWA clients.

## Core Rules

- `stores` is the only source of stores.
- Store-bound entities reference `stores.id`.
- `stores.code` is the internal 1C store code.
- `stores.name` is the store address/name.
- `devices.store_id` determines the current store for PWA flows.
- The frontend does not know Rocket.Chat tokens or room ids.
- Photos and files are not stored as database blobs.
- Local filesystem storage is used for uploaded files where applicable.

## Frontend

Main files:

- `src/App.tsx`: screen state, device session, high-level routing, open target from push URLs.
- `src/api/client.ts`: typed API client with device token and user token support.
- `src/lib/storage.ts`: local app persistence for device/session/screen state.
- `src/lib/pwa.ts`: push subscription registration and backend push test trigger.
- `public/push-sw.js`: push event and notification click handling.
- `src/pages/*`: operational PWA screens.

Important screens:

- `HomePage`: operational terminal entry points.
- `AttendancePage`: check-in/check-out.
- `InvoicePage`: invoice photo upload.
- `PhotoReportPage`: evening photo report with IndexedDB local photo draft and per-item upload.
- `PlanogramsPage`: readonly planogram image registry.
- `StoreRequestsPage`: outgoing help/contact request.
- `StoreTasksPage`: incoming Rocket.Chat messages and photo tasks.
- `SettingsPage`: PWA mode, push registration, backend push test, diagnostics.

The PWA does not use a full router for store operations. It uses local screen state. The HR tablet UI is route based under `/hr/*`.

## Backend

Main API router:

- `promin-store-api/app/api/router.py`

Device-auth routes use `get_current_device` from:

- `promin-store-api/app/security.py`

If a device token is missing, invalid, inactive, or not active status, protected device endpoints fail before business logic runs.

Core services:

- `services/attendance.py`
- `services/invoice_service.py`
- `services/photo_report_service.py`
- `services/store_request_service.py`
- `services/store_task_service.py`
- `services/rocket_chat_service.py`
- `services/rocket_chat_webhook_service.py`
- `services/push_service.py`

## Data Areas

### Device Auth

Tables/models:

- `Device`
- `AttendanceShift`
- `AttendanceEvent`
- `PushSubscription`

Device auth is separate from user/admin JWT auth.

### Store Tasks

Tables/models:

- `store_departments`
- `task_templates`
- `store_tasks`
- `store_task_attachments`
- `store_task_events`

Store tasks are currently used for:

- Manual/admin operational tasks.
- Incoming Rocket.Chat messages.
- Rocket.Chat photo tasks from photo report channels.

### Photo Reports

Tables/models:

- `photo_report_templates`
- `photo_reports`
- `photo_report_items`

The PWA uses IndexedDB to keep local photo files until successful upload.

### Rocket.Chat Routes

Table/model:

- `rocket_routes`

`rocket_routes` maps store-scoped route keys to Rocket.Chat rooms. The frontend never receives room ids.

### Push

Table/model:

- `push_subscriptions`

Subscriptions belong to devices. Real push delivery is server-side through `pywebpush`.

## Admin

SQLAdmin manages:

- Stores/devices/employees.
- Rocket routes.
- Photo report templates.
- Planograms.
- Store tasks.
- HR candidates.
- Push subscriptions.

Admin views are operational tooling; PWA flows should not depend on SQLAdmin UI state.

## Known Encoding Note

Several source files contain mojibake strings in displayed content. This appears to come from previous UTF-8/encoding handling during edits. The app may still function because the same strings are used consistently, but this is a documentation-level risk and should be handled in a separate controlled cleanup.
