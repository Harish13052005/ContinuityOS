from datetime import datetime
from typing import Literal
from pydantic import BaseModel, Field


class ExtractedItemBase(BaseModel):
    item_type: str  # decision, task, risk, dependency, blocker, question, responsibility, milestone
    title: str
    content: str
    confidence: int = Field(default=80, ge=0, le=100)
    verification_status: str = "pending"  # pending, verified, disputed


class ExtractedItemCreate(ExtractedItemBase):
    project_id: str
    source_id: str | None = None


class ExtractedItemRead(ExtractedItemBase):
    id: str
    project_id: str
    source_id: str | None
    created_at: datetime
    original_content: str | None = None
    review_reason: str | None = None

    model_config = {"from_attributes": True}


class ExtractedItemReview(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=255)
    content: str | None = Field(default=None, min_length=1, max_length=10000)
    verification_status: Literal["supported", "needs_review", "conflicting", "stale", "unverified"]
    review_reason: str = Field(min_length=3, max_length=2000)
