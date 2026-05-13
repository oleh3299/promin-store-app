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


class DeviceRead(BaseModel):
    id: int
    store_id: int | None
    device_uuid: str
    device_name: str
    platform: str
    status: DeviceStatus
    last_seen_at: datetime | None

    model_config = {"from_attributes": True}
