from datetime import datetime, timezone
from email.message import EmailMessage
from ipaddress import ip_address
import smtplib
from uuid import uuid4

from flask import current_app, request
from flask_jwt_extended import create_access_token, create_refresh_token, decode_token, get_jwt
from itsdangerous import BadSignature, SignatureExpired, URLSafeTimedSerializer

from app.extensions import db
from app.models.auth import AuditLog, AuthSession, LoginHistory, Role, SecurityEvent, User
from app.security import sanitize_text_fields


def normalize_email(email):
    return email.strip().lower()


def pack_ip_address(raw_ip):
    if not raw_ip:
        return None
    if ',' in raw_ip:
        raw_ip = raw_ip.split(',', 1)[0].strip()
    try:
        return ip_address(raw_ip).packed
    except ValueError:
        return None


def get_request_context_values():
    return {
        'ip_address': pack_ip_address(request.headers.get('X-Forwarded-For', request.remote_addr)),
        'user_agent': request.headers.get('User-Agent'),
        'device_fingerprint': request.headers.get('X-Device-Fingerprint'),
    }


def get_role_by_name(role_name):
    return Role.query.filter(Role.role_name.ilike(role_name)).first()


def get_or_create_role(role_name, description=None):
    role = get_role_by_name(role_name)
    if role is not None:
        return role

    role = Role(role_name=role_name, description=description)
    db.session.add(role)
    db.session.flush()
    return role


def ensure_default_roles():
    for role_name in ('Customer', 'Seller', 'Admin'):
        get_or_create_role(role_name)


def build_serializer():
    return URLSafeTimedSerializer(current_app.config['SECRET_KEY'])


def make_verification_token(user):
    return build_serializer().dumps({'user_id': user.user_id, 'purpose': 'email_verification'}, salt='email-verification')


def make_reset_token(user):
    return build_serializer().dumps({'user_id': user.user_id, 'purpose': 'password_reset'}, salt='password-reset')


def verify_token(token, salt, max_age_minutes):
    payload = build_serializer().loads(token, salt=salt, max_age=max_age_minutes * 60)
    if payload.get('user_id') is None:
        raise BadSignature('Invalid token payload')
    return payload


def send_email(subject, recipient, body):
    host = current_app.config.get('SMTP_HOST')
    if not host:
        current_app.logger.info('SMTP not configured. Email to %s was not sent. Subject: %s', recipient, subject)
        return False

    message = EmailMessage()
    message['Subject'] = subject
    message['From'] = current_app.config['SMTP_SENDER']
    message['To'] = recipient
    message.set_content(body)

    if current_app.config.get('SMTP_USE_TLS', True):
        with smtplib.SMTP(host, current_app.config['SMTP_PORT']) as smtp:
            smtp.starttls()
            if current_app.config['SMTP_USERNAME']:
                smtp.login(current_app.config['SMTP_USERNAME'], current_app.config['SMTP_PASSWORD'])
            smtp.send_message(message)
    else:
        with smtplib.SMTP_SSL(host, current_app.config['SMTP_PORT']) as smtp:
            if current_app.config['SMTP_USERNAME']:
                smtp.login(current_app.config['SMTP_USERNAME'], current_app.config['SMTP_PASSWORD'])
            smtp.send_message(message)

    return True


def create_jwt_pair(user):
    session_key = uuid4().hex
    return create_jwt_pair_with_session(user, session_key)


def create_jwt_pair_with_session(user, session_key):
    claims = {
        'role': user.role.role_name,
        'role_id': user.role_id,
        'email_verified': user.email_verified_at is not None,
        'sid': session_key,
    }
    access_token = create_access_token(identity=str(user.user_id), additional_claims=claims, fresh=True)
    refresh_token = create_refresh_token(identity=str(user.user_id), additional_claims=claims)
    return access_token, refresh_token


def create_session(user, refresh_token, session_key):
    decoded_refresh = decode_token(refresh_token)
    context = get_request_context_values()
    session = AuthSession(
        session_key=session_key,
        user_id=user.user_id,
        jwt_jti=decoded_refresh['jti'],
        refresh_token_hash=hash_refresh_token(refresh_token),
        ip_address=context['ip_address'],
        user_agent=context['user_agent'],
        device_fingerprint=context['device_fingerprint'],
        expires_at=datetime.fromtimestamp(decoded_refresh['exp'], tz=timezone.utc),
    )
    db.session.add(session)
    db.session.flush()
    return session


