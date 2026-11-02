"""Audit log model."""

import uuid
from datetime import datetime

from sqlalchemy import Column, DateTime, ForeignKey, String

from app.core.database import Base


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    project_id = Column(String(36), ForeignKey("projects.id"), nullable=False)
    action = Column(String(100), nullable=False)  # e.g., create, update, delete, upload, approve
    entity_type = Column(String(50), nullable=False)  # e.g., user, project, source, extracted_item, evidence, handover
    entity_id = Column(String(36), nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow, nullable=False)