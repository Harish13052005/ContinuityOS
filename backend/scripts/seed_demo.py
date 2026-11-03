"""Idempotently seed the portfolio owner's public projects as local demos.

Run from backend: python -m scripts.seed_demo. It never reads or changes a password.
"""
from __future__ import annotations

import uuid
from pathlib import Path

from sqlalchemy import delete, select

from app.core.config import settings
from app.core.database import SessionLocal
from app.core.security import get_password_hash
from app.models import Evidence, ExtractedItem, Handover, Project, ProjectMember, Source, User

OWNER_EMAIL = "harishkumarchilumula135@gmail.com"
PEOPLE = [("maya.chen@continuityos.demo", "Maya Chen", "Product and graph workflows"), ("daniel.park@continuityos.demo", "Daniel Park", "Engineering and integrations"), ("priya.nair@continuityos.demo", "Priya Nair", "Research and operations")]
PROJECTS = [
    {"name": "CareerGraph AI", "description": "An AI career exploration platform that maps skills, roles, learning paths, companies, projects, certifications, and interview preparation into an interactive career graph.", "legacy": "Atlas Platform Modernization", "legacy_handover": "Atlas Platform Modernization handover", "repo": "https://github.com/Harish13052005/careergraph-ai", "members": [0, 1], "sources": [
        ("careergraph-overview.md", "# CareerGraph AI\nSource: public repository README.\nPurpose: help people explore career paths with connected skills, roles, learning resources, projects, and certifications.\nDecision: present recommendations as an explorable graph so users can inspect relationships.\nTask: validate recommendation relevance against example career goals.\nRisk: graph quality depends on accurate and current skill relationships.\nMilestone: connect career path exploration with company and project discovery."),
        ("careergraph-product-map.md", "# Product map\nThe graph model connects User, Skill, Role, Project, Company, Certification, Resource, and Interview Question entities.\nTask: keep graph nodes and edges understandable in the visual explorer.\nQuestion: which career transition should be featured in the first guided demo?\nDecision: pair a recommended role with a visible skill gap and learning roadmap.")], "handover": "CareerGraph AI reviewer handover"},
    {"name": "AI Money Mentor", "description": "A multi-agent personal finance planning demo for explaining financial scenarios, creating action plans, tracking history, and retaining an auditable record of recommendations.", "legacy": "Customer Insights Launch", "legacy_handover": "Customer Insights beta handover", "repo": "https://github.com/Harish13052005/AI_Money_Mentor", "members": [0, 2], "sources": [
        ("money-mentor-overview.md", "# AI Money Mentor\nSource: public repository README.\nPurpose: explain personal finance scenarios and turn user goals into practical planning steps.\nFeature: financial plans include savings guidance, risk context, and suggested actions.\nFeature: users can review prior records and inspect explanations.\nRisk: financial outputs require careful review and must not be presented as guaranteed outcomes.\nDemo note: use fictional sample values; no payments or financial transactions are performed."),
        ("money-mentor-architecture.md", "# System and demo flow\nThe application coordinates specialized AI agents for analysis, planning, explanation, and memory.\nIntegration options include OpenAI, Groq, and HuggingFace providers.\nTask: make provider availability and generated explanations clear to the user.\nDecision: preserve an audit trail for generated planning records.\nQuestion: how should users compare a changed assumption against an earlier plan?\nRisk: provider response formats and availability can vary.")], "handover": "AI Money Mentor reviewer handover"},
    {"name": "ParkSense", "description": "A parking operations system with compatible bay allocation, customer reservations, check-in and check-out, simulated advance payments, employee discounts, and occupancy analytics.", "legacy": "AI Support Operations Pilot", "legacy_handover": "AI Support pilot operations handover", "repo": "https://github.com/Harish13052005/ParkSense", "members": [1, 2], "sources": [
        ("parksense-operations.md", "# ParkSense operations\nSource: public repository README and presentation.\nDemo configuration: 400 parking bays across two-wheeler, three-wheeler, and four-wheeler categories.\nFeature: assign the nearest compatible available bay and support check-in and check-out.\nFeature: customer views include vehicles, reservations, and visit history.\nTask: check that bay status remains consistent during arrival and departure.\nRisk: real-time availability depends on accurate operational updates."),
        ("parksense-pricing-and-analytics.md", "# Reservations and operations analytics\nReservations support advance booking and a simulated payment step; no payment provider is charged.\nFeature: employee records can receive configured discounts.\nFeature: administrator views show bay occupancy, parking inventory, visit history, and revenue summaries.\nTask: review utilization and revenue filters before exporting visit history.\nQuestion: what reservation window best balances convenience and bay availability?\nMilestone: demonstrate customer booking and the operator bay map as separate workflows.")], "handover": "ParkSense reviewer handover"},
]


