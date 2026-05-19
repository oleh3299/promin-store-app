from pydantic import BaseModel


class StoreTaskAttachmentRead(BaseModel):
    id: int
    attachment_type: str
    file_url: str | None
    created_at: str


class StoreTaskEventRead(BaseModel):
    id: int
    event_type: str
    author_type: str
    comment: str | None
    created_at: str


class StoreTaskRead(BaseModel):
    id: int
    title: str
    description: str | None
    source: str
    category: str | None
    source_route_key: str | None
    source_user_name: str | None
    status: str
    priority: str
    due_date: str | None
    due_time: str | None
    department_name: str | None
    requires_photo: bool
    requires_comment: bool
    requires_verification: bool
    completed_at: str | None
    is_overdue: bool
    created_at: str


class StoreTaskDetail(StoreTaskRead):
    attachments: list[StoreTaskAttachmentRead]
    events: list[StoreTaskEventRead]


class StoreTaskListResponse(BaseModel):
    items: list[StoreTaskRead]


class StoreTaskActionResponse(BaseModel):
    ok: bool
    status: str | None = None
    task: StoreTaskRead | None = None
    error: str | None = None
    message: str | None = None
