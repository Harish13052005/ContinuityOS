"""Build a deterministic project summary from extracted knowledge."""

from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.extracted_item import ExtractedItem


def reconstruct_project_state(project_id: str, db_session: Session) -> dict:
    items = db_session.scalars(
        select(ExtractedItem)
        .where(ExtractedItem.project_id == project_id)
        .order_by(ExtractedItem.created_at)
    ).all()
    timeline = [
        {
            "id": item.id,
            "title": item.title,
            "item_type": item.item_type,
            "confidence": item.confidence or 0,
            "verification_status": item.verification_status or "pending",
            "created_at": item.created_at.isoformat() if item.created_at else None,
            "source_reference": item.source_id or "",
            "labels": [],
        }
        for item in items
    ]
    decisions = [item for item in items if item.item_type == "decision"]
    pending_tasks = [item for item in items if item.item_type == "task"]
    return {
        "project_id": project_id,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "timeline": timeline,
        "decision_history": [
            {"decision": {"id": item.id, "title": item.title, "content": item.content}, "evidence": [], "labels": []}
            for item in decisions
        ],
        "tasks": {"pending": [{"id": i.id, "title": i.title, "content": i.content} for i in pending_tasks], "completed": [], "ownership_gaps": []},
        "dependencies": {"dependency_graph": {}, "total_dependencies": 0},
        "risks_blockers": {"risks": [], "blockers": [], "risk_count": 0, "blocker_count": 0},
        "unresolved_questions": [],
        "milestones": [],
        "conflicts": [],
        "label_mapping": [],
    }
