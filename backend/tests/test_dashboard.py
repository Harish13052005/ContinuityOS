from sqlalchemy import select

from app.core.database import SessionLocal
from app.models.extracted_item import ExtractedItem
from app.models.project import Project


def test_dashboard_aggregates_owner_workspace_and_handover_has_sections(client):
    client.post("/api/v1/auth/register", json={
        "email": "dashboard@example.com",
        "full_name": "Dashboard User",
        "password": "secret123",
    })
    login = client.post("/api/v1/auth/login", data={"username": "dashboard@example.com", "password": "secret123"})
    token = login.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    created = client.post("/api/v1/projects", headers=headers, json={"name": "Atlas", "description": "Platform work"})
    project_id = created.json()["id"]

    # Add source-backed knowledge as if a project source had already been processed.
    with SessionLocal() as db:
        project = db.scalar(select(Project).where(Project.id == project_id))
        db.add_all([
            ExtractedItem(project_id=project.id, item_type="decision", title="Use modular services", content="The team agreed to use modular services.", confidence=90, verification_status="verified"),
            ExtractedItem(project_id=project.id, item_type="task", title="Publish the plan", content="The team will publish the migration plan.", confidence=85, verification_status="unverified"),
        ])
        db.commit()

    summary = client.get("/api/v1/dashboard", headers=headers)
    assert summary.status_code == 200
    payload = summary.json()
    assert payload["stats"]["projects"] == 1
    assert payload["stats"]["knowledge_items"] == 2
    assert {row["type"]: row["count"] for row in payload["knowledge_by_type"]} == {"decision": 1, "task": 1}

    handover = client.post(f"/api/v1/projects/{project_id}/handovers", headers=headers, json={"title": "Atlas handover"})
    assert handover.status_code == 201
    report = handover.json()
    assert "modular services" in report["decisions"]
    assert "No tasks" in report["pending_tasks"]
    assert "Publish the plan" in report["missing_conflicting"]
    assert report["project_overview"] == "Platform work"
