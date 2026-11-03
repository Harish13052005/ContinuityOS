from datetime import datetime
from pydantic import BaseModel, Field


class ProjectBase(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    description: str | None = None


class ProjectCreate(ProjectBase):
    pass


class ProjectRead(ProjectBase):
    id: str
    owner_id: str
    created_at: datetime

    model_config = {"from_attributes": True}


class ProjectMemberBase(BaseModel):
    user_id: str
    project_role: str = "member"


class ProjectMemberCreate(ProjectMemberBase):
    pass


class ProjectMemberRead(ProjectMemberBase):
    id: str
    joined_at: str

    model_config = {"from_attributes": True}
