"""Read extracted project knowledge."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.v1.endpoints.auth import get_current_user
from app.core.database import get_db
from app.models.extracted_item import ExtractedItem
from app.models.project import Project
from app.models.project_member import ProjectMember
from app.models.user import User
from app.schemas.extracted_item import ExtractedItemRead

router = APIRouter(prefix="/projects/{project_id}/extracted-items", tags=["extracted-items"])


@router.get("", response_model=list[ExtractedItemRead])
def list_extracted_items(
    project_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    project = db.get(Project, project_id)
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found")
    is_member = db.scalar(select(ProjectMember.id).where(
        ProjectMember.project_id == project_id,
        ProjectMember.user_id == current_user.id,
    ))
    if project.owner_id != current_user.id and is_member is None:
        raise HTTPException(status_code=403, detail="Not authorized")
    return db.scalars(
        select(ExtractedItem).where(ExtractedItem.project_id == project_id).order_by(ExtractedItem.created_at.desc())
    ).all()
