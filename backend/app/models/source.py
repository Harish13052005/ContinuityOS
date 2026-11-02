"""Source document model."""

import uuid
from datetime import datetime

from sqlalchemy import Column, DateTime, ForeignKey, String, Text

from app.core.database import Base


class Source(Base):
    __tablename__ = "sources"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    project_id = Column(String(36), ForeignKey("projects.id"), nullable=False)
    filename = Column(String(255), nullable=False)
    source_type = Column(String(50), nullable=False)  # pdf, docx, txt, markdown, csv, json
    storage_path = Column(String(500), nullable=False)  # path outside public dir
    uploaded_by = Column(String(36), ForeignKey("users.id"), nullable=False)
    access_level = Column(String(20), default="project")  # project, team, private
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)