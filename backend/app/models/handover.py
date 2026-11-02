"""Handover report model."""

import uuid
from datetime import datetime

from sqlalchemy import Column, DateTime, ForeignKey, String, Integer

from app.core.database import Base


class Handover(Base):
    __tablename__ = "handovers"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    project_id = Column(String(36), ForeignKey("projects.id"), nullable=False)
    title = Column(String(255), nullable=False)
    status = Column(String(20), default="draft")  # draft, in_review, approved, archived
    created_by = Column(String(36), ForeignKey("users.id"), nullable=False)
    approved_by = Column(String(36), ForeignKey("users.id"), nullable=True)
    version = Column(String(20), default="1.0")
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)