"""Reconstruct a cautious, evidence-linked view of visible project knowledge."""

import re
from difflib import SequenceMatcher
from datetime import datetime, timezone

from sqlalchemy import select, or_
from sqlalchemy.orm import Session

from app.models.evidence import Evidence
from app.models.extracted_item import ExtractedItem
from app.models.source import Source

STATUS_LABEL = {
    "verified": "Supported",
    "supported": "Supported",
    "pending": "Needs Review",
    "needs_review": "Needs Review",
    "disputed": "Conflicting",
    "conflicting": "Conflicting",
    "stale": "Stale",
    "unverified": "Unverified",
}
DONE_WORDS = re.compile(r"\b(done|completed|complete|resolved|shipped|closed)\b", re.I)
OWNER_WORDS = re.compile(r"\b(owner|owned by|assigned to|responsible|will [A-Z][a-z]+)\b", re.I)
NEGATION = re.compile(r"\b(not|never|no longer|cancelled|canceled|rejected|did not|won't|will not)\b", re.I)


def reconstruct_project_state(project_id: str, db_session: Session) -> dict:
    """Summarize only non-private source claims; no latest-claim-wins behavior."""
    rows = db_session.execute(
        select(ExtractedItem, Source)
        .outerjoin(Source, Source.id == ExtractedItem.source_id)
        .where(
            ExtractedItem.project_id == project_id,
            or_(Source.id.is_(None), Source.access_level != "private"),
        )
        .order_by(ExtractedItem.created_at)
    ).all()
    items = [item for item, _ in rows]
    source_by_item = {item.id: source for item, source in rows}

    def evidence_for(item):
        records = db_session.execute(
            select(Evidence, Source)
            .join(Source, Source.id == Evidence.source_id)
            .where(Evidence.extracted_item_id == item.id, Source.access_level != "private")
        ).all()
        return [{
            "source_id": source.id,
            "source_filename": source.filename,
            "excerpt": evidence.excerpt,
            "page_number": evidence.page_number,
            "location_reference": evidence.location_reference,
        } for evidence, source in records]

    def status_label(item):
        return STATUS_LABEL.get(item.verification_status or "unverified", "Unverified")

    def item_data(item):
        return {"id": item.id, "title": item.title, "content": item.content, "item_type": item.item_type,
                "confidence": item.confidence or 0, "verification_status": item.verification_status or "unverified",
                "labels": [status_label(item)], "evidence": evidence_for(item)}

    timeline = [{
        "id": item.id,
        "title": item.title,
        "item_type": item.item_type,
        "confidence": item.confidence or 0,
        "verification_status": item.verification_status or "unverified",
        "created_at": item.created_at.isoformat() if item.created_at else None,
        "source_reference": source_by_item[item.id].filename if source_by_item[item.id] else "Manual project note",
        "labels": [status_label(item)],
    } for item in items]

    decisions = [item for item in items if item.item_type == "decision"]
    tasks = [item for item in items if item.item_type == "task"]
    dependencies = [item for item in items if item.item_type == "dependency"]
    risks = [item for item in items if item.item_type == "risk"]
    blockers = [item for item in items if item.item_type == "blocker"]
    questions = [item for item in items if item.item_type == "question"]
    milestones = [item for item in items if item.item_type == "milestone"]
    completed = [item for item in tasks if DONE_WORDS.search(item.content)]
    pending = [item for item in tasks if item not in completed]

    dependency_graph = {
        "nodes": [{"id": item.id, "label": item.title, "status": status_label(item)} for item in dependencies],
        "edges": [],
    }
    conflicts = []
    paired_conflict_ids: set[str] = set()
    for index, left in enumerate(items):
        for right in items[index + 1:]:
            if left.item_type != right.item_type:
                continue
            ratio = SequenceMatcher(None, left.content.lower(), right.content.lower()).ratio()
            if ratio >= .72 and bool(NEGATION.search(left.content)) != bool(NEGATION.search(right.content)):
                paired_conflict_ids.update((left.id, right.id))
                conflicts.append({"item_a": item_data(left), "item_b": item_data(right), "similarity": round(ratio, 3), "labels": ["Potential conflict", "Needs Review"]})
    for item in items:
        if item.verification_status in {"conflicting", "disputed"} and item.id not in paired_conflict_ids:
            conflicts.append({"item_a": item_data(item), "item_b": {}, "similarity": 1.0, "labels": ["Conflicting", "Needs resolution"]})

    return {
        "project_id": project_id,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "timeline": timeline,
        "decision_history": [{"decision": item_data(item), "evidence": evidence_for(item), "labels": [status_label(item)]} for item in decisions],
        "tasks": {
            "pending": [item_data(item) for item in pending],
            "completed": [item_data(item) for item in completed],
            "ownership_gaps": [item_data(item) for item in pending if not OWNER_WORDS.search(item.content)],
        },
        "dependencies": {"dependency_graph": dependency_graph, "total_dependencies": len(dependencies)},
        "risks_blockers": {
            "risks": [item_data(item) for item in risks],
            "blockers": [item_data(item) for item in blockers],
            "risk_count": len(risks), "blocker_count": len(blockers),
        },
        "unresolved_questions": [{"id": item.id, "title": item.title, "content": item.content, "confidence": item.confidence or 0, "labels": [status_label(item)], "evidence": evidence_for(item)} for item in questions],
        "milestones": [{"id": item.id, "title": item.title, "content": item.content, "confidence": item.confidence or 0, "has_date": bool(re.search(r"\b\d{4}-\d{2}-\d{2}\b", item.content)), "labels": [status_label(item)], "evidence": evidence_for(item)} for item in milestones],
        "conflicts": conflicts,
        "label_mapping": [{"item_id": item.id, "item_type": item.item_type, "labels": [status_label(item)]} for item in items],
    }
