from datetime import datetime, timezone
from uuid import uuid4

from flask import Blueprint, current_app, jsonify, request
from flask_jwt_extended import get_jwt, get_jwt_identity, jwt_required
from itsdangerous import BadSignature, SignatureExpired
from sqlalchemy.exc import IntegrityError

from app.decorators import role_required
from app.extensions import db
from app.models.auth import AuthSession, User
from app.services.auth_service import (
    auth_response_payload,
    create_jwt_pair_with_session,
    create_session,
    create_user_account,
    current_user_from_jwt,
    get_current_session_from_jwt,
    make_reset_token,
    make_verification_token,
    normalize_email,
    record_audit_log,
    record_login_history,
    record_security_event,
    revoke_all_user_sessions,
    revoke_session,
    send_email,
    update_session_rotation,
    verify_refresh_token,
    verify_token,
)

auth_bp = Blueprint('auth', __name__, url_prefix='/auth')


def parse_json_body(required_fields=None):
    data = request.get_json(silent=True) or {}
    required_fields = required_fields or []
    missing = [field for field in required_fields if not data.get(field)]
    if missing:
        return None, (jsonify({'message': f"Missing required fields: {', '.join(missing)}"}), 400)
    return data, None


@auth_bp.post('/register')
def register():
    data, error_response = parse_json_body(['first_name', 'last_name', 'email', 'password'])
    if error_response is not None:
        return error_response

    try:
        user = create_user_account(data, role_name='Customer', verified=False)
        session_key = uuid4().hex
        access_token, refresh_token = create_jwt_pair_with_session(user, session_key)
        session = create_session(user, refresh_token, session_key)
        verification_token = make_verification_token(user)
        send_email(
            'Verify your account',
            user.email,
            f'Welcome {user.first_name},\n\nUse this token to verify your email:\n{verification_token}\n',
        )
        record_audit_log(user.user_id, 'users', user.user_id, 'register', None, user.to_dict())
        db.session.commit()

        return (
            jsonify(
                {
                    'message': 'Registration successful',
                    'verification_required': True,
                    'verification_token': verification_token if current_app.config.get('EXPOSE_SECURITY_TOKENS', True) else None,
                    **auth_response_payload(user, access_token, refresh_token, session=session, verification_token=verification_token),
                }
            ),
            201,
        )
    except ValueError as exc:
        db.session.rollback()
        return jsonify({'message': str(exc)}), 409
    except IntegrityError:
        db.session.rollback()
        return jsonify({'message': 'Registration failed due to a database constraint'}), 400


@auth_bp.post('/login')
def login():
    data, error_response = parse_json_body(['email', 'password'])
    if error_response is not None:
        return error_response

    email = normalize_email(data['email'])
    user = User.query.filter_by(email=email).first()

    if user is None or not user.is_active or not user.check_password(data['password']):
        if user is not None:
            record_login_history(user.user_id, 'failure', failure_reason='invalid_credentials')
            record_security_event(user.user_id, 'login_failed', 'Invalid credentials were used for login', severity='high')
        db.session.commit()
        return jsonify({'message': 'Invalid email or password'}), 401

    if user.email_verified_at is None:
        verification_token = make_verification_token(user)
        record_login_history(user.user_id, 'failure', failure_reason='email_not_verified')
        record_security_event(user.user_id, 'verification_required', 'Login blocked until email verification is completed', severity='medium')
        db.session.commit()
        return (
            jsonify(
                {
                    'message': 'Email verification required',
                    'verification_required': True,
                    'verification_token': verification_token if current_app.config.get('EXPOSE_SECURITY_TOKENS', True) else None,
                }
            ),
            403,
        )

    user.last_login_at = datetime.now(timezone.utc)
    session_key = uuid4().hex
    access_token, refresh_token = create_jwt_pair_with_session(user, session_key)
    session = create_session(user, refresh_token, session_key)
    record_login_history(user.user_id, 'success', session_id=session.session_id)
    record_audit_log(user.user_id, 'users', user.user_id, 'login', None, {'last_login_at': user.last_login_at.isoformat()})
    db.session.commit()

    return jsonify(auth_response_payload(user, access_token, refresh_token, session=session)), 200


@auth_bp.post('/refresh')
@jwt_required(refresh=True)
def refresh():
    user = current_user_from_jwt()
    if user is None or not user.is_active:
        return jsonify({'message': 'User account is unavailable'}), 401

    session = get_current_session_from_jwt()
    if session is None:
        return jsonify({'message': 'Session is no longer valid'}), 401
    raw_refresh_token = request.headers.get('Authorization', '').split(' ', 1)[-1]
    if session is None or session.revoked_at is not None:
        return jsonify({'message': 'Session is no longer valid'}), 401

    if not session.refresh_token_hash or not verify_refresh_token(raw_refresh_token, session.refresh_token_hash):
        revoke_session(session)
        db.session.commit()
        return jsonify({'message': 'Session token mismatch'}), 401

    access_token, new_refresh_token = create_jwt_pair_with_session(user, session.session_key)
    update_session_rotation(session, new_refresh_token)
    record_audit_log(user.user_id, 'sessions', session.session_id, 'refresh_tokens', None, {'rotated': True})
    db.session.commit()

    return jsonify(auth_response_payload(user, access_token, new_refresh_token, session=session)), 200


