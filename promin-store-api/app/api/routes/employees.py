from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import Device, Employee, User
from app.schemas.employee import EmployeeRead
from app.security import get_current_device, get_current_user

router = APIRouter(prefix="/employees", tags=["employees"])


@router.get("/by-barcode/{barcode}", response_model=EmployeeRead)
def get_employee_by_barcode(
    barcode: str,
    db: Session = Depends(get_db),
    current_device: Device = Depends(get_current_device),
) -> Employee:
    statement = select(Employee).where(Employee.barcode == barcode, Employee.is_active.is_(True))
    if current_device.store_id is not None:
        statement = statement.where(
            (Employee.store_id == current_device.store_id) | (Employee.store_id.is_(None)),
        )

    employee = db.scalar(statement)
    if employee is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Employee not found")

    return employee


@router.get("", response_model=list[EmployeeRead])
def list_employees(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
) -> list[Employee]:
    return list(
        db.scalars(
            select(Employee).where(Employee.is_active.is_(True)).order_by(Employee.full_name),
        ),
    )
