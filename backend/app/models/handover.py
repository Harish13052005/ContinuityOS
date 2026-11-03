"""Project handover report model."""

import uuid
from datetime import datetime

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String, Text

from app.core.database import Base


class Handover(Base):
    __tablename__ = "handovers"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    project_id = Column(String(36), ForeignKey("projects.id"), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    status = Column(String(20), default="draft", nullable=False)
    created_by = Column(String(36), ForeignKey("users.id"), nullable=False)
    approved_by = Column(String(36), ForeignKey("users.id"), nullable=True)
    recipient_name = Column(String(255), nullable=True)
    recipient_role = Column(String(100), nullable=True)
    recipient_email = Column(String(255), nullable=True)
    version = Column(Integer, default=1, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    project_overview = Column(Text, nullable=True)
    current_status = Column(Text, nullable=True)
    decisions = Column(Text, nullable=True)
    pending_tasks = Column(Text, nullable=True)
    dependencies_blockers = Column(Text, nullable=True)
    risks_questions = Column(Text, nullable=True)
    milestones = Column(Text, nullable=True)
    is_public = Column(Boolean, default=False, nullable=False)
    recipient_permissions = Column(Text, nullable=True)
    next_actions = Column(Text, nullable=True)
    missing_conflicting = Column(Text, nullable=True)
    supporting_evidence = Column(Text, nullable=True)
