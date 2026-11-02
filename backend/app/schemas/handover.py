from pydantic import BaseModel


class HealthResponse(BaseModel):
    status: str
    service: str
    version: str


class HandoverBase(BaseModel):
    project_id: str
    title: str
    status: str = "draft"  # draft, in_review, approved, archived
    created_by: str


class HandoverCreate(HandoverBase):
    approved_by: str | None = None


class HandoverRead(HandoverBase):
    id: str
    version: str
    approved_by: str | None
    created_at: str

    model_config = {"from_attributes": True}