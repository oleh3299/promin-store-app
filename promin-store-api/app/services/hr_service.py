from datetime import date, datetime, timezone
import logging

import requests
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import get_settings
from app.models import HRCandidate, HRCandidateDocument, HRCandidateEvent, User
from app.schemas.hr import HRCandidateCreate, HRCandidateDocumentRead, HRCandidateRead, HRCandidateUpdate

logger = logging.getLogger(__name__)

DOCUMENT_TYPES = {
    "passport_copy": "passport_copy_added",
    "registration_copy": "registration_copy_added",
    "tax_code_copy": "tax_code_copy_added",
}
VALID_DECISIONS = {"rejected", "trainee", "approved"}
VALID_SYNC_STATUSES = {"candidate", "trainee", "approved", "rejected", "synced_to_1c", "imported_from_1c"}


class HRServiceError(Exception):
    def __init__(self, code: str, message: str) -> None:
        self.code = code
        self.message = message
        super().__init__(message)


def candidate_badge_code(candidate: HRCandidate) -> str:
    return f"HR-{candidate.id:06d}"


def calculate_age(birth_date: date | None) -> int | None:
    if birth_date is None:
        return None

    today = date.today()
    years = today.year - birth_date.year
    if (today.month, today.day) < (birth_date.month, birth_date.day):
        years -= 1
    return years


def _clean_optional(value: str | None) -> str | None:
    if value is None:
        return None
    stripped = value.strip()
    return stripped or None


def candidate_to_read(candidate: HRCandidate) -> HRCandidateRead:
    return HRCandidateRead(
        id=candidate.id,
        first_name=candidate.first_name,
        last_name=candidate.last_name,
        middle_name=candidate.middle_name,
        birth_date=candidate.birth_date,
        phone1=candidate.phone1,
        phone2=candidate.phone2,
        passport_code=candidate.passport_code,
        tax_code=candidate.tax_code,
        residence_address=candidate.residence_address,
        registration_address=candidate.registration_address,
        marital_status=candidate.marital_status,
        has_children=candidate.has_children,
        has_credits=candidate.has_credits,
        credits_amount=candidate.credits_amount,
        previous_workplace=candidate.previous_workplace,
        work_experience=candidate.work_experience,
        interview_date=candidate.interview_date,
        internship_datetime=candidate.internship_datetime,
        position=candidate.position,
        hr_comment=candidate.hr_comment,
        decision=candidate.decision,
        sync_status=candidate.sync_status,
        synced_at=candidate.synced_at,
        imported_employee_id=candidate.imported_employee_id,
        created_by=candidate.created_by,
        created_at=candidate.created_at,
        updated_at=candidate.updated_at,
        badge_code=candidate_badge_code(candidate),
        age=calculate_age(candidate.birth_date),
        documents=[
            HRCandidateDocumentRead(document_type=document.document_type, is_added=document.is_added)
            for document in candidate.documents
        ],
    )


def _add_event(
    db: Session,
    candidate: HRCandidate,
    event_type: str,
    author: User | None,
    comment: str | None = None,
) -> None:
    db.add(
        HRCandidateEvent(
            candidate_id=candidate.id,
            event_type=event_type,
            author_user_id=author.id if author else None,
            comment=comment,
            created_at=datetime.now(timezone.utc),
        ),
    )


def _sync_status_for_decision(decision: str) -> str:
    if decision == "rejected":
        return "rejected"
    if decision == "approved":
        return "approved"
    return "trainee"


def _set_documents(db: Session, candidate: HRCandidate, payload: HRCandidateCreate | HRCandidateUpdate) -> None:
    for document_type, payload_field in DOCUMENT_TYPES.items():
        value = getattr(payload, payload_field, None)
        if value is None:
            continue

        document = next(
            (item for item in candidate.documents if item.document_type == document_type),
            None,
        )
        if document is None:
            document = HRCandidateDocument(
                candidate_id=candidate.id,
                document_type=document_type,
                is_added=bool(value),
                created_at=datetime.now(timezone.utc),
            )
            db.add(document)
        else:
            document.is_added = bool(value)
            db.add(document)


def create_candidate(db: Session, payload: HRCandidateCreate, author: User | None) -> HRCandidate:
    if payload.decision not in VALID_DECISIONS:
        raise HRServiceError("invalid_decision", "Invalid HR decision")

    candidate = HRCandidate(
        first_name=payload.first_name.strip(),
        last_name=payload.last_name.strip(),
        middle_name=_clean_optional(payload.middle_name),
        birth_date=payload.birth_date,
        phone1=_clean_optional(payload.phone1),
        phone2=_clean_optional(payload.phone2),
        passport_code=_clean_optional(payload.passport_code),
        tax_code=_clean_optional(payload.tax_code),
        residence_address=_clean_optional(payload.residence_address),
        registration_address=_clean_optional(payload.registration_address),
        marital_status=_clean_optional(payload.marital_status),
        has_children=payload.has_children,
        has_credits=payload.has_credits,
        credits_amount=payload.credits_amount,
        previous_workplace=_clean_optional(payload.previous_workplace),
        work_experience=_clean_optional(payload.work_experience),
        interview_date=payload.interview_date,
        internship_datetime=payload.internship_datetime,
        position=_clean_optional(payload.position),
        hr_comment=_clean_optional(payload.hr_comment),
        decision=payload.decision,
        sync_status=_sync_status_for_decision(payload.decision),
        created_by=author.id if author else None,
    )
    db.add(candidate)
    db.commit()
    db.refresh(candidate)
    _set_documents(db, candidate, payload)
    _add_event(db, candidate, "created", author)
    db.commit()
    db.refresh(candidate)
    return candidate


