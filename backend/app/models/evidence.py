"""Evidence model supporting extracted items."""

import uuid
from datetime import datetime

from sqlalchemy import Column, DateTime, ForeignKey, String, Integer, Text

from app.core.database import Base


class Evidence(Base):
    __tablename__ = "evidence"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    extracted_item_id = Column(String(36), ForeignKey("extracted_items.id"), nullable=False)
    source_id = Column(String(36), ForeignKey("sources.id"), nullable=False)
    page_number = Column(Integer, nullable=True)
    location_reference = Column(String(255), nullable=True)  # e.g., "section 3.2, footnote 5"
    excerpt = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)