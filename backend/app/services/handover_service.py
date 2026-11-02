"""Handover Generation Service for ContinuityOS.

Generates structured handover reports from extracted knowledge and evidence.
Handles permission filtering, source redaction, and version tracking.
"""

from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from uuid import uuid4

from sqlalchemy.orm import Session

from app.models.project import Project
from app.models.user import User
from app.models.extracted_item import ExtractedItem
from app.models.evidence import Evidence
from app.models.handover import Handover
from app.ai.reconstruction_service import reconstruct_project_state