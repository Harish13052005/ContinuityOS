"""Project member association."""

import uuid
from datetime import datetime

from sqlalchemy import Column, DateTime, ForeignKey, String

from app.core.database import Base


class ProjectMember(Base):
    __tablename__ = "project_members"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    project_id = Column(String(36), ForeignKey("projects.id"), nullable=False)
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    project_role = Column(String(50), default="member")
    joined_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    __table_args__ = (
        {"sqlite_autoincrement": False},
    )