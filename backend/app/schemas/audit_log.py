from pydantic import BaseModel


class AuditLogBase(BaseModel):
    user_id: str
    project_id: str
    action: str  # e.g., create, update, delete, upload, approve
    entity_type: str  # e.g., user, project, source, extracted_item, evidence, handover
    entity_id: str


class AuditLogCreate(AuditLogBase):
    pass


class AuditLogRead(AuditLogBase):
    id: str
    timestamp: str

    model_config = {"from_attributes": True}