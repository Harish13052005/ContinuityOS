from datetime import datetime
from pydantic import BaseModel, Field


class SourceBase(BaseModel):
    filename: str
    source_type: str  # pdf, docx, txt, markdown, csv, json
    access_level: str = "project"  # project, team, private


class SourceCreate(SourceBase):
    pass


class SourceRead(SourceBase):
    id: str
    project_id: str
    uploaded_by: str
    created_at: datetime

    model_config = {"from_attributes": True}


class SourceList(BaseModel):
    sources: list[SourceRead] = Field(default_factory=list)
    total: int