def hash_refresh_token(refresh_token):
    import bcrypt

    return bcrypt.hashpw(refresh_token.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')


def verify_refresh_token(refresh_token, refresh_token_hash):
    import bcrypt

    return bcrypt.checkpw(refresh_token.encode('utf-8'), refresh_token_hash.encode('utf-8'))


def update_session_rotation(session, refresh_token):
    decoded_refresh = decode_token(refresh_token)
    session.jwt_jti = decoded_refresh['jti']
    session.refresh_token_hash = hash_refresh_token(refresh_token)
    session.expires_at = datetime.fromtimestamp(decoded_refresh['exp'], tz=timezone.utc)
    session.revoked_at = None
    context = get_request_context_values()
    session.ip_address = context['ip_address']
    session.user_agent = context['user_agent']
    session.device_fingerprint = context['device_fingerprint']


def revoke_session(session):
    session.revoked_at = datetime.now(timezone.utc)


def revoke_all_user_sessions(user_id):
    sessions = AuthSession.query.filter_by(user_id=user_id, revoked_at=None).all()
    for session in sessions:
        revoke_session(session)


def record_login_history(user_id, status, session_id=None, failure_reason=None):
    context = get_request_context_values()
    entry = LoginHistory(
        user_id=user_id,
        session_id=session_id,
        login_status=status,
        failure_reason=failure_reason,
        ip_address=context['ip_address'],
        user_agent=context['user_agent'],
    )
    db.session.add(entry)
    return entry


def record_audit_log(actor_user_id, entity_name, entity_id, action_type, old_values=None, new_values=None):
    context = get_request_context_values()
    entry = AuditLog(
        actor_user_id=actor_user_id,
        entity_name=entity_name,
        entity_id=entity_id,
        action_type=action_type,
        old_values=old_values,
        new_values=new_values,
        ip_address=context['ip_address'],
        user_agent=context['user_agent'],
    )
    db.session.add(entry)
    return entry


def record_security_event(user_id, event_type, message, severity='medium', session_id=None, metadata=None):
    context = get_request_context_values()
    entry = SecurityEvent(
        user_id=user_id,
        session_id=session_id,
        event_type=event_type,
        event_severity=severity,
        event_status='open',
        event_message=message,
        ip_address=context['ip_address'],
        metadata=metadata,
    )
    db.session.add(entry)
    return entry


def create_user_account(payload, role_name='Customer', verified=False):
    email = normalize_email(payload['email'])
    existing_user = User.query.filter_by(email=email).first()
    if existing_user is not None:
        raise ValueError('Email already registered')

    role = get_or_create_role(role_name)
    sanitized = sanitize_text_fields(payload, ['first_name', 'last_name', 'phone'])
    user = User(
        role=role,
        first_name=sanitized['first_name'].strip(),
        last_name=sanitized['last_name'].strip(),
        email=email,
        phone=sanitized.get('phone'),
        is_active=True,
    )
    user.set_password(payload['password'])
    if verified:
        user.email_verified_at = datetime.now(timezone.utc)

    db.session.add(user)
    db.session.flush()
    return user


def auth_response_payload(user, access_token, refresh_token, session=None, verification_token=None, reset_token=None):
    payload = {
        'message': 'Authentication successful',
        'user': user.to_dict(),
        'access_token': access_token,
        'refresh_token': refresh_token,
    }
    if session is not None:
        payload['session_id'] = session.session_id
        payload['session_key'] = session.session_key
    if verification_token is not None and current_app.config.get('EXPOSE_SECURITY_TOKENS', True):
        payload['verification_token'] = verification_token
    if reset_token is not None and current_app.config.get('EXPOSE_SECURITY_TOKENS', True):
        payload['reset_token'] = reset_token
    if session is not None:
        from app.security import build_csrf_token

        payload['csrf_token'] = build_csrf_token(session.session_key, user.user_id)
    return payload


def current_user_from_jwt():
    identity = int(get_jwt()['sub'])
    return User.query.get(identity)


def get_current_session_from_jwt():
    jwt_payload = get_jwt()
    session_key = jwt_payload.get('sid')
    if not session_key:
        return None
    return AuthSession.query.filter_by(session_key=session_key, user_id=int(jwt_payload['sub'])).first()