from pydantic import BaseModel


class PhotoReportRouteTestResponse(BaseModel):
    ok: bool
    sent: bool
    room_name: str | None
    room_id: str
