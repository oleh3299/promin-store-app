from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field


class StoreRequestCreate(BaseModel):
    route_key: Literal[
        "purchase",
        "accounting",
        "it",
        "manager",
        "security",
        "repair",
        "cash",
        "other",
    ]
    request_type: str | None = None
    employee_id: int | None = None
    message: str = Field(min_length=1, max_length=4000)


class StoreRequestResponse(BaseModel):
    ok: bool
    status: str | None = None
    route_key: str | None = None
    error: str | None = None
    message: str | None = None


class ActiveStoreEmployeeRead(BaseModel):
    employee_id: int
    full_name: str
    position: str
    checkin_at: datetime


class ActiveStoreEmployeesResponse(BaseModel):
    items: list[ActiveStoreEmployeeRead]
