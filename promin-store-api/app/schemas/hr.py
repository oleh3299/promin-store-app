from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel, Field


class HRCandidateBase(BaseModel):
    first_name: str = Field(min_length=1, max_length=128)
    last_name: str = Field(min_length=1, max_length=128)
    middle_name: str | None = None
    birth_date: date | None = None
    phone1: str | None = None
    phone2: str | None = None
    passport_code: str | None = None
    tax_code: str | None = None
    residence_address: str | None = None
    registration_address: str | None = None
    marital_status: str | None = None
    has_children: bool = False
    has_credits: bool = False
    credits_amount: Decimal | None = None
    previous_workplace: str | None = None
    work_experience: str | None = None
    interview_date: date | None = None
    internship_datetime: datetime | None = None
    position: str | None = None
    hr_comment: str | None = None
    decision: str = "trainee"


class HRCandidateCreate(HRCandidateBase):
    passport_copy_added: bool = False
    registration_copy_added: bool = False
    tax_code_copy_added: bool = False


class HRCandidateUpdate(BaseModel):
    first_name: str | None = None
    last_name: str | None = None
    middle_name: str | None = None
    birth_date: date | None = None
    phone1: str | None = None
    phone2: str | None = None
    passport_code: str | None = None
    tax_code: str | None = None
    residence_address: str | None = None
    registration_address: str | None = None
    marital_status: str | None = None
    has_children: bool | None = None
    has_credits: bool | None = None
    credits_amount: Decimal | None = None
    previous_workplace: str | None = None
    work_experience: str | None = None
    interview_date: date | None = None
    internship_datetime: datetime | None = None
    position: str | None = None
    hr_comment: str | None = None
    decision: str | None = None
    sync_status: str | None = None
    passport_copy_added: bool | None = None
    registration_copy_added: bool | None = None
    tax_code_copy_added: bool | None = None


class HRCandidateDocumentRead(BaseModel):
    document_type: str
    is_added: bool


class HRCandidateRead(HRCandidateBase):
    id: int
    sync_status: str
    synced_at: datetime | None
    imported_employee_id: int | None
    created_by: int | None
    created_at: datetime
    updated_at: datetime
    badge_code: str
    age: int | None
    documents: list[HRCandidateDocumentRead] = Field(default_factory=list)


class HRCandidateListResponse(BaseModel):
    items: list[HRCandidateRead]


class HRCandidateSendResponse(BaseModel):
    ok: bool
    status: str
    error: str | None = None
    message: str | None = None
