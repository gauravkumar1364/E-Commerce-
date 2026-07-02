from flask import Blueprint, g, jsonify, request
from flask_jwt_extended import jwt_required

from app.security import validate_upload_file
from app.services.auth_service import current_user_from_jwt
from app.security import build_csrf_token

security_bp = Blueprint('security', __name__, url_prefix='/security')


@security_bp.get('/csrf-token')
@jwt_required(optional=True)
def csrf_token():
    user = current_user_from_jwt()
    if user is None:
        return jsonify({'message': 'Authentication is required'}), 401

    session = getattr(g, 'current_auth_session', None)
    if session is None:
        return jsonify({'message': 'Session is required'}), 401

    return jsonify({'csrf_token': build_csrf_token(session.session_key, user.user_id)}), 200


@security_bp.post('/uploads/validate')
@jwt_required()
def validate_upload():
    file_storage = request.files.get('file')
    try:
        metadata = validate_upload_file(file_storage)
        return jsonify({'message': 'File is valid for upload', 'file': metadata}), 200
    except ValueError as exc:
        return jsonify({'message': str(exc)}), 400