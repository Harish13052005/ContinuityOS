"""Extract evidence-backed knowledge from an uploaded text source."""

from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.v1.endpoints.auth import get_current_user
from app.core.config import settings
from app.core.database import get_db
from app.models.project import Project
from app.models.project_member import ProjectMember
from app.models.source import Source
from app.models.user import User
from app.ai.extraction_service import extract_from_source
from app.services.document_text import DocumentReadError, read_document_text

router = APIRouter(prefix="/extraction", tags=["extraction"])
SUPPORTED_SOURCE_TYPES = {"txt", "markdown", "csv", "json", "pdf", "docx"}


@router.post("/source/{source_id}", status_code=202)
def extract_source_knowledge(
    source_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    source = db.get(Source, source_id)
    if source is None:
        raise HTTPException(status_code=404, detail="Source not found")
    project = db.get(Project, source.project_id)
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found")
    is_member = db.scalar(select(ProjectMember.id).where(
        ProjectMember.project_id == project.id,
        ProjectMember.user_id == current_user.id,
    ))
    if project.owner_id != current_user.id and is_member is None and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not authorized")
    if source.access_level == "private" and source.uploaded_by != current_user.id and project.owner_id != current_user.id and current_user.role != "admin":
        raise HTTPException(status_code=404, detail="Source not found")
    if source.source_type not in SUPPORTED_SOURCE_TYPES:
        raise HTTPException(status_code=415, detail="Unsupported source type")

    storage_path = Path(source.storage_path).resolve()
    storage_root = Path(settings.STORAGE_DIR).resolve()
    if not storage_path.is_relative_to(storage_root) or not storage_path.is_file():
        raise HTTPException(status_code=404, detail="Source file not found")
    try:
        content, evidence_chunks = read_document_text(storage_path, source.source_type)
    except DocumentReadError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except ImportError as exc:
        raise HTTPException(status_code=503, detail="Document parser dependency is not installed") from exc
    result = extract_from_source(
        project_id=source.project_id,
        source_id=source.id,
        source_filename=source.filename,
        source_type=source.source_type,
        content=content,
        evidence_chunks=evidence_chunks,
        uploaded_by=current_user.id,
        db_session=db,
    )
    if result["extraction_status"] == "failed":
        raise HTTPException(status_code=503, detail="Knowledge extraction could not complete. Check provider configuration and retry.")
    return {"status": result["extraction_status"], "items_created": result["items_created"], "items": result.get("items", [])}
