"""add photo report route key

Revision ID: 0007_photo_report_route_key
Revises: 0006_photo_reports
Create Date: 2026-05-14
"""
from alembic import op

revision = "0007_photo_report_route_key"
down_revision = "0006_photo_reports"
branch_labels = None
depends_on = None


OLD_ROUTE_KEY_CHECK = (
    "route_key IN ('purchase', 'accounting', 'it', 'manager', 'security', 'repair', 'cash', 'other')"
)
NEW_ROUTE_KEY_CHECK = (
    "route_key IN ('purchase', 'accounting', 'it', 'manager', 'security', 'repair', 'cash', 'other', 'photo_report')"
)


def upgrade() -> None:
    op.drop_constraint("ck_rocket_routes_route_key", "rocket_routes", type_="check")
    op.create_check_constraint("ck_rocket_routes_route_key", "rocket_routes", NEW_ROUTE_KEY_CHECK)


def downgrade() -> None:
    op.drop_constraint("ck_rocket_routes_route_key", "rocket_routes", type_="check")
    op.create_check_constraint("ck_rocket_routes_route_key", "rocket_routes", OLD_ROUTE_KEY_CHECK)
