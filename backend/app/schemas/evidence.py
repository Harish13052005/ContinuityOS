from pydantic import BaseModel


class EvidenceBase(BaseModel):
    extracted_item_id: str
    source_id: str
    page_number: int | None = None
    location_reference: str | None = None  # e.g., "section 3.2, footnote 5"
    excerpt: str


class EvidenceCreate(EvidenceBase):
    pass


class EvidenceRead(EvidenceBase):
    id: str
    extracted_item_id: str
    source_id: str
    page_number: int | None
    location_reference: str | None
    created_at: str

    model_config = {"from_attributes": True}