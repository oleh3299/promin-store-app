from datetime import datetime

from pydantic import BaseModel

from app.models.enums import DeviceStatus


class DeviceRegisterRequest(BaseModel):
    device_uuid: str
    device_name: str
    platform: str
    store_code: str | None = None


class DeviceRegisterResponse(BaseModel):
    id: int
    device_uuid: str
    status: DeviceStatus
    device_token: str


class DeviceLoginRequest(BaseModel):
    login: str
    password: str


class DeviceLoginRead(BaseModel):
    id: int
    store_id: int | None
    store_code: str | None
    store_name: str | None
    device_name: str


class DeviceLoginResponse(BaseModel):
    ok: bool
    device_token: str
    device: DeviceLoginRead


class DeviceRead(BaseModel):
    id: int
    store_id: int | None
    login: str | None
    device_uuid: str
    device_name: str
    platform: str
    is_active: bool
    status: DeviceStatus
    last_seen_at: datetime | None
    disabled_at: datetime | None
    disabled_reason: str | None

    model_config = {"from_attributes": True}
