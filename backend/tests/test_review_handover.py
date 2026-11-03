from sqlalchemy import select
from docx import Document
from reportlab.pdfgen.canvas import Canvas
from io import BytesIO

from app.core.database import SessionLocal
from app.models import Evidence, ExtractedItem, Project, ProjectMember, Source, User


def _register_and_login(client, email: str, full_name: str):
    created = client.post("/api/v1/auth/register", json={"email": email, "full_name": full_name, "password": "secret123"})
    assert created.status_code == 201
    login = client.post("/api/v1/auth/login", data={"username": email, "password": "secret123"})
    assert login.status_code == 200
    return {"Authorization": f"Bearer {login.json()['access_token']}"}


def test_review_and_recipient_handover_workflow(client):
    owner_headers = _register_and_login(client, "review-owner@example.com", "Project Owner")
    recipient_headers = _register_and_login(client, "review-recipient@example.com", "Incoming Recipient")
    created = client.post("/api/v1/projects", headers=owner_headers, json={"name": "Review Workflow", "description": "Demo project"})
    project_id = created.json()["id"]

    with SessionLocal() as db:
        owner = db.scalar(select(User).where(User.email == "review-owner@example.com"))
        project = db.get(Project, project_id)
        source = Source(project_id=project_id, filename="notes.txt", source_type="txt", storage_path="unused-test-path", uploaded_by=owner.id, access_level="project")
        private_source = Source(project_id=project_id, filename="private.txt", source_type="txt", storage_path="unused-private-test-path", uploaded_by=owner.id, access_level="private")
        db.add_all([source, private_source])
        db.flush()
        supported = ExtractedItem(project_id=project.id, source_id=source.id, item_type="decision", title="Keep evidence", content="The team agreed to keep evidence.", confidence=85, verification_status="unverified")
        hidden = ExtractedItem(project_id=project.id, source_id=private_source.id, item_type="risk", title="Confidential risk", content="This private risk must not leak.", verification_status="verified")
        db.add_all([supported, hidden])
        db.flush()
        db.add(Evidence(extracted_item_id=supported.id, source_id=source.id, excerpt="The team agreed to keep evidence.", location_reference="notes.txt"))
        supported_id = supported.id
        db.commit()

    reviewed = client.patch(f"/api/v1/projects/{project_id}/extracted-items/{supported_id}", headers=owner_headers, json={
        "verification_status": "supported", "review_reason": "Compared with the source note.", "content": "The team agreed to preserve evidence."
    })
    assert reviewed.status_code == 200
    assert reviewed.json()["original_content"] == "The team agreed to keep evidence."
    assert reviewed.json()["review_reason"] == "Compared with the source note."

    report_response = client.post(f"/api/v1/projects/{project_id}/handovers", headers=owner_headers, json={
        "title": "Reviewer-approved handover", "recipient_email": "review-recipient@example.com"
    })
    assert report_response.status_code == 201
    report = report_response.json()
    assert "preserve evidence" in report["decisions"]
    assert "Confidential risk" not in report["missing_conflicting"]
    assert report["supporting_evidence"][0]["source"] == "notes.txt"
    report_id = report["id"]

    assert client.get(f"/api/v1/handovers/{report_id}", headers=recipient_headers).status_code == 404
    approved = client.post(f"/api/v1/handovers/{report_id}/approve", headers=owner_headers)
    assert approved.status_code == 200
    assert approved.json()["status"] == "approved"
    recipient_report = client.get(f"/api/v1/handovers/{report_id}", headers=recipient_headers)
    assert recipient_report.status_code == 200
    assert recipient_report.json()["supporting_evidence"][0]["excerpt"] == "The team agreed to keep evidence."
    assert client.get(f"/api/v1/projects/{project_id}", headers=recipient_headers).status_code == 200

    pdf = client.get(f"/api/v1/handovers/{report_id}/export.pdf", headers=recipient_headers)
    assert pdf.status_code == 200
    assert pdf.headers["content-type"].startswith("application/pdf")
    assert pdf.content.startswith(b"%PDF-")


def test_non_reviewer_cannot_approve_handover(client):
    owner_headers = _register_and_login(client, "approval-owner@example.com", "Owner User")
    contributor_headers = _register_and_login(client, "contributor@example.com", "Contributor User")
    project_id = client.post("/api/v1/projects", headers=owner_headers, json={"name": "Approval boundary"}).json()["id"]
    with SessionLocal() as db:
        contributor = db.scalar(select(User).where(User.email == "contributor@example.com"))
        db.add(ProjectMember(project_id=project_id, user_id=contributor.id, project_role="contributor"))
        db.commit()
    handover = client.post(f"/api/v1/projects/{project_id}/handovers", headers=owner_headers, json={"title": "Draft"})
    assert handover.status_code == 201
    result = client.post(f"/api/v1/handovers/{handover.json()['id']}/approve", headers=contributor_headers)
    assert result.status_code == 403


