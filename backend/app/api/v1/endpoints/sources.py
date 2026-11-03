"""Upload and manage source files attached to projects."""

import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.v1.endpoints.auth import get_current_user
from app.core.config import settings
from app.core.database import get_db
from app.models.project import Project
from app.models.project_member import ProjectMember
from app.models.source import Source
from app.models.user import User
from app.schemas.source import SourceList, SourceRead

router = APIRouter(tags=["sources"])
MAX_FILE_SIZE = 10 * 1024 * 1024
ALLOWED_SOURCE_TYPES = {"pdf", "docx", "txt", "md", "markdown", "csv", "json"}


def _project_for_user(project_id: str, user: User, db: Session) -> Project:
    project = db.get(Project, project_id)
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found")
    if project.owner_id == user.id:
        return project
    member = db.scalar(select(ProjectMember.id).where(
        ProjectMember.project_id == project_id,
        ProjectMember.user_id == user.id,
    ))
    if member is None:
        raise HTTPException(status_code=403, detail="Not authorized")
    return project


@router.post("/sources/upload", response_model=SourceRead, status_code=status.HTTP_201_CREATED)
@router.post("/projects/{project_id}/sources", response_model=SourceRead, status_code=status.HTTP_201_CREATED)
async def upload_source(
    project_id: str,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _project_for_user(project_id, current_user, db)
    filename = Path(file.filename or "").name.strip()
    if not filename or filename in {".", ".."}:
        raise HTTPException(status_code=400, detail="A valid filename is required")
    extension = Path(filename).suffix.lower().lstrip(".")
    if extension not in ALLOWED_SOURCE_TYPES:
        raise HTTPException(status_code=415, detail="Unsupported file type")
    content = await file.read(MAX_FILE_SIZE + 1)
    if not content:
        raise HTTPException(status_code=400, detail="Uploaded file is empty")
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(status_code=413, detail="File too large; maximum size is 10 MB")

    storage_dir = Path(settings.STORAGE_DIR).resolve() / project_id
    storage_dir.mkdir(parents=True, exist_ok=True)
    storage_path = storage_dir / f"{uuid.uuid4().hex}.{extension}"
    try:
        storage_path.write_bytes(content)
        source = Source(
            project_id=project_id,
            filename=filename,
            source_type="markdown" if extension == "md" else extension,
            storage_path=str(storage_path),
            uploaded_by=current_user.id,
            access_level="project",
        )
        db.add(source)
        db.commit()
        db.refresh(source)
        return source
    except Exception:
        db.rollback()
        storage_path.unlink(missing_ok=True)
        raise
    finally:
        await file.close()


@router.get("/sources", response_model=SourceList)
@router.get("/projects/{project_id}/sources", response_model=SourceList)
def list_sources(
    project_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _project_for_user(project_id, current_user, db)
    sources = db.scalars(select(Source).where(Source.project_id == project_id).order_by(Source.created_at.desc())).all()
    return {"sources": sources, "total": len(sources)}


@router.delete("/sources/{source_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_source(
    source_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    source = db.get(Source, source_id)
    if source is None:
        raise HTTPException(status_code=404, detail="Source not found")
    _project_for_user(source.project_id, current_user, db)
    path = Path(source.storage_path).resolve()
    storage_root = Path(settings.STORAGE_DIR).resolve()
    if path.is_relative_to(storage_root) and path.is_file():
        path.unlink(missing_ok=True)
    db.delete(source)
    db.commit()
