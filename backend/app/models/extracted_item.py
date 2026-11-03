"""Extracted item model - decisions, tasks, risks, dependencies, blockers, questions, responsibilities, milestones."""

import uuid
from datetime import datetime

from sqlalchemy import Column, DateTime, ForeignKey, String, Integer, Text

from app.core.database import Base


class ExtractedItem(Base):
    __tablename__ = "extracted_items"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    project_id = Column(String(36), ForeignKey("projects.id"), nullable=False, index=True)
    source_id = Column(String(36), ForeignKey("sources.id"), nullable=True, index=True)
    item_type = Column(String(50), nullable=False)  # decision, task, risk, dependency, blocker, question, responsibility, milestone
    title = Column(String(255), nullable=False)
    content = Column(Text, nullable=False)
    original_content = Column(Text, nullable=True)
    review_reason = Column(Text, nullable=True)
    confidence = Column(Integer, default=80)  # 0-100
    verification_status = Column(String(20), default="pending")  # pending, verified, disputed
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
