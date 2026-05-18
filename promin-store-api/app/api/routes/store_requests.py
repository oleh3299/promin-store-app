from fastapi import APIRouter, Depends, File, Form, UploadFile
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
    MAX_STORE_REQUEST_FILE_SIZE,
    StoreRequestError,
    create_store_request,
    create_store_request_with_optional_file,
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


@router.post("/upload", response_model=StoreRequestResponse)
async def create_store_request_upload_endpoint(
    route_key: str = Form(...),
    request_type: str | None = Form(default=None),
    employee_id: int | None = Form(default=None),
    message: str = Form(...),
    file: UploadFile | None = File(default=None),
    db: Session = Depends(get_db),
    current_device: Device = Depends(get_current_device),
) -> StoreRequestResponse:
    file_bytes: bytes | None = None
    if file is not None and file.filename:
        file_bytes = await file.read(MAX_STORE_REQUEST_FILE_SIZE + 1)

    try:
        result = create_store_request_with_optional_file(
            db,
            current_device,
            StoreRequestCreate(
                route_key=route_key,
                request_type=request_type,
                employee_id=employee_id,
                message=message,
            ),
            file.filename if file else None,
            file.content_type if file else None,
            file_bytes,
        )
    except StoreRequestError as exc:
        return StoreRequestResponse(ok=False, error=exc.code, message=exc.message)

    return StoreRequestResponse(ok=True, status=result.status, route_key=result.route_key)