def test_reconstruction_flags_conflict_and_excludes_private_sources(client):
    owner_headers = _register_and_login(client, "reconstruction-owner@example.com", "Reconstruction Owner")
    project_id = client.post("/api/v1/projects", headers=owner_headers, json={"name": "Conflict evaluation"}).json()["id"]
    with SessionLocal() as db:
        owner = db.scalar(select(User).where(User.email == "reconstruction-owner@example.com"))
        public_source = Source(project_id=project_id, filename="public.md", source_type="markdown", storage_path="public-path", uploaded_by=owner.id, access_level="project")
        private_source = Source(project_id=project_id, filename="restricted.md", source_type="markdown", storage_path="private-path", uploaded_by=owner.id, access_level="private")
        db.add_all([public_source, private_source])
        db.flush()
        db.add_all([
            ExtractedItem(project_id=project_id, source_id=public_source.id, item_type="decision", title="Keep the notes", content="The pilot notes will be retained for 30 days after approval.", verification_status="conflicting"),
            ExtractedItem(project_id=project_id, source_id=public_source.id, item_type="decision", title="Remove the notes", content="The pilot notes will not be retained for 30 days after approval.", verification_status="conflicting"),
            ExtractedItem(project_id=project_id, source_id=private_source.id, item_type="risk", title="Private sample", content="Private source must never be surfaced.", verification_status="verified"),
        ])
        db.commit()
    response = client.post(f"/api/v1/reconstruction/project/{project_id}/state", headers=owner_headers)
    assert response.status_code == 200
    result = response.json()
    assert len(result["conflicts"]) == 1
    assert result["conflicts"][0]["labels"][0] == "Potential conflict"
    assert all(item["title"] != "Private sample" for item in result["timeline"])
    assert result["decision_history"][0]["evidence"] == []


def test_upload_preview_and_extract_pdf_and_docx(client, monkeypatch):
    headers = _register_and_login(client, "document-owner@example.com", "Document Owner")
    project_id = client.post("/api/v1/projects", headers=headers, json={"name": "Document pipeline"}).json()["id"]
    monkeypatch.setattr("app.ai.extraction_service.extract_knowledge", lambda *_: {"items": [], "error": "No LLM API configured"})

    pdf_buffer = BytesIO()
    canvas = Canvas(pdf_buffer)
    canvas.drawString(72, 720, "Decision: retain a page reference for reviewer context.")
    canvas.save()
    pdf_upload = client.post(f"/api/v1/projects/{project_id}/sources", headers=headers, files={"file": ("minutes.pdf", pdf_buffer.getvalue(), "application/pdf")})
    assert pdf_upload.status_code == 201
    pdf_source_id = pdf_upload.json()["id"]
    preview = client.get(f"/api/v1/sources/{pdf_source_id}/preview", headers=headers)
    assert "reviewer context" in preview.json()["content"]
    extracted = client.post(f"/api/v1/extraction/source/{pdf_source_id}", headers=headers)
    assert extracted.status_code == 202
    evidence = client.get(f"/api/v1/projects/{project_id}/extracted-items/{extracted.json()['items'][0]['extracted_item_id']}/evidence", headers=headers)
    assert evidence.json()[0]["page_number"] == 1

    word = Document()
    word.add_paragraph("Task: assign a reviewer to the document pipeline.")
    word_buffer = BytesIO()
    word.save(word_buffer)
    docx_upload = client.post(f"/api/v1/projects/{project_id}/sources", headers=headers, files={"file": ("plan.docx", word_buffer.getvalue(), "application/vnd.openxmlformats-officedocument.wordprocessingml.document")})
    assert docx_upload.status_code == 201
    docx_preview = client.get(f"/api/v1/sources/{docx_upload.json()['id']}/preview", headers=headers)
    assert "assign a reviewer" in docx_preview.json()["content"]
    assert client.post(f"/api/v1/extraction/source/{docx_upload.json()['id']}", headers=headers).status_code == 202

    invalid = client.post(f"/api/v1/projects/{project_id}/sources", headers=headers, files={"file": ("bad.pdf", b"not a pdf", "application/pdf")})
    assert invalid.status_code == 415

    member_headers = _register_and_login(client, "document-member@example.com", "Project Contributor")
    with SessionLocal() as db:
        member = db.scalar(select(User).where(User.email == "document-member@example.com"))
        owner = db.scalar(select(User).where(User.email == "document-owner@example.com"))
        db.add(ProjectMember(project_id=project_id, user_id=member.id, project_role="contributor"))
        db.add(Source(project_id=project_id, filename="restricted.md", source_type="markdown", storage_path="unpublished-private-file", uploaded_by=owner.id, access_level="private"))
        db.commit()
    source_list = client.get(f"/api/v1/projects/{project_id}/sources", headers=member_headers)
    assert all(source["filename"] != "restricted.md" for source in source_list.json()["sources"])
    assert client.delete(f"/api/v1/sources/{pdf_source_id}", headers=member_headers).status_code == 403
    assert client.delete(f"/api/v1/sources/{pdf_source_id}", headers=headers).status_code == 204


def test_project_member_invitation_is_role_limited(client):
    owner_headers = _register_and_login(client, "team-owner@example.com", "Team Owner")
    contributor_headers = _register_and_login(client, "team-contributor@example.com", "Team Contributor")
    _register_and_login(client, "team-reviewer@example.com", "Team Reviewer")
    project_id = client.post("/api/v1/projects", headers=owner_headers, json={"name": "Member management"}).json()["id"]
    with SessionLocal() as db:
        contributor = db.scalar(select(User).where(User.email == "team-contributor@example.com"))
        db.add(ProjectMember(project_id=project_id, user_id=contributor.id, project_role="contributor"))
        db.commit()
    invite = client.post(f"/api/v1/projects/{project_id}/members", headers=owner_headers, json={"email": "team-reviewer@example.com", "project_role": "reviewer"})
    assert invite.status_code == 201
    assert invite.json()["project_role"] == "reviewer"
    assert client.get(f"/api/v1/projects/{project_id}", headers={"Authorization": owner_headers["Authorization"]}).json()["current_user_role"] == "owner"
    assert client.post(f"/api/v1/projects/{project_id}/members", headers=contributor_headers, json={"email": "team-reviewer@example.com", "project_role": "admin"}).status_code == 403
    assert client.post(f"/api/v1/projects/{project_id}/members", headers=owner_headers, json={"email": "team-reviewer@example.com", "project_role": "reviewer"}).status_code == 409
