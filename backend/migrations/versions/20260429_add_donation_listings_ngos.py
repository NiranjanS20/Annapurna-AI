"""add donation listings and ngo tables

Revision ID: 20260429_add_donation_listings_ngos
Revises: 4ff0931f78ba
Create Date: 2026-04-29 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '20260429_add_donation_listings_ngos'
down_revision = '4ff0931f78ba'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'ngos',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('ngo_name', sa.String(length=255), nullable=False),
        sa.Column('phone', sa.String(length=50), nullable=True),
        sa.Column('email', sa.String(length=255), nullable=True),
        sa.Column('base_lat', sa.Numeric(precision=9, scale=6), nullable=False),
        sa.Column('base_lng', sa.Numeric(precision=9, scale=6), nullable=False),
        sa.Column('address', sa.String(length=255), nullable=True),
        sa.Column('service_radius_km', sa.Numeric(precision=6, scale=2), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default=sa.text('true')),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id']),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('user_id')
    )
    with op.batch_alter_table('ngos') as batch_op:
        batch_op.create_index('ix_ngos_user_id', ['user_id'], unique=True)

    op.create_table(
        'donation_listings',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('canteen_id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('item_name', sa.String(length=255), nullable=False),
        sa.Column('category', sa.String(length=100), nullable=True),
        sa.Column('quantity', sa.Numeric(precision=10, scale=2), nullable=False),
        sa.Column('unit', sa.String(length=30), nullable=False, server_default='units'),
        sa.Column('waste_context', sa.String(length=50), nullable=True),
        sa.Column('pickup_start', sa.DateTime(timezone=True), nullable=True),
        sa.Column('pickup_end', sa.DateTime(timezone=True), nullable=True),
        sa.Column('lat', sa.Numeric(precision=9, scale=6), nullable=True),
        sa.Column('lng', sa.Numeric(precision=9, scale=6), nullable=True),
        sa.Column('address', sa.String(length=255), nullable=True),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('status', sa.Enum(
            'draft', 'available', 'notified', 'accepted', 'pickup_scheduled', 'completed', 'expired', 'cancelled_by_system',
            name='donation_listing_status_enum', native_enum=False
        ), nullable=False, server_default='draft'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['canteen_id'], ['users.id']),
        sa.ForeignKeyConstraint(['user_id'], ['users.id']),
        sa.PrimaryKeyConstraint('id')
    )
    with op.batch_alter_table('donation_listings') as batch_op:
        batch_op.create_index('ix_donation_listings_canteen_id', ['canteen_id'], unique=False)
        batch_op.create_index('ix_donation_listings_user_id', ['user_id'], unique=False)
        batch_op.create_index('ix_donation_listings_status', ['status'], unique=False)
        batch_op.create_index('ix_donation_listings_expires_at', ['expires_at'], unique=False)

    op.create_table(
        'donation_acceptances',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('donation_id', sa.String(length=36), nullable=False),
        sa.Column('ngo_id', sa.Integer(), nullable=False),
        sa.Column('accepted_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('pickup_eta', sa.DateTime(timezone=True), nullable=True),
        sa.Column('status', sa.Enum(
            'accepted', 'pickup_scheduled', 'completed', 'cancelled', 'expired',
            name='donation_acceptance_status_enum', native_enum=False
        ), nullable=False, server_default='accepted'),
        sa.Column('completion_timestamp', sa.DateTime(timezone=True), nullable=True),
        sa.Column('idempotency_key', sa.String(length=64), nullable=True),
        sa.ForeignKeyConstraint(['donation_id'], ['donation_listings.id']),
        sa.ForeignKeyConstraint(['ngo_id'], ['ngos.id']),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('donation_id')
    )
    with op.batch_alter_table('donation_acceptances') as batch_op:
        batch_op.create_index('ix_donation_acceptances_donation_id', ['donation_id'], unique=True)
        batch_op.create_index('ix_donation_acceptances_ngo_id', ['ngo_id'], unique=False)
        batch_op.create_index('ix_donation_acceptances_idempotency_key', ['idempotency_key'], unique=False)

    op.create_table(
        'donation_notifications',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('donation_id', sa.String(length=36), nullable=False),
        sa.Column('ngo_id', sa.Integer(), nullable=False),
        sa.Column('notified_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('channel', sa.String(length=50), nullable=False, server_default='sse'),
        sa.Column('delivery_status', sa.Enum('pending', 'sent', 'failed', name='donation_notification_status_enum', native_enum=False), nullable=False, server_default='sent'),
        sa.Column('read_status', sa.Boolean(), nullable=False, server_default=sa.text('false')),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['donation_id'], ['donation_listings.id']),
        sa.ForeignKeyConstraint(['ngo_id'], ['ngos.id']),
        sa.PrimaryKeyConstraint('id')
    )
    with op.batch_alter_table('donation_notifications') as batch_op:
        batch_op.create_index('ix_donation_notifications_donation_id', ['donation_id'], unique=False)
        batch_op.create_index('ix_donation_notifications_ngo_id', ['ngo_id'], unique=False)

    op.create_table(
        'donation_audit_logs',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('donation_id', sa.String(length=36), nullable=False),
        sa.Column('actor_user_id', sa.Integer(), nullable=True),
        sa.Column('event_type', sa.String(length=50), nullable=False),
        sa.Column('from_status', sa.String(length=50), nullable=True),
        sa.Column('to_status', sa.String(length=50), nullable=True),
        sa.Column('metadata', sa.JSON(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['donation_id'], ['donation_listings.id']),
        sa.ForeignKeyConstraint(['actor_user_id'], ['users.id']),
        sa.PrimaryKeyConstraint('id')
    )
    with op.batch_alter_table('donation_audit_logs') as batch_op:
        batch_op.create_index('ix_donation_audit_logs_donation_id', ['donation_id'], unique=False)
        batch_op.create_index('ix_donation_audit_logs_actor_user_id', ['actor_user_id'], unique=False)

    op.execute("UPDATE users SET role='canteen' WHERE role IS NULL OR role != 'ngo'")


def downgrade():
    with op.batch_alter_table('donation_audit_logs') as batch_op:
        batch_op.drop_index('ix_donation_audit_logs_actor_user_id')
        batch_op.drop_index('ix_donation_audit_logs_donation_id')
    op.drop_table('donation_audit_logs')

    with op.batch_alter_table('donation_notifications') as batch_op:
        batch_op.drop_index('ix_donation_notifications_ngo_id')
        batch_op.drop_index('ix_donation_notifications_donation_id')
    op.drop_table('donation_notifications')

    with op.batch_alter_table('donation_acceptances') as batch_op:
        batch_op.drop_index('ix_donation_acceptances_idempotency_key')
        batch_op.drop_index('ix_donation_acceptances_ngo_id')
        batch_op.drop_index('ix_donation_acceptances_donation_id')
    op.drop_table('donation_acceptances')

    with op.batch_alter_table('donation_listings') as batch_op:
        batch_op.drop_index('ix_donation_listings_expires_at')
        batch_op.drop_index('ix_donation_listings_status')
        batch_op.drop_index('ix_donation_listings_user_id')
        batch_op.drop_index('ix_donation_listings_canteen_id')
    op.drop_table('donation_listings')

    with op.batch_alter_table('ngos') as batch_op:
        batch_op.drop_index('ix_ngos_user_id')
    op.drop_table('ngos')
