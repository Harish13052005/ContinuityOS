"""Read a bounded project activity log for owners and reviewers."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.v1.endpoints.auth import get_current_user
from app.core.database import get_db
from app.models.audit_log import AuditLog
from app.models.project import Project
from app.models.project_member import ProjectMember
from app.models.user import User

router = APIRouter(prefix="/projects/{project_id}/audit-logs", tags=["audit"])


@router.get("")
def read_project_audit_log(project_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    project = db.get(Project, project_id)
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found")
    member = db.scalar(select(ProjectMember).where(ProjectMember.project_id == project_id, ProjectMember.user_id == current_user.id))
    reviewer = member and member.project_role.lower() in {"admin", "reviewer", "project lead"}
    if project.owner_id != current_user.id and current_user.role != "admin" and not reviewer:
        raise HTTPException(status_code=403, detail="Project owner or reviewer access is required")
    entries = db.scalars(select(AuditLog).where(AuditLog.project_id == project_id).order_by(AuditLog.timestamp.desc()).limit(100)).all()
    return [{"id": row.id, "user_id": row.user_id, "project_id": row.project_id, "action": row.action, "entity_type": row.entity_type, "entity_id": row.entity_id, "timestamp": row.timestamp} for row in entries]
