"""Dashboard summary scoped to the signed-in user's projects."""

from fastapi import APIRouter, Depends
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.api.v1.endpoints.auth import get_current_user
from app.core.database import get_db
from app.models.extracted_item import ExtractedItem
from app.models.handover import Handover
from app.models.project import Project
from app.models.project_member import ProjectMember
from app.models.source import Source
from app.models.user import User

router = APIRouter(prefix="/dashboard", tags=["dashboard"])
REVIEW_STATUSES = ("needs_review", "unverified", "conflicting", "stale", "pending", "disputed")


@router.get("")
def read_dashboard(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    member_ids = select(ProjectMember.project_id).where(
        ProjectMember.user_id == current_user.id,
        ProjectMember.project_role != "recipient",
    )
    projects = db.scalars(
        select(Project).where(or_(Project.owner_id == current_user.id, Project.id.in_(member_ids))).order_by(Project.created_at.desc())
    ).all()
    project_ids = [project.id for project in projects]
    empty_stats = {"projects": 0, "sources": 0, "knowledge_items": 0, "handovers": 0, "collaborators": 0, "needs_review": 0, "open_blockers": 0}
    if not project_ids:
        return {"stats": empty_stats, "projects": [], "knowledge_by_type": [], "recent_items": [], "recent_handovers": []}

    def count(model):
        return db.scalar(select(func.count()).select_from(model).where(model.project_id.in_(project_ids))) or 0

    summaries = []
    for project in projects:
        members = db.execute(select(User.full_name, ProjectMember.project_role).join(ProjectMember, ProjectMember.user_id == User.id).where(ProjectMember.project_id == project.id)).all()
        summaries.append({
            "id": project.id, "name": project.name, "description": project.description,
            "created_at": project.created_at, "source_count": db.scalar(select(func.count(Source.id)).where(Source.project_id == project.id)) or 0,
            "knowledge_count": db.scalar(select(func.count(ExtractedItem.id)).where(ExtractedItem.project_id == project.id)) or 0,
            "handover_count": db.scalar(select(func.count(Handover.id)).where(Handover.project_id == project.id)) or 0,
            "members": [{"full_name": member.full_name, "role": member.project_role} for member in members],
        })
    recent_items = db.execute(select(ExtractedItem.id, ExtractedItem.project_id, ExtractedItem.item_type, ExtractedItem.title, ExtractedItem.verification_status, ExtractedItem.created_at).where(ExtractedItem.project_id.in_(project_ids)).order_by(ExtractedItem.created_at.desc()).limit(6)).all()
    item_type_rows = db.execute(select(ExtractedItem.item_type, func.count(ExtractedItem.id)).where(ExtractedItem.project_id.in_(project_ids)).group_by(ExtractedItem.item_type).order_by(func.count(ExtractedItem.id).desc())).all()
    recent_handovers = db.execute(select(Handover.id, Handover.project_id, Handover.title, Handover.status, Handover.created_at).where(Handover.project_id.in_(project_ids)).order_by(Handover.created_at.desc()).limit(5)).all()
    return {
        "stats": {
            "projects": len(projects),
            "sources": count(Source),
            "knowledge_items": count(ExtractedItem),
            "handovers": count(Handover),
            "collaborators": db.scalar(select(func.count(func.distinct(ProjectMember.user_id))).where(ProjectMember.project_id.in_(project_ids))) or 0,
            "needs_review": db.scalar(select(func.count()).select_from(ExtractedItem).where(ExtractedItem.project_id.in_(project_ids), ExtractedItem.verification_status.in_(REVIEW_STATUSES))) or 0,
            "open_blockers": db.scalar(select(func.count()).select_from(ExtractedItem).where(ExtractedItem.project_id.in_(project_ids), ExtractedItem.item_type == "blocker")) or 0,
        },
        "projects": summaries,
        "knowledge_by_type": [{"type": item_type, "count": item_count} for item_type, item_count in item_type_rows],
        "recent_items": [dict(row._mapping) for row in recent_items],
        "recent_handovers": [dict(row._mapping) for row in recent_handovers],
    }
