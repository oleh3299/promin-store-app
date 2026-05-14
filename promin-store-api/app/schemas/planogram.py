from pydantic import BaseModel


class PlanogramRead(BaseModel):
    id: int
    category_name: str
    description: str | None
    image_url: str
    uploaded_at: str


class PlanogramListResponse(BaseModel):
    items: list[PlanogramRead]
