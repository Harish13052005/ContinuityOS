"""Persist revoked access token identifiers across API workers and restarts."""

from datetime import datetime

from sqlalchemy import Column, DateTime, String

from app.core.database import Base


class TokenRevocation(Base):
    __tablename__ = "token_revocations"

    jti = Column(String(36), primary_key=True)
    expires_at = Column(DateTime(timezone=True), nullable=False, index=True)
    revoked_at = Column(DateTime(timezone=True), nullable=False, default=datetime.utcnow)
