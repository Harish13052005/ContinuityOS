"""Generate, review, approve, share, and export project handovers."""

import json
import re
from html import escape
from io import BytesIO

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, EmailStr
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.v1.endpoints.auth import get_current_user
from app.core.database import get_db
from app.models.handover import Handover
from app.models.extracted_item import ExtractedItem
from app.models.project import Project
from app.models.project_member import ProjectMember
from app.models.user import User
from app.models.source import Source
from app.models.evidence import Evidence
from app.models.audit_log import AuditLog
from app.schemas.handover import HandoverCreate, HandoverRead

router = APIRouter(tags=["handovers"])


class ShareHandover(BaseModel):
    recipient_email: EmailStr


def _can_review(project: Project, user: User, db: Session) -> bool:
    if project.owner_id == user.id or user.role == "admin":
        return True
    member = db.scalar(select(ProjectMember).where(ProjectMember.project_id == project.id, ProjectMember.user_id == user.id))
    return bool(member and member.project_role.lower() in {"admin", "reviewer", "project lead"})


def _require_project_access(project_id: str, user: User, db: Session) -> Project:
    project = db.get(Project, project_id)
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found")
    member = db.scalar(select(ProjectMember.id).where(
        ProjectMember.project_id == project_id,
        ProjectMember.user_id == user.id,
        ProjectMember.project_role != "recipient",
    ))
    if project.owner_id != user.id and member is None:
        raise HTTPException(status_code=403, detail="Not authorized")
    return project


