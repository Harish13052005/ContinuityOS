from pydantic import BaseModel


class SourceBase(BaseModel):
    filename: str
    source_type: str  # pdf, docx, txt, markdown, csv, json
    access_level: str = "project"  # project, team, private


class SourceCreate(SourceBase):
    uploaded_by: str


class SourceRead(SourceBase):
    id: str
    project_id: str
    uploaded_by: str
    created_at: str

    model_config = {"from_attributes": True}