"""Upload and manage source files attached to projects."""

import uuid
from io import BytesIO
from pathlib import Path
from zipfile import BadZipFile, ZipFile

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.api.v1.endpoints.auth import get_current_user
from app.core.config import settings
from app.core.database import get_db
from app.models.project import Project
from app.models.project_member import ProjectMember
from app.models.source import Source
from app.models.extracted_item import ExtractedItem
from app.models.evidence import Evidence
from app.models.audit_log import AuditLog
from app.models.user import User
from app.schemas.source import SourceList, SourceRead
from app.services.document_text import DocumentReadError, read_document_text

router = APIRouter(tags=["sources"])
MAX_FILE_SIZE = 10 * 1024 * 1024
ALLOWED_SOURCE_TYPES = {"pdf", "docx", "txt", "md", "markdown", "csv", "json"}


def _project_for_user(project_id: str, user: User, db: Session) -> Project:
    project = db.get(Project, project_id)
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found")
    if project.owner_id == user.id:
        return project
    if user.role == "admin":
        return project
    member = db.scalar(select(ProjectMember.id).where(
        ProjectMember.project_id == project_id,
        ProjectMember.user_id == user.id,
        ProjectMember.project_role != "recipient",
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
    if extension == "pdf" and not content.lstrip().startswith(b"%PDF-"):
        raise HTTPException(status_code=415, detail="File content does not match a PDF document")
    if extension == "docx":
        try:
            with ZipFile(BytesIO(content)) as archive:
                names = set(archive.namelist())
                uncompressed_size = sum(info.file_size for info in archive.infolist())
                if "[Content_Types].xml" not in names or "word/document.xml" not in names:
                    raise HTTPException(status_code=415, detail="File content does not match a DOCX document")
                if uncompressed_size > 50 * 1024 * 1024:
                    raise HTTPException(status_code=413, detail="DOCX expands beyond the 50 MB processing limit")
        except BadZipFile as exc:
            raise HTTPException(status_code=415, detail="DOCX file is invalid") from exc

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
        db.flush()
        db.add(AuditLog(user_id=current_user.id, project_id=project_id, action="upload", entity_type="source", entity_id=source.id))
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
    query = select(Source).where(Source.project_id == project_id)
    project = db.get(Project, project_id)
    if project.owner_id != current_user.id and current_user.role != "admin":
        query = query.where((Source.access_level != "private") | (Source.uploaded_by == current_user.id))
    sources = db.scalars(query.order_by(Source.created_at.desc())).all()
    return {"sources": sources, "total": len(sources)}


@router.get("/sources/{source_id}/preview")
def preview_source(source_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    source = db.get(Source, source_id)
    if source is None:
        raise HTTPException(status_code=404, detail="Source not found")
    project = _project_for_user(source.project_id, current_user, db)
    if source.access_level == "private" and source.uploaded_by != current_user.id and project.owner_id != current_user.id and current_user.role != "admin":
        raise HTTPException(status_code=404, detail="Source not found")
    path = Path(source.storage_path).resolve()
    if not path.is_relative_to(Path(settings.STORAGE_DIR).resolve()) or not path.is_file():
        raise HTTPException(status_code=404, detail="Source file not found")
    try:
        content, chunks = read_document_text(path, source.source_type)
    except ImportError as exc:
        raise HTTPException(status_code=503, detail="Document parser dependency is not installed") from exc
    except DocumentReadError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    return {"source_id": source.id, "filename": source.filename, "source_type": source.source_type, "content": content[:100000], "truncated": len(content) > 100000, "page_count": len(chunks) if source.source_type == "pdf" else None}


@router.delete("/sources/{source_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_source(
    source_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    source = db.get(Source, source_id)
    if source is None:
        raise HTTPException(status_code=404, detail="Source not found")
    project = _project_for_user(source.project_id, current_user, db)
    membership = db.scalar(select(ProjectMember).where(ProjectMember.project_id == source.project_id, ProjectMember.user_id == current_user.id))
    can_delete = current_user.role == "admin" or project.owner_id == current_user.id or source.uploaded_by == current_user.id
    if source.access_level != "private":
        can_delete = can_delete or bool(membership and membership.project_role.lower() in {"admin", "reviewer", "project lead"})
    if not can_delete:
        raise HTTPException(status_code=403, detail="Source uploader, reviewer, or project owner access is required to delete")
    path = Path(source.storage_path).resolve()
    storage_root = Path(settings.STORAGE_DIR).resolve()
    item_ids = select(ExtractedItem.id).where(ExtractedItem.source_id == source_id)
    db.execute(delete(Evidence).where(Evidence.source_id == source_id))
    db.execute(delete(Evidence).where(Evidence.extracted_item_id.in_(item_ids)))
    db.execute(delete(ExtractedItem).where(ExtractedItem.source_id == source_id))
    db.add(AuditLog(user_id=current_user.id, project_id=source.project_id, action="delete", entity_type="source", entity_id=source.id))
    db.delete(source)
    db.commit()
    if path.is_relative_to(storage_root) and path.is_file():
        path.unlink(missing_ok=True)
