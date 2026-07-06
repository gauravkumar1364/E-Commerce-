from datetime import datetime, timezone

from flask import Flask, jsonify, request, g
from flask_cors import CORS
from flask_jwt_extended import get_jwt, verify_jwt_in_request

from app.extensions import db, jwt
from app.services.forensics_service import collect_evidence, log_audit_action
from app.security import enforce_csrf_if_required, rate_limit_request, secure_headers, verify_active_session


def _register_jwt_callbacks():
    @jwt.token_in_blocklist_loader
    def is_token_revoked(_jwt_header, jwt_payload):
        from app.models.auth import AuthSession

        if jwt_payload.get('type') != 'refresh':
            return False

        session = AuthSession.query.filter_by(jwt_jti=jwt_payload.get('jti')).first()
        return session is None or session.revoked_at is not None

    @jwt.expired_token_loader
    def expired_token_callback(_jwt_header, _jwt_payload):
        return jsonify({'message': 'Token has expired'}), 401

    @jwt.invalid_token_loader
    def invalid_token_callback(reason):
        return jsonify({'message': 'Invalid token', 'reason': reason}), 422

    @jwt.unauthorized_loader
    def unauthorized_callback(reason):
        return jsonify({'message': 'Missing authorization token', 'reason': reason}), 401

    @jwt.revoked_token_loader
    def revoked_token_callback(_jwt_header, _jwt_payload):
        return jsonify({'message': 'Token has been revoked'}), 401


def create_app():
    app = Flask(__name__)
    app.config.from_object('app.config.Config')

    CORS(app)
    db.init_app(app)
    jwt.init_app(app)
    _register_jwt_callbacks()

    @app.before_request
    def apply_security_controls():
        rate_limit_response = rate_limit_request()
        if rate_limit_response is not None:
            return rate_limit_response

        csrf_response = enforce_csrf_if_required()
        if csrf_response is not None:
            return csrf_response

        session_response = verify_active_session()
        if session_response is not None:
            return session_response

    @app.after_request
    def apply_security_headers(response):
        try:
            if request.method != 'OPTIONS' and request.endpoint:
                user_id = None
                session_id = None

                try:
                    verify_jwt_in_request(optional=True)
                    jwt_payload = get_jwt()
                    if jwt_payload.get('sub'):
                        user_id = int(jwt_payload['sub'])
                except Exception:
                    jwt_payload = None

                current_session = getattr(g, 'current_auth_session', None)
                if current_session is not None:
                    session_id = current_session.session_id

                action_type = f'{request.method} {request.path}'
                log_audit_action(user_id, session_id, request.endpoint, None, action_type)

                if request.method in {'POST', 'PUT', 'PATCH', 'DELETE'} and request.is_json:
                    payload = request.get_json(silent=True)
                    if payload:
                        collect_evidence(user_id, session_id, request.endpoint, None, 'request_body', payload=payload)

                db.session.commit()
        except Exception:
            db.session.rollback()

        return secure_headers(response)

    @app.teardown_request
    def commit_or_cleanup(_exception):
        if _exception is not None:
            db.session.rollback()

    from app.routes import auth_bp, category_bp, commerce_bp, forensics_bp, product_bp
    from app.routes.security import security_bp
    from app.routes.storefront import storefront_bp

    app.register_blueprint(auth_bp)
    app.register_blueprint(product_bp)
    app.register_blueprint(category_bp)
    app.register_blueprint(commerce_bp)
    app.register_blueprint(forensics_bp)
    app.register_blueprint(security_bp)
    app.register_blueprint(storefront_bp)
    return app