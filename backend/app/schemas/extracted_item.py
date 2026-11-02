from pydantic import BaseModel


class ExtractedItemBase(BaseModel):
    item_type: str  # decision, task, risk, dependency, blocker, question, responsibility, milestone
    title: str
    content: str
    confidence: int = 80  # 0-100
    verification_status: str = "pending"  # pending, verified, disputed


class ExtractedItemCreate(ExtractedItemBase):
    project_id: str
    source_id: str | None = None


class ExtractedItemRead(ExtractedItemBase):
    id: str
    project_id: str
    source_id: str | None
    created_at: str

    model_config = {"from_attributes": True}