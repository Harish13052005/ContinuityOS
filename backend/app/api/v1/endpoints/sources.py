import os
from typing import List, Optional

from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.project import Project
from app.models.source import Source
from app.schemas.source import SourceCreate, SourceRead, SourceList
from app.services.source_service import process_source_upload
from app.core.config import settings

router = APIRouter(prefix="/sources", tags=["sources"])

ALLOWED_SOURCE_TYPES = {"pdf", "docx", "txt", "markdown", "csv", "json"}
MAX_FILE_SIZE = 10 * 1024 * 1024
Path = __import__("pathlib").Path


@router.post("/upload", response_model=SourceRead, status_code=status.HTTP_201_CREATED)
async def upload_source(
    project_id: str,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    is_owner = project.owner_id == current_user.id
    is_member = any(pm.user_id == current_user.id for pm in project.members)
    if not is_owner and not is_member:
        raise HTTPException(status_code=403, detail="Not authorized")

    file_data = await file.read()
    filename = file.filename or "upload."
    ext = Path(filename).suffix.lower().lstrip(".")
    source_type = ext if ext in ALLOWED_SOURCE_TYPES else "txt"

    if len(file_data) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=400,
            detail=f"File too large. Max {MAX_FILE_SIZE / 1024 / 1024:.1f}MB",
        )

    try:
        source_data = process_source_upload(
            project_id=project_id,
            filename=filename,
            file_data=file_data,
            uploaded_by=current_user.id,
            source_type=source_type,
            access_level="project",
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    from sqlalchemy import select

    stmt = select(Source).where(Source.file_hash == source_data["file_hash"])
    existing = db.scalar(stmt)
    if existing:
        try:
            if os.path.exists(source_data["storage_path"]):
                os.unlink(source_data["storage_path"])
        except Exception:
            pass
        return SourceRead.from_orm(existing)

    from app.models.source import Source as SourceModel
    from datetime import datetime
    import uuid

    db_source = SourceModel(
        id=str(uuid.uuid4()),
        project_id=project_id,
        filename=source_data["filename"],
        source_type=source_data["source_type"],
        storage_path=source_data["storage_path"],
        uploaded_by=current_user.id,
        access_level=source_data["access_level"],
        created_at=datetime.utcnow(),
        file_hash=source_data["file_hash"],
        file_size=source_data["file_size"],
        page_count=source_data["page_count"],
        verification_status="verified" if source_data["status"] == "processed" else "pending",
    )

    db.add(db_source)
    db.commit()
    db.refresh(db_source)

    return SourceRead.from_orm(db_source)


@router.get("", response_model=SourceList)
def list_sources(
    project_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    is_owner = project.owner_id == current_user.id
    is_member = any(pm.user_id == current_user.id for pm in project.members)
    if not is_owner and not is_member:
        raise HTTPException(status_code=403, detail="Not authorized")

    stmt = select(Source).where(Source.project_id == project_id)
    sources = db.scalars(stmt).all()

    return {"sources": sources, "total": len(sources)}


@router.delete("/{source_id}")
def delete_source(
    source_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    stmt = select(Source).where(Source.id == source_id)
    source = db.scalar(stmt)
    if not source:
        raise HTTPException(status_code=404, detail="Source not found")

    project = db.query(Project).filter(Project.id == source.project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    is_owner = project.owner_id == current_user.id
    is_uploader = source.uploaded_by == current_user.id
    is_member = any(pm.user_id == current_user.id for pm in project.members)
    if not (is_owner or is_uploader or is_member):
        raise HTTPException(status_code=403, detail="Not authorized")

    try:
        if os.path.exists(source.storage_path):
            os.unlink(source.storage_path)
    except Exception:
        pass

    db.delete(source)
    db.commit()

    return {"detail": "Source deleted successfully"}