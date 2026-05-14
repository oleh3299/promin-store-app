from typing import Literal

from pydantic import BaseModel


InvoiceRequestType = Literal["incoming", "return", "writeoff", "assembly"]


class InvoiceUploadResponse(BaseModel):
    ok: bool
    status: str | None = None
    request_type: str | None = None
    error: str | None = None
    message: str | None = None
