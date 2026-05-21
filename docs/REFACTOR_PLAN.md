# Refactor Plan

This plan separates safe refactors from risky refactors and later features. It should be used to keep production changes incremental.

## Goals

- Preserve production behavior.
- Reduce conceptual overlap.
- Improve diagnostics before changing flows.
- Avoid large rewrites.

## Safe Refactor Without Behavior Change

These can be done incrementally.

### 1. Add Flow-Level Smoke Tests

Scope:

- Home entries open expected screens.
- `Фотозвіт` opens `PhotoReportPage`.
- `Повідомлення` opens the unified incoming inbox, including photo-check tasks.
- Push URL `/?open=messages` opens messages mode.
- Legacy push URL `/?open=photo-tasks`, if present on an old device, should not create a separate Home navigation flow.

No behavior changes.

### 2. Centralize Push Payload Labels

Current payload labels live in `push_service.py`.

Refactor:

- Extract small pure functions for:
  - title selection.
  - body selection.
  - target URL selection.

No delivery behavior changes.

### 3. Document Route Key Mapping in Code Comments

Add narrow comments where route keys become categories:

- `accounting -> accounting`
- `photo_report -> photo_report`
- other -> `general`

No runtime changes.

### 4. Add Admin Diagnostics for Push

Read-only views or columns:

- subscription id.
- device id.
- device store.
- device active/status.
- last created/updated time.

No delivery behavior changes.

### 5. Add Structured Log Fields Consistently

Current logs exist but can be standardized.

Target fields:

- `flow`
- `store_id`
- `device_id`
- `task_id`
- `report_id`
- `room_id`
- `reason`

No runtime behavior changes.

### 6. Extract Photo Report IndexedDB Helpers

Move IndexedDB helpers from `PhotoReportPage.tsx` into a local module.

Rules:

- Keep storage keys unchanged.
- Keep object store names unchanged.
- Keep status values unchanged.

No behavior changes.

### 7. Create Developer Flow Docs in README Links

Add links from root README and backend README to docs.

No behavior changes.

## Risky Refactor

These require staging, manual QA, and rollback plan.

### 1. Photo Report Status Model Cleanup

Problem:

- Partial upload is possible.
- Incomplete report can be stored as `failed`.

Possible change:

- Introduce explicit statuses: `in_progress`, `partial`, `sent`, `failed`.

Risk:

- SQLAdmin filters, reports, and existing production records may need migration.

### 2. Replace Local Screen State With Router

Problem:

- PWA screen state and push deep links are manually coordinated.

Possible change:

- Add route based operational screens.

Risk:

- Back navigation, persistence, and installed PWA launch behavior can change.

### 3. Merge Store Messages and Device Messages

Problem:

- Store tasks are used as incoming messages.
- Future device messages may overlap.

Possible change:

- Introduce a dedicated message abstraction or keep tasks with a clearer subtype.

Risk:

- UI, push, SQLAdmin, and Rocket.Chat flow would all be affected.

### 4. Centralize File Storage Across Modules

Problem:

- Planograms, invoices, store tasks, and photo reports use separate file logic.

Possible change:

- Shared file storage service.

Risk:

- Existing paths and public URLs must remain valid.

### 5. UTF-8 Source Cleanup

Problem:

- Mojibake strings exist in source files.

Possible change:

- Convert source text to clean UTF-8.

Risk:

- Large diff.
- Easy to introduce accidental copy changes.

## Later Features

These are not refactors and should not be mixed with cleanup.

### 1. Real Device Messages Module

If needed, add a dedicated in-app messages system:

- targeted by device or store.
- read/reply state.
- push integration.

Keep separate from Rocket.Chat task bridge unless product explicitly merges them.

### 2. Push Reconciliation Dashboard

Show:

- push subscriptions per store.
- last push attempt.
- last failure reason.
- stale subscription count.

### 3. Photo Report Reconciliation Tool

Given a report id:

- show DB report status.
- show item count.
- show Rocket.Chat parent message id.
- show missing/failed item uploads.

### 4. Offline Upload Monitor

For the PWA:

- visible unfinished report summary.
- retry health.
- last successful upload time.

### 5. Scheduled Store Tasks

The foundation exists for tasks, but scheduler engine remains intentionally out of MVP.

Add only after operational task semantics are stable.
