from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import Device
from app.schemas.store_request import (
    ActiveStoreEmployeesResponse,
    StoreRequestCreate,
    StoreRequestResponse,
)
from app.security import get_current_device
from app.services.store_request_service import (
    StoreRequestError,
    create_store_request,
    get_active_store_employees,
)

router = APIRouter(prefix="/store-requests", tags=["store-requests"])


@router.get("/active-employees", response_model=ActiveStoreEmployeesResponse)
def list_active_store_employees(
    db: Session = Depends(get_db),
    current_device: Device = Depends(get_current_device),
) -> ActiveStoreEmployeesResponse:
    return ActiveStoreEmployeesResponse(
        items=get_active_store_employees(db, current_device),
    )


@router.post("", response_model=StoreRequestResponse)
def create_store_request_endpoint(
    payload: StoreRequestCreate,
    db: Session = Depends(get_db),
    current_device: Device = Depends(get_current_device),
) -> StoreRequestResponse:
    try:
        result = create_store_request(db, current_device, payload)
    except StoreRequestError as exc:
        return StoreRequestResponse(ok=False, error=exc.code, message=exc.message)

    return StoreRequestResponse(
        ok=True,
        status=result.status,
        route_key=result.route_key,
    )
