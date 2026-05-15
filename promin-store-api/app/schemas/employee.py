from pydantic import BaseModel


class EmployeeRead(BaseModel):
    id: int
    store_id: int | None
    full_name: str
    barcode: str
    tax_code: str | None
    position: str
    is_active: bool
    external_1c_id: str | None

    model_config = {"from_attributes": True}
