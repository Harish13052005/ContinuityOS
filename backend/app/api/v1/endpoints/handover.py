"""Create and list project handover records."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.v1.endpoints.auth import get_current_user
from app.core.database import get_db
from app.models.handover import Handover
from app.models.extracted_item import ExtractedItem
from app.models.project import Project
from app.models.project_member import ProjectMember
from app.models.user import User
from app.schemas.handover import HandoverCreate, HandoverRead

router = APIRouter(tags=["handovers"])


def _require_project_access(project_id: str, user: User, db: Session) -> Project:
    project = db.get(Project, project_id)
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found")
    member = db.scalar(select(ProjectMember.id).where(
        ProjectMember.project_id == project_id,
        ProjectMember.user_id == user.id,
    ))
    if project.owner_id != user.id and member is None:
        raise HTTPException(status_code=403, detail="Not authorized")
    return project


@router.get("/handovers", response_model=list[HandoverRead])
def list_my_handovers(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    project_ids = select(Project.id).where(Project.owner_id == current_user.id)
    return db.scalars(select(Handover).where(Handover.project_id.in_(project_ids)).order_by(Handover.created_at.desc())).all()


@router.get("/projects/{project_id}/handovers", response_model=list[HandoverRead])
def list_project_handovers(project_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    _require_project_access(project_id, current_user, db)
    return db.scalars(select(Handover).where(Handover.project_id == project_id).order_by(Handover.created_at.desc())).all()


@router.get("/handovers/{handover_id}", response_model=HandoverRead)
def get_handover(handover_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    handover = db.get(Handover, handover_id)
    if handover is None:
        raise HTTPException(status_code=404, detail="Handover not found")
    _require_project_access(handover.project_id, current_user, db)
    return handover


@router.post("/projects/{project_id}/handovers", response_model=HandoverRead, status_code=status.HTTP_201_CREATED)
def create_handover(project_id: str, payload: HandoverCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    project = _require_project_access(project_id, current_user, db)
    title = payload.title.strip()
    if not title:
        raise HTTPException(status_code=422, detail="Handover title cannot be empty")
    items = db.scalars(select(ExtractedItem).where(ExtractedItem.project_id == project_id).order_by(ExtractedItem.created_at.desc())).all()
    grouped: dict[str, list[str]] = {}
    for item in items:
        grouped.setdefault(item.item_type, []).append(item.content.strip())

    def section(*types: str, empty: str) -> str:
        values = [f"- {content}" for kind in types for content in grouped.get(kind, [])]
        return "\n".join(values) if values else empty

    handover = Handover(
        project_id=project_id, title=title, created_by=current_user.id,
        project_overview=project.description or project.name,
        current_status=f"{len(items)} knowledge items are linked to this project. Review the source excerpts and confirm their latest status with the team.",
        decisions=section("decision", empty="No decisions have been captured yet."),
        pending_tasks=section("task", "responsibility", empty="No tasks or owners have been captured yet."),
        dependencies_blockers=section("dependency", "blocker", empty="No dependencies or blockers have been captured yet."),
        risks_questions=section("risk", "question", empty="No risks or open questions have been captured yet."),
        milestones=section("milestone", empty="No milestones have been captured yet."),
        next_actions=section("task", empty="Review the project sources and agree on the next actions.") if items else "Add source material and capture knowledge before sharing a handover.",
        missing_conflicting="\n".join(f"- {item.title}" for item in items if item.verification_status == "disputed") or "Verify dates and ownership with the project team before sharing.",
    )
    db.add(handover)
    db.commit()
    db.refresh(handover)
    return handover