def main() -> None:
    db = SessionLocal()
    try:
        owner = db.scalar(select(User).where(User.email == OWNER_EMAIL))
        if owner is None:
            raise SystemExit(f"Demo owner {OWNER_EMAIL} is not registered; no users were changed.")
        accounts = []
        for email, name, _ in PEOPLE:
            user = db.scalar(select(User).where(User.email == email))
            if user is None:
                user = User(email=email, full_name=name, role="member", hashed_password=get_password_hash(uuid.uuid4().hex + uuid.uuid4().hex))
                db.add(user)
                db.flush()
            accounts.append(user)
        root = Path(settings.STORAGE_DIR).resolve()
        for spec in PROJECTS:
            project = db.scalar(select(Project).where(Project.owner_id == owner.id, Project.name == spec["name"]))
            if project is None:
                project = db.scalar(select(Project).where(Project.owner_id == owner.id, Project.name == spec["legacy"]))
            if project is None:
                project = Project(name=spec["name"], description=spec["description"], owner_id=owner.id)
                db.add(project)
                db.flush()
            project.name, project.description = spec["name"], spec["description"]
            for idx in spec["members"]:
                if db.scalar(select(ProjectMember).where(ProjectMember.project_id == project.id, ProjectMember.user_id == accounts[idx].id)) is None:
                    db.add(ProjectMember(project_id=project.id, user_id=accounts[idx].id, project_role=PEOPLE[idx][2]))

            # Refresh only files previously created by this demo seeder; uploaded user files are preserved.
            demo_sources = db.scalars(select(Source).where(Source.project_id == project.id, Source.storage_path.like("%demo-%"))).all()
            demo_ids = [s.id for s in demo_sources]
            if demo_ids:
                item_ids = list(db.scalars(select(ExtractedItem.id).where(ExtractedItem.source_id.in_(demo_ids))))
                if item_ids:
                    db.execute(delete(Evidence).where(Evidence.extracted_item_id.in_(item_ids)))
                    db.execute(delete(ExtractedItem).where(ExtractedItem.id.in_(item_ids)))
                db.execute(delete(Evidence).where(Evidence.source_id.in_(demo_ids)))
                db.execute(delete(Source).where(Source.id.in_(demo_ids)))
            for filename, content in spec["sources"]:
                folder = root / project.id
                folder.mkdir(parents=True, exist_ok=True)
                path = folder / f"demo-{filename}"
                path.write_text(content + "\n", encoding="utf-8")
                source = Source(project_id=project.id, filename=filename, source_type="markdown", storage_path=str(path), uploaded_by=owner.id, access_level="project")
                db.add(source)
                db.flush()
                for line in content.splitlines():
                    clean = line.strip(" \t-#")
                    kind = next((k for k in ("decision", "task", "risk", "blocker", "dependency", "question", "milestone") if clean.lower().startswith(k + ":")), None)
                    if kind and len(clean) >= 12:
                        item = ExtractedItem(project_id=project.id, source_id=source.id, item_type=kind, title=clean[:120], content=clean, confidence=94, verification_status="verified")
                        db.add(item)
                        db.flush()
                        db.add(Evidence(extracted_item_id=item.id, source_id=source.id, excerpt=clean, location_reference=filename))

            handover = db.scalar(select(Handover).where(Handover.project_id == project.id, Handover.title == spec["handover"]))
            legacy_handover = db.scalar(select(Handover).where(Handover.project_id == project.id, Handover.title == spec["legacy_handover"]))
            if legacy_handover is not None:
                if handover is None:
                    handover = legacy_handover
                    handover.title = spec["handover"]
                else:
                    db.delete(legacy_handover)
            if handover is None:
                handover = Handover(project_id=project.id, title=spec["handover"], status="ready", created_by=owner.id)
                db.add(handover)
            handover.project_overview = spec["description"]
            handover.current_status = "Portfolio demo sourced from the public project repository. Review the linked repository and screenshots for implementation details."
            handover.decisions = "Review product decisions captured in the project source notes."
            handover.pending_tasks = "Use the project walkthrough to review the sample workflows and confirm current implementation details."
            handover.dependencies_blockers = "Demo content summarizes repository materials; verify external dependencies in the linked source repository."
            handover.risks_questions = "Review the sample risks and open questions before presenting project behavior as production capability."
            handover.milestones = "Reviewer walkthrough: overview, primary workflow, and supporting analytics."
            handover.next_actions = "1. Open the repository link.\n2. Walk through the project screenshots.\n3. Review the source-backed project notes."
            handover.missing_conflicting = "Showcase content is an illustrative summary. Confirm current behavior against the repository before relying on it."
        db.commit()
        print("Portfolio demo sync complete: 3 public projects, source-backed sample insights, collaborators, and reviewer handovers.")
    finally:
        db.close()


if __name__ == "__main__":
    main()
