from app.ai.providers import extract_knowledge


def extract_from_source(
    project_id: str,
    source_id: str,
    source_filename: str,
    source_type: str,
    content: str,
    uploaded_by: str,
    db_session: Any,
) -> Dict[str, Any]:
    """Extract structured knowledge from a source document."""
    result = extract_knowledge(content, source_filename, source_type)

    if result.get("error") and "No LLM API configured" in result.get("error", ""):
        result = _rule_based_extract(content, source_filename, source_type)

    if result.get("error"):
        return {
            "extraction_status": "failed",
            "error": result["error"],
            "items_created": 0,
        }

    items = result.get("items", [])

    from app.models.extracted_item import ExtractedItem
    from app.models.evidence import Evidence

    created_items = []

    for item in items:
        try:
            extracted_item = ExtractedItem(
                id=str(uuid4()),
                project_id=project_id,
                source_id=source_id,
                item_type=item["item_type"],
                title=item["title"],
                content=item["content"],
                confidence=item.get("confidence", 50),
                verification_status=item.get("verification_status", "unknown"),
                created_by=uploaded_by,
                source_reference=item.get("source_reference", source_filename),
                page_number=item.get("page_number"),
                location_reference=item.get("location_reference"),
                is_inferred=item.get("is_inferred", False),
                extracted_at=datetime.now(timezone.utc),
            )
            db_session.add(extracted_item)

            evidence = Evidence(
                id=str(uuid4()),
                extracted_item_id=extracted_item.id,
                source_id=source_id,
                page_number=item.get("page_number"),
                location_reference=item.get("location_reference"),
                excerpt=item["content"][:500] if item["content"] else "",
                created_by=uploaded_by,
            )
            db_session.add(evidence)

            created_items.append(
                {
                    "extracted_item_id": extracted_item.id,
                    "item_type": extracted_item.item_type,
                    "title": extracted_item.title,
                    "confidence": extracted_item.confidence,
                    "verification_status": extracted_item.verification_status,
                }
            )
        except Exception as e:
            print(f"Error storing extraction: {str(e)}")
            continue

    try:
        db_session.commit()
    except Exception as e:
        db_session.rollback()
        return {
            "extraction_status": "partial",
            "error": f"Database error: {str(e)}",
            "items_created": len(created_items),
        }

    return {
        "extraction_status": "success",
        "error": None,
        "items_created": len(created_items),
        "items": created_items,
    }