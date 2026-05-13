from fastapi import APIRouter, Depends, Header, HTTPException, status
from sqlalchemy.orm import Session

from app.config import Settings, get_settings
from app.db import get_db
from app.schemas.integration import OneCEmployeesSyncRequest, OneCEmployeesSyncResponse
from app.services.integration import sync_one_c_employees

router = APIRouter(prefix="/integration/1c", tags=["integration"])


def verify_one_c_api_key(
    x_api_key: str | None = Header(default=None, alias="X-API-Key"),
    settings: Settings = Depends(get_settings),
) -> None:
    expected_api_key = settings.one_c_integration_api_key
    if not expected_api_key:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Integration API key is not configured",
        )

    if not x_api_key:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing integration API key",
        )

    if x_api_key != expected_api_key:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid integration API key",
        )


@router.post(
    "/employees/sync",
    response_model=OneCEmployeesSyncResponse,
    dependencies=[Depends(verify_one_c_api_key)],
)
def sync_employees(
    payload: OneCEmployeesSyncRequest,
    db: Session = Depends(get_db),
) -> OneCEmployeesSyncResponse:
    return sync_one_c_employees(db, payload)
