from collections import defaultdict, deque
from datetime import datetime, timezone
from html import escape
import re
import threading
from uuid import uuid4

from flask import current_app, g, jsonify, request
from flask_jwt_extended import get_jwt, verify_jwt_in_request
from itsdangerous import BadSignature, SignatureExpired, URLSafeTimedSerializer
from werkzeug.utils import secure_filename

from app.extensions import db
from app.models.auth import AuthSession


DEFAULT_SECURITY_HEADERS = {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'no-referrer',
    'Permissions-Policy': 'geolocation=(), microphone=(), camera=()',
    'Cross-Origin-Opener-Policy': 'same-origin',
    'Cross-Origin-Resource-Policy': 'same-origin',
}

PUBLIC_CSRF_EXEMPT_PATHS = {
    '/auth/login',
    '/auth/register',
    '/auth/forgot-password',
    '/auth/reset-password',
    '/auth/verify-email',
    '/auth/resend-verification',
    '/auth/refresh',
    '/security/csrf-token',
}

RATE_LIMIT_RULES = {
    '/auth/login': (10, 60),
    '/auth/register': (5, 60),
    '/auth/forgot-password': (5, 60),
    '/auth/reset-password': (5, 60),
    '/auth/refresh': (30, 60),
    '/products': (120, 60),
    '/checkout': (20, 60),
    '/cart': (120, 60),
    '/wishlist': (120, 60),
}


class InMemoryRateLimiter:
    def __init__(self):
        self._hits = defaultdict(deque)
        self._lock = threading.Lock()

    def check(self, key, limit, window_seconds):
        now = datetime.now(timezone.utc).timestamp()
        with self._lock:
            bucket = self._hits[key]
            while bucket and bucket[0] <= now - window_seconds:
                bucket.popleft()
            if len(bucket) >= limit:
                retry_after = max(1, int(window_seconds - (now - bucket[0])))
                return False, retry_after
            bucket.append(now)
            return True, None


rate_limiter = InMemoryRateLimiter()


def sanitize_text(value):
    if value is None:
        return None
    cleaned = str(value).replace('\x00', '').strip()
    cleaned = re.sub(r'(?is)<(script|style).*?>.*?</\1>', '', cleaned)
    cleaned = cleaned.replace('<', '&lt;').replace('>', '&gt;')
    return escape(cleaned, quote=True)


def sanitize_text_fields(payload, field_names):
    sanitized = dict(payload)
    for field_name in field_names:
        if field_name in sanitized and sanitized[field_name] is not None:
            sanitized[field_name] = sanitize_text(sanitized[field_name])
    return sanitized


def build_serializer():
    return URLSafeTimedSerializer(current_app.config['SECRET_KEY'])


def build_csrf_token(session_key, user_id):
    return build_serializer().dumps({'sid': session_key, 'uid': user_id, 'nonce': uuid4().hex}, salt='csrf-token')


def verify_csrf_token(token, session_key, user_id):
    payload = build_serializer().loads(
        token,
        salt='csrf-token',
        max_age=current_app.config['CSRF_TOKEN_MAX_AGE_SECONDS'],
    )
    if payload.get('sid') != session_key or str(payload.get('uid')) != str(user_id):
        raise BadSignature('CSRF token mismatch')
    return payload


def _get_client_identity():
    forwarded_for = request.headers.get('X-Forwarded-For', '')
    if forwarded_for:
        return forwarded_for.split(',')[0].strip()
    return request.remote_addr or 'unknown'


def rate_limit_request():
    path = request.path.rstrip('/') or '/'
    rule = RATE_LIMIT_RULES.get(path, current_app.config['RATE_LIMIT_DEFAULT'])
    if not rule:
        return None
    limit, window_seconds = rule
    client_key = f"{_get_client_identity()}:{path}"
    allowed, retry_after = rate_limiter.check(client_key, limit, window_seconds)
    if not allowed:
        return jsonify({'message': 'Too many requests', 'retry_after': retry_after}), 429, {'Retry-After': str(retry_after)}
    return None


def verify_active_session():
    try:
        verify_jwt_in_request(optional=True)
    except Exception:
        return None

    try:
        jwt_payload = get_jwt()
    except Exception:
        return None
    if not jwt_payload:
        return None

    session_key = jwt_payload.get('sid')
    user_id = jwt_payload.get('sub')
    if not session_key or not user_id:
        return None

    session = AuthSession.query.filter_by(session_key=session_key, user_id=int(user_id)).first()
    if session is None or session.revoked_at is not None:
        return jsonify({'message': 'Session is no longer valid'}), 401

    session_timeout_seconds = current_app.config['SESSION_TIMEOUT_SECONDS']
    updated_at = session.updated_at or session.created_at
    if updated_at is not None:
        elapsed_seconds = (datetime.utcnow() - updated_at).total_seconds()
        if elapsed_seconds > session_timeout_seconds:
            session.revoked_at = datetime.utcnow()
            db.session.commit()
            return jsonify({'message': 'Session timed out'}), 401

    session.updated_at = datetime.utcnow()
    db.session.flush()
    g.current_auth_session = session
    return None


def enforce_csrf_if_required():
    if request.method in {'GET', 'HEAD', 'OPTIONS'}:
        return None
    if request.path in PUBLIC_CSRF_EXEMPT_PATHS:
        return None

    try:
        verify_jwt_in_request(optional=True)
    except Exception:
        return None

    try:
        jwt_payload = get_jwt()
    except Exception:
        return None
    if not jwt_payload:
        return None

    session_key = jwt_payload.get('sid')
    user_id = jwt_payload.get('sub')
    if not session_key or not user_id:
        return jsonify({'message': 'Missing CSRF context'}), 401

    token = request.headers.get('X-CSRF-Token', '')
    if not token:
        return jsonify({'message': 'Missing CSRF token'}), 403
    try:
        verify_csrf_token(token, session_key, user_id)
    except (BadSignature, SignatureExpired):
        return jsonify({'message': 'Invalid or expired CSRF token'}), 403
    return None


def secure_headers(response):
    for header_name, header_value in DEFAULT_SECURITY_HEADERS.items():
        response.headers.setdefault(header_name, header_value)
    response.headers.setdefault('Cache-Control', 'no-store')
    response.headers.setdefault('Pragma', 'no-cache')
    response.headers.setdefault('X-Robots-Tag', 'noindex, nofollow')
    response.headers.setdefault('Content-Security-Policy', "default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'self';")
    return response


def validate_upload_file(file_storage):
    if file_storage is None:
        raise ValueError('file is required')

    filename = secure_filename(file_storage.filename or '')
    if not filename:
        raise ValueError('filename is invalid')

    max_size = current_app.config['MAX_UPLOAD_SIZE_BYTES']
    file_storage.stream.seek(0, 2)
    file_size = file_storage.stream.tell()
    file_storage.stream.seek(0)
    if file_size == 0:
        raise ValueError('file is empty')
    if file_size > max_size:
        raise ValueError(f'file must be {max_size} bytes or smaller')

    extension = filename.rsplit('.', 1)[-1].lower() if '.' in filename else ''
    if extension not in current_app.config['ALLOWED_UPLOAD_EXTENSIONS']:
        raise ValueError('file extension is not allowed')

    mimetype = (file_storage.mimetype or '').lower()
    if mimetype not in current_app.config['ALLOWED_UPLOAD_MIMETYPES']:
        raise ValueError('file type is not allowed')

    return {
        'filename': filename,
        'size': file_size,
        'mimetype': mimetype,
        'extension': extension,
    }