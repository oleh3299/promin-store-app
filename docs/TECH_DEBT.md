# Technical Debt

This document lists current debt and risks. It is not a change request.

## High Priority

### 1. Photo Report vs Store Tasks Concept Mixing

The production "Evening Photo Report" is a dedicated module with:

- `photo_report_templates`
- `photo_reports`
- `photo_report_items`
- IndexedDB queue
- Rocket.Chat grouped thread upload

At the same time, Rocket.Chat `photo_report` messages create `store_tasks.category='photo_report'` and are shown inside the unified `Повідомлення` inbox.

Risk:

- Operators may confuse production photo report with photo-check tasks if labels are weak.
- Future developers may route photo report UX through store tasks by mistake.

Recommendation:

- Keep documentation and UI labels strict.
- Use "Фотозвіт" only for the production report.
- Label incoming photo-check work clearly inside `Повідомлення`.

### 2. Temporary Partial Photo Report Mode

The frontend currently allows partial photo report upload:

- `partialPhotoReportTestMode = true`

The backend still tracks total required items and marks incomplete reports as failed until all required items are sent.

Risk:

- Production may accept incomplete operational reports.
- Backend status semantics become confusing: partial upload can be useful, but `status='failed'` does not necessarily mean delivery failed.

Recommendation:

- Decide on explicit product rule:
  - partial upload as production feature.
  - or restore strict completion.
- If partial upload remains, introduce explicit status semantics such as `partial`, `in_progress`, `sent`.

### 3. Web Push Diagnostics Were Previously Misleading

Settings test used to call local browser `new Notification(...)`.

Risk:

- Operators believed backend push worked while real Web Push path could be broken.

Current state:

- Settings test now calls `POST /api/push/test`.

Remaining risk:

- Production deploy must install `pywebpush`.
- Production env must have VAPID values.

### 4. Service Worker and PWA Update Behavior

VitePWA is configured with `autoUpdate`.
Push handling is imported through `public/push-sw.js`.

Risk:

- Installed iOS/Android PWA can run an older service worker until update/reload.
- Push routing changes may not apply immediately to all devices.

Recommendation:

- Add an explicit app version/update visible in diagnostics.
- Provide admin instructions for forcing PWA refresh/reinstall when service worker behavior changes.

### 5. Rocket.Chat Threading and Progress

Photo report progress depends on:

- parent message creation.
- threaded file replies.
- database count after each item.
- parent message update after successful upload.

Risk:

- Parent progress may be stale if Rocket.Chat update fails.
- Retried uploads rely on database item idempotency.
- Rocket.Chat API failures can leave database and channel state partially updated.

Recommendation:

- Add reconciliation diagnostics by report id.
- Keep `rocket_parent_message_id`, room id, item message ids visible in admin.

### 6. UI Navigation Complexity

The PWA uses local screen state rather than a route tree for operational screens.

Risk:

- Push deep links use query parameters to set initial screen.
- Back behavior and persisted screen state can diverge.
- Hidden screens can remain reachable by push or stored state.

Recommendation:

- Keep current behavior for production stability.
- Later introduce a small route adapter only after flows are stable.

### 7. Duplicate User Concepts

Current labels/concepts:

- `Повідомлення`: incoming office messages/tasks.
- `Зв'язок`/`Допомога`: outgoing request from store to office.
- `Фотозвіт`: production evening report.

Risk:

- Store staff can confuse incoming work with outgoing help or production photo reports.
- Developers can route messages into the wrong UI.

Recommendation:

- Maintain strict naming rules in docs and tests.
- Add UI smoke tests for Home entries and target screens.

## Medium Priority

### 8. Mojibake Strings in Source

Some source files contain visibly corrupted strings when read as plain text.

Risk:

- Future edits can worsen encoding.
- Documentation and source search become harder.

Recommendation:

- Plan a separate UTF-8 cleanup.
- Do not combine with feature work.

### 9. Push Subscription Lifecycle

The backend removes stale subscriptions on 404/410 only during sends.

Risk:

- Unused subscriptions remain until a send attempt.
- Store/device reassignment could leave old subscriptions pointing to unexpected store context if not re-registered.

Recommendation:

- Add admin diagnostics for subscription device/store.
- Consider subscription refresh on app start or Settings open.

### 10. File Storage and URL Consistency

Several modules generate file paths independently.

Risk:

- Storage roots can diverge.
- URL escaping and safe filename behavior can differ per module.

Recommendation:

- Centralize file naming/storage utilities after production flows are stable.

## Low Priority

### 11. Frontend Bundle Size

Build warns that the main JS chunk is larger than 500 KB.

Risk:

- Slower updates on poor mobile networks.

Recommendation:

- Later split HR tablet UI and operational PWA screens.

### 12. Admin UX Drift

SQLAdmin has custom views and operational sections.

Risk:

- Relation selectors and labels can diverge across views.

Recommendation:

- Keep a shared admin selector/label convention document.
