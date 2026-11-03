"""Store revoked JWT identifiers in the database."""

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect

revision = "20261103_0002"
down_revision = "20261103_0001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    if "token_revocations" not in inspect(bind).get_table_names():
        op.create_table(
            "token_revocations",
            sa.Column("jti", sa.String(length=36), primary_key=True),
            sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
            sa.Column("revoked_at", sa.DateTime(timezone=True), nullable=False),
        )
    indexes = {idx["name"] for idx in inspect(bind).get_indexes("token_revocations")}
    if "ix_token_revocations_expires_at" not in indexes:
        op.create_index("ix_token_revocations_expires_at", "token_revocations", ["expires_at"])


def downgrade() -> None:
    if "token_revocations" in inspect(op.get_bind()).get_table_names():
        indexes = {idx["name"] for idx in inspect(op.get_bind()).get_indexes("token_revocations")}
        if "ix_token_revocations_expires_at" in indexes:
            op.drop_index("ix_token_revocations_expires_at", table_name="token_revocations")
        op.drop_table("token_revocations")
