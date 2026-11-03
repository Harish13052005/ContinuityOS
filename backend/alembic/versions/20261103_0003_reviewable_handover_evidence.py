"""Preserve original claims and evidence references in handover reports."""

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect

revision = "20261103_0003"
down_revision = "20261103_0002"
branch_labels = None
depends_on = None


def _add_if_missing(table: str, column: sa.Column) -> None:
    if column.name not in {col["name"] for col in inspect(op.get_bind()).get_columns(table)}:
        op.add_column(table, column)


def upgrade() -> None:
    _add_if_missing("extracted_items", sa.Column("original_content", sa.Text(), nullable=True))
    _add_if_missing("extracted_items", sa.Column("review_reason", sa.Text(), nullable=True))
    _add_if_missing("handovers", sa.Column("supporting_evidence", sa.Text(), nullable=True))


def downgrade() -> None:
    columns = {col["name"] for col in inspect(op.get_bind()).get_columns("handovers")}
    if "supporting_evidence" in columns:
        op.drop_column("handovers", "supporting_evidence")
    columns = {col["name"] for col in inspect(op.get_bind()).get_columns("extracted_items")}
    if "review_reason" in columns:
        op.drop_column("extracted_items", "review_reason")
    if "original_content" in columns:
        op.drop_column("extracted_items", "original_content")
