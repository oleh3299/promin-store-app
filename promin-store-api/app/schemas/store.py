from pydantic import BaseModel


class StoreRead(BaseModel):
    id: int
    code: str
    name: str
    address: str | None
    is_active: bool

    model_config = {"from_attributes": True}
