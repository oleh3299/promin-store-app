from pydantic import BaseModel


class PushRegisterRequest(BaseModel):
    endpoint: str
    p256dh: str
    auth: str
    user_agent: str | None = None


class PushSubscriptionRead(BaseModel):
    id: int
    device_id: int
    endpoint: str
    user_agent: str | None

    model_config = {"from_attributes": True}


class PushPublicKeyResponse(BaseModel):
    public_key: str | None
