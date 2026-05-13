from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import require_manager_or_admin
from app.db import get_db
from app.models import Device, DeviceStatus, Store, User
from app.schemas.device import (
    DeviceLoginRead,
    DeviceLoginRequest,
    DeviceLoginResponse,
    DeviceRead,
    DeviceRegisterRequest,
    DeviceRegisterResponse,
)
from app.security import (
    create_device_token,
    get_current_device,
    hash_token,
    verify_password,
)

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

    device = db.scalar(select(Device).where(Device.device_uuid == payload.device_uuid))
    if device is None:
        device_token = create_device_token()
        device = Device(
            store_id=store_id,
            device_uuid=payload.device_uuid,
            device_name=payload.device_name,
            platform=payload.platform,
            token_hash=hash_token(device_token),
            is_active=True,
            status=DeviceStatus.active,
            last_seen_at=datetime.now(timezone.utc),
        )
    else:
        if not device.is_active or device.status != DeviceStatus.active:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Device disabled")
        device_token = create_device_token()
        device.store_id = store_id
        device.device_name = payload.device_name
        device.platform = payload.platform
        device.token_hash = hash_token(device_token)
        device.status = DeviceStatus.active
        device.last_seen_at = datetime.now(timezone.utc)

    db.add(device)
    db.commit()
    db.refresh(device)

    return DeviceRegisterResponse(
        id=device.id,
        device_uuid=device.device_uuid,
        status=device.status,
        device_token=device_token,
    )


@router.post("/login", response_model=DeviceLoginResponse)
def login_device(
    payload: DeviceLoginRequest,
    db: Session = Depends(get_db),
) -> DeviceLoginResponse:
    device = db.scalar(select(Device).where(Device.login == payload.login.strip().lower()))
    if device is None or not device.password_hash:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    if not verify_password(payload.password, device.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    if not device.is_active or device.status != DeviceStatus.active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Device disabled")

    device_token = create_device_token()
    device.token_hash = hash_token(device_token)
    device.last_seen_at = datetime.now(timezone.utc)
    db.add(device)
    db.commit()
    db.refresh(device)

    return DeviceLoginResponse(
        ok=True,
        device_token=device_token,
        device=DeviceLoginRead(
            id=device.id,
            store_id=device.store_id,
            store_code=device.store.code if device.store else None,
            store_name=device.store.name if device.store else None,
            device_name=device.device_name,
        ),
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
    device.is_active = False
    device.disabled_at = datetime.now(timezone.utc)
    device.disabled_reason = "Revoked by admin"
    db.add(device)
    db.commit()
    db.refresh(device)
    return device
