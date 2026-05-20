# Photo Report Flow

## Purpose

The evening photo report is the production flow for required store photos. It is separate from incoming Rocket.Chat photo tasks.

## Frontend Flow

File:

- `src/pages/PhotoReportPage.tsx`

Steps:

1. Load template from `GET /api/photo-reports/template`.
2. Load active employees from store request active employees endpoint.
3. Restore unfinished local draft from IndexedDB.
4. User captures photos for template items.
5. Each photo is stored locally before upload.
6. Upload sends only pending/not uploaded photos.
7. Each successful item is marked `uploaded`.
8. Failed or pending photos remain local.
9. Local draft is cleared after successful upload completion for selected pending photos.

IndexedDB:

- database: `promin-photo-report`
- object store: `photos`
- object store: `meta`

Local statuses:

- `pending`
- `uploading`
- `uploaded`
- `failed`

## Backend Flow

Files:

- `app/api/routes/photo_reports.py`
- `app/services/photo_report_service.py`

Endpoints:

- `GET /api/photo-reports/template`
- `POST /api/photo-reports`
- `POST /api/photo-reports/item`

The current PWA primarily uses per-item upload:

- `POST /api/photo-reports/item`

Backend behavior:

1. Validate device auth.
2. Validate store exists.
3. Validate template item exists.
4. Validate file content type and size.
5. Resolve employee.
6. Create or load `photo_reports`.
7. Resolve Rocket.Chat photo report room.
8. Ensure parent Rocket.Chat message exists.
9. Upload item photo as thread reply.
10. Insert `photo_report_items`.
11. Count required sent items from database.
12. Update `photo_reports.items_done`.
13. Update Rocket.Chat parent progress message.

## Rocket.Chat Threading

The report creates one parent message:

- report title.
- store.
- date.
- employee.
- progress line.

Each photo is uploaded as a thread reply:

- `[index/total]`
- item title.
- photo attachment.

After each successful item upload, parent message is updated from database count.

## Idempotency

Before uploading, backend checks if a `PhotoReportItem` already exists for:

- report id.
- template id.
- status `sent`.

If it exists, backend does not re-upload the photo and recalculates progress.

## Temporary Partial Mode

Current frontend has a temporary partial mode:

- selected photos can be uploaded without all required items present.

This keeps operational testing possible but creates status ambiguity:

- backend total still represents required items.
- incomplete reports may remain `failed` until all required items are sent.

This must be resolved before treating partial reports as a permanent product feature.

## Failure Behavior

Frontend:

- Network loss keeps local photos.
- User can retry remaining photos.
- UI should not say photos are lost.

Backend:

- Rocket.Chat upload errors produce failed item/report state.
- Parent update errors are logged but do not undo item upload.

## Do Not Confuse With Photo Tasks

Photo tasks are `store_tasks.category='photo_report'` created from Rocket.Chat tagged messages in `photo-reports_*` channels.

They are not the evening photo report module.

Production photo report must continue to use:

- `photo_report_templates`
- `photo_reports`
- `photo_report_items`
- per-item upload
- Rocket.Chat parent/thread flow