@router.get("/handovers", response_model=list[HandoverRead])
def list_my_handovers(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    project_ids = select(Project.id).where(Project.owner_id == current_user.id)
    return db.scalars(select(Handover).where(
        (Handover.project_id.in_(project_ids)) |
        ((Handover.recipient_email == current_user.email) & (Handover.status == "approved"))
    ).order_by(Handover.created_at.desc())).all()


@router.get("/projects/{project_id}/handovers", response_model=list[HandoverRead])
def list_project_handovers(project_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    _require_project_access(project_id, current_user, db)
    return db.scalars(select(Handover).where(Handover.project_id == project_id).order_by(Handover.created_at.desc())).all()


@router.get("/handovers/{handover_id}", response_model=HandoverRead)
def get_handover(handover_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    handover = db.get(Handover, handover_id)
    if handover is None:
        raise HTTPException(status_code=404, detail="Handover not found")
    project = db.get(Project, handover.project_id)
    is_project_member = project and (project.owner_id == current_user.id or db.scalar(select(ProjectMember.id).where(ProjectMember.project_id == project.id, ProjectMember.user_id == current_user.id, ProjectMember.project_role != "recipient")))
    is_recipient = handover.status == "approved" and handover.recipient_email == current_user.email
    if not is_project_member and not is_recipient and current_user.role != "admin":
        raise HTTPException(status_code=404, detail="Handover not found")
    return handover


@router.post("/projects/{project_id}/handovers", response_model=HandoverRead, status_code=status.HTTP_201_CREATED)
def create_handover(project_id: str, payload: HandoverCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    project = _require_project_access(project_id, current_user, db)
    if not _can_review(project, current_user, db):
        raise HTTPException(status_code=403, detail="Project owner or reviewer access is required to prepare a handover")
    title = payload.title.strip()
    if not title:
        raise HTTPException(status_code=422, detail="Handover title cannot be empty")
    recipient_email = str(payload.recipient_email).lower() if payload.recipient_email else None
    if recipient_email and db.scalar(select(User.id).where(User.email == recipient_email, User.is_active.is_(True))) is None:
        raise HTTPException(status_code=404, detail="Recipient must have an active ContinuityOS account")
    visible_source_ids = select(Source.id).where(Source.project_id == project_id, Source.access_level != "private")
    items = db.scalars(select(ExtractedItem).where(
        ExtractedItem.project_id == project_id,
        (ExtractedItem.source_id.is_(None)) | (ExtractedItem.source_id.in_(visible_source_ids)),
    ).order_by(ExtractedItem.created_at.desc())).all()
    verified = [item for item in items if item.verification_status in {"supported", "verified"}]
    review_items = [item for item in items if item.verification_status not in {"supported", "verified"}]
    grouped: dict[str, list[str]] = {}
    for item in verified:
        grouped.setdefault(item.item_type, []).append(item.content.strip())

    def section(*types: str, empty: str) -> str:
        values = [f"- {content}" for kind in types for content in grouped.get(kind, [])]
        return "\n".join(values) if values else empty

    handover = Handover(
        project_id=project_id, title=title, created_by=current_user.id,
        recipient_email=recipient_email,
        project_overview=project.description or project.name,
        current_status=f"{len(verified)} human-supported knowledge items are included. {len(review_items)} item(s) need review and are excluded from this report.",
        decisions=section("decision", empty="No decisions have been captured yet."),
        pending_tasks=section("task", "responsibility", empty="No tasks or owners have been captured yet."),
        dependencies_blockers=section("dependency", "blocker", empty="No dependencies or blockers have been captured yet."),
        risks_questions=section("risk", "question", empty="No risks or open questions have been captured yet."),
        milestones=section("milestone", empty="No milestones have been captured yet."),
        next_actions=section("task", empty="Review the project sources and agree on the next actions.") if verified else "No human-supported knowledge is available yet. Review the captured claims before sharing a handover.",
        missing_conflicting="\n".join(f"- {item.title} ({item.verification_status.replace('_', ' ')})" for item in review_items) or "No unresolved review items were found in visible sources.",
        supporting_evidence=json.dumps([
            {"item_id": item.id, "title": item.title, "source": source.filename, "excerpt": evidence.excerpt, "page_number": evidence.page_number, "location_reference": evidence.location_reference}
            for item in verified
            for evidence, source in db.execute(select(Evidence, Source).join(Source, Source.id == Evidence.source_id).where(Evidence.extracted_item_id == item.id, Source.access_level != "private")).all()
        ]),
    )
    db.add(handover)
    db.flush()
    db.add(AuditLog(user_id=current_user.id, project_id=project_id, action="create", entity_type="handover", entity_id=handover.id))
    db.commit()
    db.refresh(handover)
    return handover


@router.post("/handovers/{handover_id}/approve", response_model=HandoverRead)
def approve_handover(handover_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    handover = db.get(Handover, handover_id)
    if handover is None:
        raise HTTPException(status_code=404, detail="Handover not found")
    project = _require_project_access(handover.project_id, current_user, db)
    if not _can_review(project, current_user, db):
        raise HTTPException(status_code=403, detail="Project owner or reviewer access is required to approve")
    if handover.status == "approved":
        return handover
    handover.status = "approved"
    handover.approved_by = current_user.id
    db.add(AuditLog(user_id=current_user.id, project_id=handover.project_id, action="approve", entity_type="handover", entity_id=handover.id))
    db.commit()
    db.refresh(handover)
    return handover


@router.post("/handovers/{handover_id}/share", response_model=HandoverRead)
def share_handover(handover_id: str, payload: ShareHandover, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    handover = db.get(Handover, handover_id)
    if handover is None:
        raise HTTPException(status_code=404, detail="Handover not found")
    project = _require_project_access(handover.project_id, current_user, db)
    if not _can_review(project, current_user, db):
        raise HTTPException(status_code=403, detail="Project owner or reviewer access is required to share")
    if handover.status != "approved":
        raise HTTPException(status_code=409, detail="Approve this handover before sharing it")
    recipient = db.scalar(select(User).where(User.email == str(payload.recipient_email).lower(), User.is_active.is_(True)))
    if recipient is None:
        raise HTTPException(status_code=404, detail="Recipient must have an active ContinuityOS account")
    handover.recipient_email = recipient.email
    handover.recipient_name = recipient.full_name
    db.add(AuditLog(user_id=current_user.id, project_id=handover.project_id, action="share", entity_type="handover", entity_id=handover.id))
    db.commit()
    db.refresh(handover)
    return handover


@router.get("/handovers/{handover_id}/export.pdf")
def export_handover_pdf(handover_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    handover = db.get(Handover, handover_id)
    if handover is None:
        raise HTTPException(status_code=404, detail="Handover not found")
    project = db.get(Project, handover.project_id)
    is_project_member = project and (project.owner_id == current_user.id or db.scalar(select(ProjectMember.id).where(ProjectMember.project_id == project.id, ProjectMember.user_id == current_user.id, ProjectMember.project_role != "recipient")))
    is_recipient = handover.status == "approved" and handover.recipient_email == current_user.email
    if not is_project_member and not is_recipient and current_user.role != "admin":
        raise HTTPException(status_code=404, detail="Handover not found")
    if not is_recipient and handover.status != "approved":
        raise HTTPException(status_code=409, detail="Only approved handovers can be exported")
    try:
        from reportlab.lib.pagesizes import letter
        from reportlab.lib.styles import getSampleStyleSheet
        from reportlab.lib.units import inch
        from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer
        from xml.sax.saxutils import escape as xml_escape
        output = BytesIO()
        doc = SimpleDocTemplate(output, pagesize=letter, rightMargin=.7*inch, leftMargin=.7*inch, topMargin=.7*inch, bottomMargin=.7*inch)
        styles = getSampleStyleSheet()
        story = [Paragraph(xml_escape(handover.title), styles["Title"]), Spacer(1, 12)]
        for label, value in [("Project", project.name), ("Status", handover.status.title()), ("Version", str(handover.version))]:
            story.append(Paragraph(f"<b>{label}:</b> {xml_escape(value)}", styles["BodyText"]))
        story.append(Spacer(1, 12))
        for label, attr in [("Project overview", "project_overview"), ("Current status", "current_status"), ("Decisions", "decisions"), ("Pending tasks", "pending_tasks"), ("Dependencies and blockers", "dependencies_blockers"), ("Risks and questions", "risks_questions"), ("Milestones", "milestones"), ("Next actions", "next_actions"), ("Missing or unresolved", "missing_conflicting")]:
            value = getattr(handover, attr)
            if value:
                story.extend([Paragraph(xml_escape(label), styles["Heading2"]), Paragraph(xml_escape(value).replace("\n", "<br/>"), styles["BodyText"]), Spacer(1, 8)])
        refs = json.loads(handover.supporting_evidence or "[]")
        if refs:
            story.append(Paragraph("Supporting evidence", styles["Heading2"]))
            for ref in refs:
                position = f" · Page {ref['page_number']}" if ref.get("page_number") else ""
                story.append(Paragraph(f"<b>{xml_escape(ref['title'])}</b> — {xml_escape(ref['source'])}{xml_escape(position)}<br/>{xml_escape(ref['excerpt'])}", styles["BodyText"]))
                story.append(Spacer(1, 6))
        doc.build(story)
        output.seek(0)
    except Exception as exc:
        raise HTTPException(status_code=503, detail="PDF export is unavailable") from exc
    safe_name = re.sub(r"[^A-Za-z0-9._-]+", "-", handover.title).strip("-._")[:80] or "handover"
    filename = f"{safe_name}.pdf"
    return StreamingResponse(output, media_type="application/pdf", headers={"Content-Disposition": f'attachment; filename="{filename}"'})
