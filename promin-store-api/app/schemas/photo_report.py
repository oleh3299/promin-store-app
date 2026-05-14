from datetime import datetime

from pydantic import BaseModel


class PhotoReportTemplateItemRead(BaseModel):
    id: int
    title: str
    sort_order: int


class PhotoReportTemplateResponse(BaseModel):
    items: list[PhotoReportTemplateItemRead]


class PhotoReportUploadResponse(BaseModel):
    ok: bool
    report_id: int | None = None
    items_done: int | None = None
    items_total: int | None = None
    status: str | None = None
    error: str | None = None
    message: str | None = None


class PhotoReportAdminRead(BaseModel):
    id: int
    store_id: int
    employee_id: int | None
    items_done: int
    items_total: int
    status: str
    created_at: datetime
    sent_at: datetime | None
