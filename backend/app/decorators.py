from functools import wraps

from flask import jsonify
from flask_jwt_extended import get_jwt_identity, jwt_required

from app.models.auth import User


def role_required(*allowed_roles):
    normalized_roles = {role.lower() for role in allowed_roles}

    def decorator(view_function):
        @wraps(view_function)
        @jwt_required()
        def wrapped(*args, **kwargs):
            user = User.query.get(int(get_jwt_identity()))
            if user is None or user.role is None or user.role.role_name.lower() not in normalized_roles:
                return jsonify({'message': 'Insufficient permissions'}), 403
            return view_function(*args, **kwargs)

        return wrapped

    return decorator