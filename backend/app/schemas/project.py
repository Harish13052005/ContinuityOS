from datetime import datetime
from typing import Literal
from pydantic import BaseModel, EmailStr, Field


class ProjectBase(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    description: str | None = None


class ProjectCreate(ProjectBase):
    pass


class ProjectRead(ProjectBase):
    id: str
    owner_id: str
    created_at: datetime
    current_user_role: str | None = None

    model_config = {"from_attributes": True}


class ProjectMemberBase(BaseModel):
    user_id: str
    project_role: str = "member"


class ProjectMemberCreate(ProjectMemberBase):
    pass


class ProjectMemberInvite(BaseModel):
    email: EmailStr
    project_role: Literal["admin", "reviewer", "contributor"] = "contributor"


class ProjectMemberRead(ProjectMemberBase):
    id: str
    joined_at: str
    email: EmailStr | None = None
    full_name: str | None = None

    model_config = {"from_attributes": True}
