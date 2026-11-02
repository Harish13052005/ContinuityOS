from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.project import Project
from app.models.source import Source
from app.schemas.extracted_item import ExtractedItemCreate, ExtractedItemRead
from app.ai.extraction_service import extract_from_source
from app.core.config import settings

router = APIRouter(prefix="/extraction", tags=["extraction"])


@router.post("/source/{source_id}", status_code=status.HTTP_202_ACCEPTED)
async def extract_source_knowledge(
    source_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Extract structured knowledge from a source document."""
    stmt = select(Source).where(Source.id == source_id)
    source = db.scalar(stmt)
    if not source:
        raise HTTPException(status_code=404, detail="Source not found")

    project = db.query(Project).filter(Project.id == source.project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    is_owner = project.owner_id == current_user.id
    is_member = any(pm.user_id == current_user.id for pm in project.members)
    if not (is_owner or is_member):
        raise HTTPException(status_code=403, detail="Not authorized")

    try:
        if os.path.exists(source.storage_path):
            with open(source.storage_path, "r", encoding="utf-8", errors="replace") as f:
                content = f.read()
        else:
            raise HTTPException(status_code=404, detail="Source file not found on disk")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error reading source: {str(e)}")

    try:
        result = extract_from_source(
            project_id=source.project_id,
            source_id=source.id,
            source_filename=source.filename,
            source_type=source.source_type,
            content=content,
            uploaded_by=current_user.id,
            db_session=db,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Extraction failed: {str(e)}")

    if result.get("extraction_status") == "failed":
        raise HTTPException(status_code=500, detail=result.get("error", "Extraction failed"))

    return {"detail": "Extraction initiated", "status": result.get("extraction_status")}