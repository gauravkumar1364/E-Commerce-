from datetime import datetime

import bcrypt

from app.extensions import db


class TimestampMixin:
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    updated_at = db.Column(
        db.DateTime,
        nullable=False,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
    )


class Role(TimestampMixin, db.Model):
    __tablename__ = 'roles'

    role_id = db.Column(db.BigInteger, primary_key=True)
    role_name = db.Column(db.String(50), nullable=False, unique=True)
    description = db.Column(db.String(255), nullable=True)


class User(TimestampMixin, db.Model):
    __tablename__ = 'users'

    user_id = db.Column(db.BigInteger, primary_key=True)
    role_id = db.Column(db.BigInteger, db.ForeignKey('roles.role_id'), nullable=False)
    first_name = db.Column(db.String(100), nullable=False)
    last_name = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(255), nullable=False, unique=True, index=True)
    phone = db.Column(db.String(30), nullable=True)
    password_hash = db.Column(db.String(255), nullable=False)
    is_active = db.Column(db.Boolean, nullable=False, default=True)
    email_verified_at = db.Column(db.DateTime, nullable=True)
    last_login_at = db.Column(db.DateTime, nullable=True)

    role = db.relationship('Role', lazy='joined')

    def set_password(self, raw_password):
        self.password_hash = bcrypt.hashpw(
            raw_password.encode('utf-8'),
            bcrypt.gensalt(),
        ).decode('utf-8')

    def check_password(self, raw_password):
        return bcrypt.checkpw(
            raw_password.encode('utf-8'),
            self.password_hash.encode('utf-8'),
        )

    def has_role(self, *role_names):
        if self.role is None:
            return False
        allowed = {role_name.lower() for role_name in role_names}
        return self.role.role_name.lower() in allowed

    def to_dict(self):
        return {
            'user_id': self.user_id,
            'role': self.role.role_name if self.role else None,
            'first_name': self.first_name,
            'last_name': self.last_name,
            'email': self.email,
            'phone': self.phone,
            'is_active': self.is_active,
            'email_verified_at': self.email_verified_at.isoformat() if self.email_verified_at else None,
            'last_login_at': self.last_login_at.isoformat() if self.last_login_at else None,
        }


class AuthSession(TimestampMixin, db.Model):
    __tablename__ = 'sessions'

    session_id = db.Column(db.BigInteger, primary_key=True)
    session_key = db.Column(db.String(64), nullable=False, unique=True, index=True)
    user_id = db.Column(db.BigInteger, db.ForeignKey('users.user_id'), nullable=False)
    jwt_jti = db.Column(db.String(64), nullable=False, unique=True, index=True)
    refresh_token_hash = db.Column(db.String(255), nullable=True)
    ip_address = db.Column(db.LargeBinary(16), nullable=True)
    user_agent = db.Column(db.String(512), nullable=True)
    device_fingerprint = db.Column(db.String(255), nullable=True)
    expires_at = db.Column(db.DateTime, nullable=False)
    revoked_at = db.Column(db.DateTime, nullable=True)

    user = db.relationship('User', lazy='joined')


class LoginHistory(db.Model):
    __tablename__ = 'login_history'

    login_history_id = db.Column(db.BigInteger, primary_key=True)
    user_id = db.Column(db.BigInteger, db.ForeignKey('users.user_id'), nullable=False)
    session_id = db.Column(db.BigInteger, db.ForeignKey('sessions.session_id'), nullable=True)
    login_status = db.Column(db.Enum('success', 'failure', name='login_status_enum'), nullable=False)
    failure_reason = db.Column(db.String(255), nullable=True)
    ip_address = db.Column(db.LargeBinary(16), nullable=True)
    user_agent = db.Column(db.String(512), nullable=True)
    logged_in_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)


class AuditLog(db.Model):
    __tablename__ = 'audit_logs'

    audit_log_id = db.Column(db.BigInteger, primary_key=True)
    actor_user_id = db.Column(db.BigInteger, db.ForeignKey('users.user_id'), nullable=True)
    entity_name = db.Column(db.String(100), nullable=False)
    entity_id = db.Column(db.BigInteger, nullable=True)
    action_type = db.Column(db.String(100), nullable=False)
    old_values = db.Column(db.JSON, nullable=True)
    new_values = db.Column(db.JSON, nullable=True)
    ip_address = db.Column(db.LargeBinary(16), nullable=True)
    user_agent = db.Column(db.String(512), nullable=True)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)


class SecurityEvent(db.Model):
    __tablename__ = 'security_events'

    security_event_id = db.Column(db.BigInteger, primary_key=True)
    user_id = db.Column(db.BigInteger, db.ForeignKey('users.user_id'), nullable=True)
    session_id = db.Column(db.BigInteger, db.ForeignKey('sessions.session_id'), nullable=True)
    event_type = db.Column(db.String(100), nullable=False)
    event_severity = db.Column(
        db.Enum('low', 'medium', 'high', 'critical', name='security_event_severity_enum'),
        nullable=False,
        default='medium',
    )
    event_status = db.Column(
        db.Enum('open', 'investigating', 'resolved', 'dismissed', name='security_event_status_enum'),
        nullable=False,
        default='open',
    )
    event_message = db.Column(db.String(500), nullable=False)
    ip_address = db.Column(db.LargeBinary(16), nullable=True)
    event_metadata = db.Column(db.JSON, nullable=True)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    resolved_at = db.Column(db.DateTime, nullable=True)