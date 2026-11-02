from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.project import Project
from app.models.handover import Handover
from app.schemas.response import APIResponse

router = APIRouter(prefix="/handover", tags=["handover"])


@router.get("/export/pdf/{handover_id}", response_model=None)
async def export_handover_pdf(
    handover_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Export handover report as PDF."""
    # Get the handover
    stmt = select(Handover).where(Handover.id == handover_id)
    handover = db.session.scalar(stmt)
    if not handover:
        raise HTTPException(status_code=404, detail="Handover not found")
    
    # Verify user has project access
    project = db.query(Project).filter(Project.id == handover.project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    is_owner = project.owner_id == current_user.id
    is_member = any(pm.user_id == current_user.id for pm in project.members)
    if not (is_owner or is_member):
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Check if handover is approved
    if handover.status != "approved":
        raise HTTPException(
            status_code=400,
            detail="Only approved handovers can be exported as PDF",
        )
    
    return {"detail": "PDF export endpoint - service pending", "handover_id": handover_id}


@router.get("/project/{project_id}/status", response_model=None)
async def handover_status(
    project_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get handover status for a project."""
    # Verify project access
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    is_owner = project.owner_id == current_user.id
    is_member = any(pm.user_id == current_user.id for pm in project.members)
    if not (is_owner or is_member):
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Check for existing handover
    stmt = select(Handover).where(Handover.project_id == project_id)
    handovers = db.session.scalars(stmt).all()
    
    return {"detail": "Handover status endpoint - pending implementation", "project_id": project_id, "handover_count": len(handovers)}