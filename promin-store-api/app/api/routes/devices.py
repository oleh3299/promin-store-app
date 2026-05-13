from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import require_manager_or_admin
from app.db import get_db
from app.models import Device, DeviceStatus, Store, User
from app.schemas.device import DeviceRead, DeviceRegisterRequest, DeviceRegisterResponse
from app.security import create_device_token, get_current_device, hash_token

router = APIRouter(prefix="/devices", tags=["devices"])


@router.post("/register", response_model=DeviceRegisterResponse)
def register_device(
    payload: DeviceRegisterRequest,
    db: Session = Depends(get_db),
) -> DeviceRegisterResponse:
    store_id = None
    if payload.store_code:
        store = db.scalar(select(Store).where(Store.code == payload.store_code))
        if store is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Store not found")
        store_id = store.id

    device_token = create_device_token()
    device = db.scalar(select(Device).where(Device.device_uuid == payload.device_uuid))
    if device is None:
        device = Device(
            store_id=store_id,
            device_uuid=payload.device_uuid,
            device_name=payload.device_name,
            platform=payload.platform,
            token_hash=hash_token(device_token),
            status=DeviceStatus.active,
            last_seen_at=datetime.now(UTC),
        )
    else:
        device.store_id = store_id
        device.device_name = payload.device_name
        device.platform = payload.platform
        device.token_hash = hash_token(device_token)
        device.status = DeviceStatus.active
        device.last_seen_at = datetime.now(UTC)

    db.add(device)
    db.commit()
    db.refresh(device)

    return DeviceRegisterResponse(
        id=device.id,
        device_uuid=device.device_uuid,
        status=device.status,
        device_token=device_token,
    )


@router.get("/me", response_model=DeviceRead)
def get_device_me(current_device: Device = Depends(get_current_device)) -> Device:
    return current_device


@router.post("/{device_id}/revoke", response_model=DeviceRead)
def revoke_device(
    device_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_manager_or_admin),
) -> Device:
    device = db.get(Device, device_id)
    if device is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Device not found")

    device.status = DeviceStatus.revoked
    db.add(device)
    db.commit()
    db.refresh(device)
    return device
