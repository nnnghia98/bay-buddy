"""Store personal UI field preferences."""
from alembic import op
import sqlalchemy as sa

revision = "d9e3f5a7b1c2"
down_revision = "b7c2d4e6f8a0"
branch_labels = None
depends_on = None


def upgrade() -> None:
    inspector = sa.inspect(op.get_bind())
    if inspector.has_table("user_field_preferences"):
        columns = {column["name"] for column in inspector.get_columns("user_field_preferences")}
        primary_key = inspector.get_pk_constraint("user_field_preferences")["constrained_columns"]
        if columns != {"user_id", "preferences"} or primary_key != ["user_id"]:
            raise RuntimeError("Existing field preferences table has an incompatible schema")
        return
    op.create_table(
        "user_field_preferences",
        sa.Column("user_id", sa.Uuid(), sa.ForeignKey("user.id"), primary_key=True),
        sa.Column("preferences", sa.JSON(), nullable=False),
    )


def downgrade() -> None:
    op.drop_table("user_field_preferences")
