from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.project import Project
from app.schemas.project import ProjectCreate, ProjectRead
from app.api.v1.endpoints.auth import get_current_user
from app.models.user import User
from app.models.handover import Handover
from app.models.project_member import ProjectMember
from app.models.audit_log import AuditLog
from sqlalchemy import select
from app.models.user import User as ProjectUser
from app.schemas.project import ProjectMemberInvite

router = APIRouter(prefix="/projects", tags=["projects"])


@router.post("", response_model=ProjectRead, status_code=status.HTTP_201_CREATED)
def create_project(payload: ProjectCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Create a new project."""
    name = payload.name.strip()
    if not name:
        raise HTTPException(status_code=422, detail="Project name cannot be empty")
    project = Project(name=name, description=payload.description, owner_id=current_user.id)
    db.add(project)
    db.flush()
    db.add(AuditLog(user_id=current_user.id, project_id=project.id, action="create", entity_type="project", entity_id=project.id))
    db.commit()
    db.refresh(project)
    return project


@router.get("", response_model=list[ProjectRead])
def list_projects(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """List projects owned by the authenticated user."""
    return db.query(Project).filter(Project.owner_id == current_user.id).all()


@router.get("/{project_id}", response_model=ProjectRead)
def get_project(project_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    project = db.get(Project, project_id)
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found")
    member = db.scalar(select(ProjectMember).where(ProjectMember.project_id == project_id, ProjectMember.user_id == current_user.id))
    is_recipient = db.scalar(select(Handover.id).where(Handover.project_id == project_id, Handover.recipient_email == current_user.email, Handover.status == "approved"))
    if project.owner_id != current_user.id and not (member and member.project_role.lower() != "recipient") and not is_recipient and current_user.role != "admin":
        raise HTTPException(status_code=404, detail="Project not found")
    current_role = "owner" if project.owner_id == current_user.id else ("recipient" if is_recipient else member.project_role if member else "admin")
    return ProjectRead.model_validate(project).model_copy(update={"current_user_role": current_role})


def _project_manager(project_id: str, current_user: User, db: Session) -> Project:
    project = db.get(Project, project_id)
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found")
    member = db.scalar(select(ProjectMember).where(ProjectMember.project_id == project_id, ProjectMember.user_id == current_user.id))
    if project.owner_id != current_user.id and current_user.role != "admin" and not (member and member.project_role.lower() == "admin"):
        raise HTTPException(status_code=403, detail="Project owner or project admin access is required")
    return project


@router.get("/{project_id}/members")
def list_project_members(project_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    project = db.get(Project, project_id)
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found")
    member = db.scalar(select(ProjectMember.id).where(ProjectMember.project_id == project_id, ProjectMember.user_id == current_user.id, ProjectMember.project_role != "recipient"))
    if project.owner_id != current_user.id and current_user.role != "admin" and member is None:
        raise HTTPException(status_code=403, detail="Not authorized")
    rows = db.execute(select(ProjectMember, ProjectUser).join(ProjectUser, ProjectUser.id == ProjectMember.user_id).where(ProjectMember.project_id == project_id).order_by(ProjectMember.joined_at)).all()
    return [{"id": membership.id, "user_id": user.id, "email": user.email, "full_name": user.full_name, "project_role": membership.project_role, "joined_at": membership.joined_at} for membership, user in rows]


@router.post("/{project_id}/members", status_code=status.HTTP_201_CREATED)
def invite_project_member(project_id: str, payload: ProjectMemberInvite, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    project = _project_manager(project_id, current_user, db)
    invitee = db.scalar(select(ProjectUser).where(ProjectUser.email == str(payload.email).lower(), ProjectUser.is_active.is_(True)))
    if invitee is None:
        raise HTTPException(status_code=404, detail="Invitee must have an active account; ask them to register first")
    if invitee.id == project.owner_id:
        raise HTTPException(status_code=409, detail="The project owner already has full project access")
    membership = db.scalar(select(ProjectMember).where(ProjectMember.project_id == project_id, ProjectMember.user_id == invitee.id))
    if membership is not None:
        raise HTTPException(status_code=409, detail="User is already a project member")
    membership = ProjectMember(project_id=project_id, user_id=invitee.id, project_role=payload.project_role)
    db.add(membership)
    db.flush()
    db.add(AuditLog(user_id=current_user.id, project_id=project_id, action=f"invite:{payload.project_role}", entity_type="project_member", entity_id=membership.id))
    db.commit()
    return {"id": membership.id, "user_id": invitee.id, "email": invitee.email, "full_name": invitee.full_name, "project_role": membership.project_role, "joined_at": membership.joined_at}


@router.delete("/{project_id}/members/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_project_member(project_id: str, user_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    project = _project_manager(project_id, current_user, db)
    membership = db.scalar(select(ProjectMember).where(ProjectMember.project_id == project_id, ProjectMember.user_id == user_id))
    if membership is None:
        raise HTTPException(status_code=404, detail="Project member not found")
    db.add(AuditLog(user_id=current_user.id, project_id=project_id, action="remove", entity_type="project_member", entity_id=membership.id))
    db.delete(membership)
    db.commit()
