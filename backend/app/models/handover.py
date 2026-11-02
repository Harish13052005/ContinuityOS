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
    approved_by = Column(String(36), ForeignKey("users.id"), nullable=True)\n    \n    # Recipient information\n    recipient_name = Column(String(255), nullable=True)\n    recipient_role = Column(String(100), nullable=True)\n    recipient_email = Column(String(255), nullable=True)
    version = Column(Integer, default=1)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)\n    \n    # Content sections\n    project_overview = Column(Text, nullable=True)\n    current_status = Column(Text, nullable=True)\n    decisions = Column(Text, nullable=True)\n    pending_tasks = Column(Text, nullable=True)\n    dependencies_blockers = Column(Text, nullable=True)\n    risks_questions = Column(Text, nullable=True)\n    milestones = Column(Text, nullable=True)\n    \n    # Audit and permissions\n    is_public = Column(Boolean, default=False)\n    recipient_permissions = Column(Text, nullable=True)\n    next_actions = Column(Text, nullable=True)\n    missing_conflicting = Column(Text, nullable=True)