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
ALLOWED_ITEM_TYPES = set(ITEM_TYPES)


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
    evidence_chunks: list[str] | None = None,
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
            if not isinstance(item, dict) or item.get("item_type") not in ALLOWED_ITEM_TYPES:
                continue
            excerpt = item.get("evidence_excerpt")
            if not isinstance(excerpt, str) or not excerpt.strip() or excerpt not in content:
                continue
            title = item.get("title")
            statement = item.get("content")
            if not isinstance(title, str) or not isinstance(statement, str) or not title.strip() or not statement.strip():
                continue
            confidence_value = item.get("confidence", 50)
            confidence = confidence_value if isinstance(confidence_value, int) and not isinstance(confidence_value, bool) else 50
            chunks = evidence_chunks or [content]
            chunk_index = next((i for i, chunk in enumerate(chunks) if excerpt in chunk), None)
            extracted = ExtractedItem(
                id=str(uuid.uuid4()),
                project_id=project_id,
                source_id=source_id,
                item_type=item["item_type"],
                title=title.strip()[:255],
                content=statement.strip()[:10000],
                confidence=max(0, min(100, confidence)),
                # Model output cannot verify or approve its own claims.
                verification_status="unverified",
            )
            db_session.add(extracted)
            db_session.flush()
            db_session.add(Evidence(
                id=str(uuid.uuid4()),
                extracted_item_id=extracted.id,
                source_id=source_id,
                excerpt=excerpt[:500],
                page_number=chunk_index + 1 if source_type == "pdf" and chunk_index is not None else None,
                location_reference=f"Page {chunk_index + 1}" if source_type == "pdf" and chunk_index is not None else source_filename,
            ))
            created.append({"extracted_item_id": extracted.id, "item_type": extracted.item_type, "title": extracted.title})
        db_session.commit()
    except Exception as exc:
        db_session.rollback()
        return {"extraction_status": "failed", "error": f"Could not save extracted evidence: {exc}", "items_created": 0}

    return {"extraction_status": "success", "error": None, "items_created": len(created), "items": created}
