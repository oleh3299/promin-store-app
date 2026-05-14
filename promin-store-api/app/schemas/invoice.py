from typing import Literal

from pydantic import BaseModel


InvoiceRequestType = Literal["incoming", "return", "writeoff", "assembly"]


class InvoiceUploadResponse(BaseModel):
    ok: bool
    status: str | None = None
    request_type: str | None = None
    error: str | None = None
    message: str | None = None


class InvoiceTodayItem(BaseModel):
    id: int
    request_type: str
    request_type_label: str
    employee_name: str | None
    status: str
    created_at: str
    sent_at: str | None


class InvoiceTodayResponse(BaseModel):
    items: list[InvoiceTodayItem]
