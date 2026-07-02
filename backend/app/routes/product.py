from flask import Blueprint, jsonify, request
from sqlalchemy.exc import IntegrityError

from app.decorators import role_required
from app.extensions import db
from app.models.product import Category, Product
from app.services.product_service import (
    build_pagination_response,
    build_product_query,
    create_product,
    normalize_slug,
    paginate_query,
    parse_int,
    update_product,
    validate_category_payload,
)

product_bp = Blueprint('product', __name__, url_prefix='/products')
category_bp = Blueprint('category', __name__, url_prefix='/categories')


def parse_json_body(required_fields=None):
    data = request.get_json(silent=True) or {}
    required_fields = required_fields or []
    missing = [field for field in required_fields if not data.get(field)]
    if missing:
        return None, (jsonify({'message': f"Missing required fields: {', '.join(missing)}"}), 400)
    return data, None


def get_product_or_404(product_id):
    product = Product.query.get(product_id)
    if product is None:
        return None, (jsonify({'message': 'Product not found'}), 404)
    return product, None


def get_category_or_404(category_id):
    category = Category.query.get(category_id)
    if category is None:
        return None, (jsonify({'message': 'Category not found'}), 404)
    return category, None


@product_bp.get('/')
def list_products():
    try:
        query = build_product_query(request.args)
        page = parse_int(request.args.get('page', 1), 'page', minimum=1)
        per_page = parse_int(request.args.get('per_page', 10), 'per_page', minimum=1, maximum=100)
    except ValueError as exc:
        return jsonify({'message': str(exc)}), 400

    response = build_pagination_response(query, page, per_page)
    return jsonify(response), 200


@product_bp.get('/<int:product_id>')
def get_product(product_id):
    product = Product.query.get(product_id)
    if product is None:
        return jsonify({'message': 'Product not found'}), 404
    return jsonify({'product': product.to_dict()}), 200


@product_bp.post('/')
@role_required('Seller', 'Admin')
def add_product():
    data, error_response = parse_json_body(['sku', 'product_name', 'price'])
    if error_response is not None:
        return error_response

    try:
        product = create_product(data)
        db.session.commit()
        return jsonify({'message': 'Product created successfully', 'product': product.to_dict()}), 201
    except ValueError as exc:
        db.session.rollback()
        return jsonify({'message': str(exc)}), 400
    except IntegrityError:
        db.session.rollback()
        return jsonify({'message': 'Product SKU or category relationship already exists'}), 409


@product_bp.put('/<int:product_id>')
@product_bp.patch('/<int:product_id>')
@role_required('Seller', 'Admin')
def edit_product(product_id):
    product, error_response = get_product_or_404(product_id)
    if error_response is not None:
        return error_response

    data, _ = parse_json_body()
    if not data:
        return jsonify({'message': 'At least one field is required for update'}), 400

    try:
        update_product(product, data)
        db.session.commit()
        return jsonify({'message': 'Product updated successfully', 'product': product.to_dict()}), 200
    except ValueError as exc:
        db.session.rollback()
        return jsonify({'message': str(exc)}), 400
    except IntegrityError:
        db.session.rollback()
        return jsonify({'message': 'Update failed because of a database constraint'}), 409


@product_bp.delete('/<int:product_id>')
@role_required('Seller', 'Admin')
def delete_product(product_id):
    product, error_response = get_product_or_404(product_id)
    if error_response is not None:
        return error_response

    try:
        db.session.delete(product)
        db.session.commit()
        return jsonify({'message': 'Product deleted successfully'}), 200
    except IntegrityError:
        db.session.rollback()
        return jsonify({'message': 'Product cannot be deleted because it is referenced by existing records'}), 409


@category_bp.get('/')
def list_categories():
    include_inactive = request.args.get('include_inactive', 'false')
    try:
        include_inactive = str(include_inactive).strip().lower() in {'true', '1', 'yes', 'y'}
    except ValueError:
        return jsonify({'message': 'include_inactive must be boolean'}), 400

    query = Category.query
    if not include_inactive:
        query = query.filter(Category.is_active.is_(True))

    categories = query.order_by(Category.category_name.asc()).all()
    return jsonify({'categories': [category.to_dict() for category in categories]}), 200


@category_bp.get('/<int:category_id>')
def get_category(category_id):
    category = Category.query.get(category_id)
    if category is None:
        return jsonify({'message': 'Category not found'}), 404
    return jsonify({'category': category.to_dict()}), 200


@category_bp.post('/')
@role_required('Admin')
def add_category():
    data, error_response = parse_json_body(['category_name'])
    if error_response is not None:
        return error_response

    try:
        cleaned = validate_category_payload(data)
        if 'slug' not in cleaned:
            cleaned['slug'] = normalize_slug(cleaned['category_name'])
        category = Category(**cleaned)
        db.session.add(category)
        db.session.commit()
        return jsonify({'message': 'Category created successfully', 'category': category.to_dict()}), 201
    except ValueError as exc:
        db.session.rollback()
        return jsonify({'message': str(exc)}), 400
    except IntegrityError:
        db.session.rollback()
        return jsonify({'message': 'Category slug already exists'}), 409
