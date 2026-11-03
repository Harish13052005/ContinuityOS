from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.api.v1.endpoints.auth import get_current_user
from app.models.user import User
from app.models.project import Project
from app.schemas.reconstruction import (
    ProjectReconstructionResponse,
    TimelineEntry,
    DecisionEntry,
    TaskSummary,
    DependencySummary,
    RiskBlockerSummary,
    UnresolvedQuestion,
    MilestoneEntry,
    ConflictAnalysis,
    LabelMapping,
)
from app.ai.reconstruction_service import reconstruct_project_state

router = APIRouter(prefix="/reconstruction", tags=["reconstruction"])


@router.post("/project/{project_id}/state", response_model=ProjectReconstructionResponse)
async def get_project_reconstruction(
    project_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Reconstruct complete project state from all extracted knowledge.
    
    Builds consolidated project state including timeline, decisions, tasks,
    dependencies, risks, blockers, unresolved questions, milestones, and
    conflict analysis from all extracted items and evidence.
    """
    # Verify project exists and user has access
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    is_owner = project.owner_id == current_user.id
    is_member = any(pm.user_id == current_user.id and pm.project_role.lower() != "recipient" for pm in project.members)
    if not (is_owner or is_member or current_user.role == "admin"):
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Reconstruct project state
    try:
        reconstruction = reconstruct_project_state(project_id, db)
    except Exception as e:
        raise HTTPException(status_code=500, detail="Project reconstruction failed") from e
    
    return ProjectReconstructionResponse(
        project_id=project_id,
        project_name=project.name,
        generated_at=reconstruction["generated_at"],
        timeline=reconstruction["timeline"],
        decision_history=reconstruction["decision_history"],
        tasks=reconstruction["tasks"],
        dependencies=reconstruction["dependencies"],
        risks_blockers=reconstruction["risks_blockers"],
        unresolved_questions=reconstruction["unresolved_questions"],
        milestones=reconstruction["milestones"],
        conflicts=reconstruction["conflicts"],
        label_mapping=reconstruction["label_mapping"],
    )