def update_candidate(db: Session, candidate: HRCandidate, payload: HRCandidateUpdate, author: User | None) -> HRCandidate:
    data = payload.model_dump(exclude_unset=True)
    document_fields = set(DOCUMENT_TYPES.values())

    if "decision" in data and data["decision"] not in VALID_DECISIONS:
        raise HRServiceError("invalid_decision", "Invalid HR decision")
    if "sync_status" in data and data["sync_status"] not in VALID_SYNC_STATUSES:
        raise HRServiceError("invalid_sync_status", "Invalid HR sync status")

    for key, value in data.items():
        if key in document_fields:
            continue
        if isinstance(value, str):
            value = _clean_optional(value)
        setattr(candidate, key, value)

    if "decision" in data and "sync_status" not in data:
        candidate.sync_status = _sync_status_for_decision(candidate.decision)

    db.add(candidate)
    db.commit()
    db.refresh(candidate)
    _set_documents(db, candidate, payload)
    _add_event(db, candidate, "updated", author)
    db.commit()
    db.refresh(candidate)
    return candidate


def build_one_c_candidate_payload(candidate: HRCandidate) -> dict:
    return {
        "candidate_id": candidate.id,
        "badge_code": candidate_badge_code(candidate),
        "first_name": candidate.first_name,
        "last_name": candidate.last_name,
        "middle_name": candidate.middle_name,
        "full_name": str(candidate),
        "birth_date": candidate.birth_date.isoformat() if candidate.birth_date else None,
        "phone1": candidate.phone1,
        "phone2": candidate.phone2,
        "passport_code": candidate.passport_code,
        "tax_code": candidate.tax_code,
        "residence_address": candidate.residence_address,
        "registration_address": candidate.registration_address,
        "marital_status": candidate.marital_status,
        "has_children": candidate.has_children,
        "has_credits": candidate.has_credits,
        "credits_amount": str(candidate.credits_amount) if candidate.credits_amount is not None else None,
        "previous_workplace": candidate.previous_workplace,
        "work_experience": candidate.work_experience,
        "interview_date": candidate.interview_date.isoformat() if candidate.interview_date else None,
        "internship_datetime": candidate.internship_datetime.isoformat() if candidate.internship_datetime else None,
        "position": candidate.position,
        "hr_comment": candidate.hr_comment,
        "decision": candidate.decision,
        "sync_status": candidate.sync_status,
    }


def send_candidate_to_one_c(db: Session, candidate: HRCandidate, author: User | None) -> HRCandidate:
    settings = get_settings()
    if not settings.one_c_hr_candidates_url:
        raise HRServiceError("one_c_not_configured", "1C HR candidate endpoint is not configured")

    payload = build_one_c_candidate_payload(candidate)
    headers = {"Content-Type": "application/json"}
    if settings.one_c_hr_api_key:
        headers["X-API-Key"] = settings.one_c_hr_api_key

    try:
        response = requests.post(
            settings.one_c_hr_candidates_url,
            json=payload,
            headers=headers,
            timeout=settings.one_c_hr_timeout_seconds,
        )
        response.raise_for_status()
    except requests.RequestException as exc:
        logger.warning("hr_candidate_send_to_1c_failed", extra={"candidate_id": candidate.id})
        raise HRServiceError("one_c_delivery_failed", "Failed to send HR candidate to 1C") from exc

    candidate.sync_status = "synced_to_1c"
    candidate.synced_at = datetime.now(timezone.utc)
    db.add(candidate)
    _add_event(db, candidate, "sent_to_1c", author)
    db.commit()
    db.refresh(candidate)
    return candidate


def find_candidate_for_employee_import(db: Session, tax_code: str | None) -> HRCandidate | None:
    tax_code = _clean_optional(tax_code)
    if tax_code is None:
        return None

    return db.scalar(
        select(HRCandidate)
        .where(
            HRCandidate.tax_code == tax_code,
            HRCandidate.imported_employee_id.is_(None),
            HRCandidate.sync_status.in_(["synced_to_1c", "approved", "trainee"]),
        )
        .order_by(HRCandidate.created_at.desc()),
    )
