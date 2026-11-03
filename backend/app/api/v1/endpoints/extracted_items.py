"""Read and human-review extracted project knowledge and its evidence."""

import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.v1.endpoints.auth import get_current_user
from app.core.database import get_db
from app.models.extracted_item import ExtractedItem
from app.models.project import Project
from app.models.project_member import ProjectMember
from app.models.evidence import Evidence
from app.models.source import Source
from app.models.audit_log import AuditLog
from app.models.user import User
from app.schemas.extracted_item import ExtractedItemRead, ExtractedItemReview

router = APIRouter(prefix="/projects/{project_id}/extracted-items", tags=["extracted-items"])


def _project_and_member(project_id: str, current_user: User, db: Session):
    project = db.get(Project, project_id)
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found")
    member = db.scalar(select(ProjectMember).where(
        ProjectMember.project_id == project_id,
        ProjectMember.user_id == current_user.id,
        ProjectMember.project_role != "recipient",
    ))
    if project.owner_id != current_user.id and member is None and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not authorized")
    return project, member


@router.get("", response_model=list[ExtractedItemRead])
def list_extracted_items(
    project_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    project, member = _project_and_member(project_id, current_user, db)
    query = select(ExtractedItem).where(ExtractedItem.project_id == project_id)
    if project.owner_id != current_user.id and current_user.role != "admin":
        query = query.where(
            (ExtractedItem.source_id.is_(None)) |
            (ExtractedItem.source_id.in_(select(Source.id).where(Source.access_level != "private"))) |
            (ExtractedItem.source_id.in_(select(Source.id).where(Source.access_level == "private", Source.uploaded_by == current_user.id)))
        )
    return db.scalars(query.order_by(ExtractedItem.created_at.desc())).all()


@router.patch("/{item_id}", response_model=ExtractedItemRead)
def review_extracted_item(
    project_id: str,
    item_id: str,
    payload: ExtractedItemReview,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    project, member = _project_and_member(project_id, current_user, db)
    can_review = current_user.role == "admin" or project.owner_id == current_user.id or (member and member.project_role.lower() in {"admin", "reviewer", "project lead"})
    if not can_review:
        raise HTTPException(status_code=403, detail="Reviewer or project owner access is required")
    item = db.scalar(select(ExtractedItem).where(ExtractedItem.id == item_id, ExtractedItem.project_id == project_id))
    if item is None:
        raise HTTPException(status_code=404, detail="Knowledge item not found")
    if item.source_id:
        source = db.get(Source, item.source_id)
        if source and source.access_level == "private" and source.uploaded_by != current_user.id and project.owner_id != current_user.id and current_user.role != "admin":
            raise HTTPException(status_code=404, detail="Knowledge item not found")
    if payload.content is not None and payload.content.strip() != item.content:
        if item.original_content is None:
            item.original_content = item.content
        item.content = payload.content.strip()
    if payload.title is not None:
        item.title = payload.title.strip()
    item.verification_status = payload.verification_status
    item.review_reason = payload.review_reason.strip()
    db.add(AuditLog(user_id=current_user.id, project_id=project_id, action=f"review:{payload.verification_status}", entity_type="extracted_item", entity_id=item.id))
    db.commit()
    db.refresh(item)
    return item


@router.get("/{item_id}/evidence")
def read_item_evidence(
    project_id: str,
    item_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    project, _ = _project_and_member(project_id, current_user, db)
    item = db.scalar(select(ExtractedItem).where(ExtractedItem.id == item_id, ExtractedItem.project_id == project_id))
    if item is None:
        raise HTTPException(status_code=404, detail="Knowledge item not found")
    rows = db.execute(select(Evidence, Source).join(Source, Source.id == Evidence.source_id).where(Evidence.extracted_item_id == item_id)).all()
    if project.owner_id != current_user.id and current_user.role != "admin":
        rows = [(evidence, source) for evidence, source in rows if source.access_level != "private" or source.uploaded_by == current_user.id]
    return [{"id": evidence.id, "source_id": source.id, "filename": source.filename, "excerpt": evidence.excerpt, "page_number": evidence.page_number, "location_reference": evidence.location_reference} for evidence, source in rows]
