from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models import Employee
from app.schemas.integration import (
    OneCEmployeePayload,
    OneCEmployeesSyncError,
    OneCEmployeesSyncRequest,
    OneCEmployeesSyncResponse,
)


def _clean_optional(value: str | None) -> str | None:
    if value is None:
        return None
    cleaned_value = value.strip()
    return cleaned_value or None


def _clean_required(value: str) -> str:
    return value.strip()


def _find_employee(db: Session, payload: OneCEmployeePayload) -> Employee | None:
    barcode = _clean_required(payload.barcode)
    external_1c_id = _clean_optional(payload.external_1c_id)

    if external_1c_id is not None:
        employee = db.scalar(select(Employee).where(Employee.external_1c_id == external_1c_id))
        if employee is not None:
            return employee

    return db.scalar(select(Employee).where(Employee.barcode == barcode))


def _barcode_belongs_to_another_employee(
    db: Session,
    barcode: str,
    employee: Employee,
) -> bool:
    existing = db.scalar(
        select(Employee).where(Employee.barcode == barcode, Employee.id != employee.id),
    )
    return existing is not None


def _sync_one_employee(
    db: Session,
    payload: OneCEmployeePayload,
) -> str:
    barcode = _clean_required(payload.barcode)
    external_1c_id = _clean_optional(payload.external_1c_id)
    employee = _find_employee(db, payload)

    if employee is not None and _barcode_belongs_to_another_employee(db, barcode, employee):
        return "duplicate_barcode"

    if employee is None:
        employee = Employee(
            store_id=None,
            full_name=_clean_required(payload.full_name),
            barcode=barcode,
            position=_clean_required(payload.position),
            is_active=payload.is_active,
            external_1c_id=external_1c_id,
        )
        db.add(employee)
        action = "created"
    else:
        employee.full_name = _clean_required(payload.full_name)
        employee.barcode = barcode
        employee.position = _clean_required(payload.position)
        employee.is_active = payload.is_active
        employee.external_1c_id = external_1c_id
        db.add(employee)
        action = "updated"

    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        return "duplicate_barcode"

    return action


def sync_one_c_employees(
    db: Session,
    payload: OneCEmployeesSyncRequest,
) -> OneCEmployeesSyncResponse:
    created = 0
    updated = 0
    errors: list[OneCEmployeesSyncError] = []
    seen_barcodes: set[str] = set()

    for index, employee_payload in enumerate(payload.employees):
        barcode = _clean_required(employee_payload.barcode)
        store_code = _clean_optional(employee_payload.store_code)

        if barcode in seen_barcodes:
            errors.append(
                OneCEmployeesSyncError(
                    index=index,
                    barcode=barcode,
                    error="duplicate_barcode_in_payload",
                    store_code=store_code,
                ),
            )
            continue
        seen_barcodes.add(barcode)

        action = _sync_one_employee(db, employee_payload)
        if action == "created":
            created += 1
        elif action == "updated":
            updated += 1
        else:
            errors.append(
                OneCEmployeesSyncError(
                    index=index,
                    barcode=barcode,
                    error=action,
                    store_code=store_code,
                ),
            )

    skipped = len(errors)
    return OneCEmployeesSyncResponse(
        ok=True,
        received=len(payload.employees),
        created=created,
        updated=updated,
        skipped=skipped,
        errors=errors,
    )
