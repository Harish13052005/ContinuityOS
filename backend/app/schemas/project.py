from pydantic import BaseModel


class ProjectBase(BaseModel):
    name: str
    description: str | None = None


class ProjectCreate(ProjectBase):
    pass


class ProjectRead(ProjectBase):
    id: str
    owner_id: str

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
