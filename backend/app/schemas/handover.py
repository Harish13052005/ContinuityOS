from datetime import datetime

import json

from pydantic import BaseModel, Field, field_validator


class HandoverCreate(BaseModel):
    title: str = Field(min_length=1, max_length=255)
    recipient_email: str | None = Field(default=None, max_length=255)


class HandoverRead(BaseModel):
    id: str
    project_id: str
    title: str
    status: str
    version: int
    approved_by: str | None
    created_at: datetime
    recipient_name: str | None = None
    recipient_role: str | None = None
    project_overview: str | None = None
    current_status: str | None = None
    decisions: str | None = None
    pending_tasks: str | None = None
    dependencies_blockers: str | None = None
    risks_questions: str | None = None
    milestones: str | None = None
    next_actions: str | None = None
    missing_conflicting: str | None = None
    supporting_evidence: list[dict] = Field(default_factory=list)

    model_config = {"from_attributes": True}

    @field_validator("supporting_evidence", mode="before")
    @classmethod
    def parse_supporting_evidence(cls, value):
        if isinstance(value, str):
            try:
                return json.loads(value)
            except (TypeError, json.JSONDecodeError):
                return []
        return value or []
