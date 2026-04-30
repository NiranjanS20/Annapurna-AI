"""add listing notes and source linkage

Revision ID: 7c3b8f4a5d12
Revises: 4ff0931f78ba
Create Date: 2026-04-30 09:30:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '7c3b8f4a5d12'
down_revision = '4ff0931f78ba'
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table('donation_listings', schema=None) as batch_op:
        batch_op.add_column(sa.Column('notes', sa.Text(), nullable=True))
        batch_op.add_column(sa.Column('source_food_data_id', sa.Integer(), nullable=True))
        batch_op.create_foreign_key(
            'fk_donation_listings_source_food_data_id',
            'food_data',
            ['source_food_data_id'],
            ['id']
        )
        batch_op.create_index(
            'idx_donation_listings_source_food_data_id',
            ['source_food_data_id'],
            unique=False
        )


def downgrade():
    with op.batch_alter_table('donation_listings', schema=None) as batch_op:
        batch_op.drop_index('idx_donation_listings_source_food_data_id')
        batch_op.drop_constraint('fk_donation_listings_source_food_data_id', type_='foreignkey')
        batch_op.drop_column('source_food_data_id')
        batch_op.drop_column('notes')
