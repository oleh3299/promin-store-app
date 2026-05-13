from pydantic import BaseModel, Field


class OneCEmployeePayload(BaseModel):
    external_1c_id: str | None = None
    barcode: str = Field(min_length=1)
    tax_code: str | None = None
    full_name: str = Field(min_length=1)
    position: str = Field(min_length=1)
    store_code: str | None = None
    is_active: bool = True


class OneCEmployeesSyncRequest(BaseModel):
    employees: list[OneCEmployeePayload]


class OneCEmployeesSyncError(BaseModel):
    index: int
    barcode: str | None = None
    error: str
    store_code: str | None = None


class OneCEmployeesSyncResponse(BaseModel):
    ok: bool
    received: int
    created: int
    updated: int
    skipped: int
    errors: list[OneCEmployeesSyncError]
