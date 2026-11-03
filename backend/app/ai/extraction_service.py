"""Extract candidate knowledge while retaining direct source evidence."""

import re
import uuid
from typing import Any

from app.ai.providers import extract_knowledge

ITEM_TYPES = {
    "decision": re.compile(r"\b(decided|decision|agreed|approved)\b", re.I),
    "task": re.compile(r"\b(todo|task|must|will|needs? to|action item)\b", re.I),
    "risk": re.compile(r"\b(risk|might|may fail|could fail|uncertain)\b", re.I),
    "blocker": re.compile(r"\b(blocked|blocker|blocking)\b", re.I),
    "dependency": re.compile(r"\b(depends on|dependency|dependent on)\b", re.I),
    "question": re.compile(r"\?\s*$"),
    "milestone": re.compile(r"\b(milestone|launch|release|deadline)\b", re.I),
    "responsibility": re.compile(r"\b(owner|responsible|assigned to)\b", re.I),
}


def _rule_based_extract(content: str, filename: str, source_type: str) -> dict:
    items = []
    for line in content.splitlines():
        excerpt = line.strip(" \t-•*#")
        if len(excerpt) < 12:
            continue
        item_type = next((kind for kind, pattern in ITEM_TYPES.items() if pattern.search(excerpt)), None)
        if item_type:
            items.append({
                "item_type": item_type,
                "title": excerpt[:120],
                "content": excerpt,
                "evidence_excerpt": excerpt,
                "confidence": 55,
                "verification_status": "unverified",
            })
    return {"items": items, "error": None}


def extract_from_source(
    project_id: str,
    source_id: str,
    source_filename: str,
    source_type: str,
    content: str,
    uploaded_by: str,
    db_session: Any,
) -> dict:
    result = extract_knowledge(content, source_filename, source_type)
    if result.get("error") == "No LLM API configured":
        result = _rule_based_extract(content, source_filename, source_type)
    if result.get("error"):
        return {"extraction_status": "failed", "error": result["error"], "items_created": 0}

    from app.models.evidence import Evidence
    from app.models.extracted_item import ExtractedItem

    created = []
    try:
        for item in result.get("items", []):
            excerpt = item.get("evidence_excerpt")
            if not excerpt or excerpt not in content:
                continue
            extracted = ExtractedItem(
                id=str(uuid.uuid4()),
                project_id=project_id,
                source_id=source_id,
                item_type=item["item_type"],
                title=item["title"][:255],
                content=item["content"],
                confidence=max(0, min(100, int(item.get("confidence", 50)))),
                verification_status=item.get("verification_status", "unverified"),
            )
            db_session.add(extracted)
            db_session.flush()
            db_session.add(Evidence(
                id=str(uuid.uuid4()),
                extracted_item_id=extracted.id,
                source_id=source_id,
                excerpt=excerpt[:500],
            ))
            created.append({"extracted_item_id": extracted.id, "item_type": extracted.item_type, "title": extracted.title})
        db_session.commit()
    except Exception as exc:
        db_session.rollback()
        return {"extraction_status": "failed", "error": f"Could not save extracted evidence: {exc}", "items_created": 0}

    return {"extraction_status": "success", "error": None, "items_created": len(created), "items": created}
