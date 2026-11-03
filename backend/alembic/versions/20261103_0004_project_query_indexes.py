"""Add project-scoped query indexes and membership uniqueness."""

from alembic import op
from sqlalchemy import inspect, text

revision = "20261103_0004"
down_revision = "20261103_0003"
branch_labels = None
depends_on = None

INDEXES = {
    "sources": [("ix_sources_project_id", ["project_id"])],
    "extracted_items": [("ix_extracted_items_project_id", ["project_id"]), ("ix_extracted_items_source_id", ["source_id"])],
    "evidence": [("ix_evidence_extracted_item_id", ["extracted_item_id"]), ("ix_evidence_source_id", ["source_id"])],
    "handovers": [("ix_handovers_project_id", ["project_id"])],
    "audit_logs": [("ix_audit_logs_project_id", ["project_id"])],
}


def upgrade() -> None:
    bind = op.get_bind()
    for table, definitions in INDEXES.items():
        existing = {index["name"] for index in inspect(bind).get_indexes(table)}
        for name, columns in definitions:
            if name not in existing:
                op.create_index(name, table, columns)

    inspector = inspect(bind)
    unique_names = {index["name"] for index in inspector.get_indexes("project_members") if index.get("unique")}
    unique_names.update(c.get("name") for c in inspector.get_unique_constraints("project_members"))
    constraint_name = "uq_project_member_project_user"
    if constraint_name not in unique_names:
        duplicate = bind.execute(text("SELECT 1 FROM project_members GROUP BY project_id, user_id HAVING COUNT(*) > 1 LIMIT 1")).first()
        if duplicate:
            raise RuntimeError("Cannot enforce unique project membership: duplicate project/user rows must be reconciled first")
        op.create_index(constraint_name, "project_members", ["project_id", "user_id"], unique=True)


def downgrade() -> None:
    bind = op.get_bind()
    inspector = inspect(bind)
    unique_names = {index["name"] for index in inspector.get_indexes("project_members")}
    unique_names.update(c.get("name") for c in inspector.get_unique_constraints("project_members"))
    if "uq_project_member_project_user" in unique_names:
        op.drop_index("uq_project_member_project_user", table_name="project_members")
    for table, definitions in reversed(list(INDEXES.items())):
        existing = {index["name"] for index in inspect(bind).get_indexes(table)}
        for name, _ in reversed(definitions):
            if name in existing:
                op.drop_index(name, table_name=table)