@auth_bp.post('/logout')
@jwt_required(refresh=True)
def logout():
    user = current_user_from_jwt()
    if user is None:
        return jsonify({'message': 'User not found'}), 404

    session = get_current_session_from_jwt()
    if session is None:
        return jsonify({'message': 'Session not found'}), 404
    raw_refresh_token = request.headers.get('Authorization', '').split(' ', 1)[-1]

    if session is None:
        return jsonify({'message': 'Session not found'}), 404

    if session.refresh_token_hash and not verify_refresh_token(raw_refresh_token, session.refresh_token_hash):
        return jsonify({'message': 'Invalid session token'}), 401

    revoke_session(session)
    record_login_history(user.user_id, 'success', session_id=session.session_id)
    record_audit_log(user.user_id, 'sessions', session.session_id, 'logout', None, {'revoked': True})
    db.session.commit()

    return jsonify({'message': 'Logout successful'}), 200


@auth_bp.post('/verify-email')
def verify_email():
    data, error_response = parse_json_body(['token'])
    if error_response is not None:
        return error_response

    try:
        payload = verify_token(
            data['token'],
            'email-verification',
            current_app.config['EMAIL_VERIFICATION_TOKEN_MAX_AGE_MINUTES'],
        )
    except (BadSignature, SignatureExpired):
        return jsonify({'message': 'Invalid or expired verification token'}), 400

    user = User.query.get(payload['user_id'])
    if user is None:
        return jsonify({'message': 'User not found'}), 404

    if user.email_verified_at is None:
        user.email_verified_at = datetime.now(timezone.utc)
        record_audit_log(user.user_id, 'users', user.user_id, 'verify_email', None, {'email_verified_at': user.email_verified_at.isoformat()})
        db.session.commit()

    return jsonify({'message': 'Email verified successfully', 'user': user.to_dict()}), 200


@auth_bp.post('/resend-verification')
def resend_verification():
    data, error_response = parse_json_body(['email'])
    if error_response is not None:
        return error_response

    user = User.query.filter_by(email=normalize_email(data['email'])).first()
    if user is None:
        return jsonify({'message': 'If the account exists, a verification email will be sent'}), 200

    verification_token = make_verification_token(user)
    send_email('Verify your account', user.email, f'Use this token to verify your email:\n\n{verification_token}\n')
    record_security_event(user.user_id, 'verification_resent', 'Verification email was requested again', severity='low')
    db.session.commit()

    payload = {'message': 'If the account exists, a verification email will be sent'}
    if current_app.config.get('EXPOSE_SECURITY_TOKENS', True):
        payload['verification_token'] = verification_token
    return jsonify(payload), 200


@auth_bp.post('/forgot-password')
def forgot_password():
    data, error_response = parse_json_body(['email'])
    if error_response is not None:
        return error_response

    user = User.query.filter_by(email=normalize_email(data['email'])).first()
    if user is not None:
        reset_token = make_reset_token(user)
        send_email('Reset your password', user.email, f'Use this token to reset your password:\n\n{reset_token}\n')
        record_security_event(user.user_id, 'password_reset_requested', 'Password reset was requested', severity='medium')
        db.session.commit()

        payload = {'message': 'If the account exists, a password reset email will be sent'}
        if current_app.config.get('EXPOSE_SECURITY_TOKENS', True):
            payload['reset_token'] = reset_token
        return jsonify(payload), 200

    return jsonify({'message': 'If the account exists, a password reset email will be sent'}), 200


@auth_bp.post('/reset-password')
def reset_password():
    data, error_response = parse_json_body(['token', 'new_password'])
    if error_response is not None:
        return error_response

    try:
        payload = verify_token(
            data['token'],
            'password-reset',
            current_app.config['PASSWORD_RESET_TOKEN_MAX_AGE_MINUTES'],
        )
    except (BadSignature, SignatureExpired):
        return jsonify({'message': 'Invalid or expired reset token'}), 400

    user = User.query.get(payload['user_id'])
    if user is None:
        return jsonify({'message': 'User not found'}), 404

    user.set_password(data['new_password'])
    revoke_all_user_sessions(user.user_id)
    record_security_event(user.user_id, 'password_reset_completed', 'Password was reset successfully', severity='medium')
    record_audit_log(user.user_id, 'users', user.user_id, 'reset_password', None, {'password_reset': True})
    db.session.commit()

    return jsonify({'message': 'Password reset successfully'}), 200


@auth_bp.get('/me')
@jwt_required()
def me():
    user = current_user_from_jwt()
    if user is None:
        return jsonify({'message': 'User not found'}), 404
    return jsonify({'user': user.to_dict()}), 200


@auth_bp.post('/admin/users')
@role_required('Admin')
def admin_create_user():
    data, error_response = parse_json_body(['first_name', 'last_name', 'email', 'password', 'role'])
    if error_response is not None:
        return error_response

    role_name = data['role'].strip().title()
    if role_name not in {'Customer', 'Seller', 'Admin'}:
        return jsonify({'message': 'Invalid role supplied'}), 400

    try:
        user = create_user_account(data, role_name=role_name, verified=False)
        verification_token = make_verification_token(user)
        record_audit_log(None, 'users', user.user_id, 'admin_create_user', None, user.to_dict())
        db.session.commit()
    except ValueError as exc:
        db.session.rollback()
        return jsonify({'message': str(exc)}), 409

    response = {'message': 'User created successfully', 'user': user.to_dict()}
    if current_app.config.get('EXPOSE_SECURITY_TOKENS', True):
        response['verification_token'] = verification_token
    return jsonify(response), 201