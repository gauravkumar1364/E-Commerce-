from flask import Blueprint, jsonify, request
from sqlalchemy import func

from app.extensions import db
from app.models.auth import User
from app.models.commerce import Order
from app.models.product import Category, Product

storefront_bp = Blueprint('storefront', __name__, url_prefix='/api/storefront')


@storefront_bp.get('/stats')
def storefront_stats():
    """Live site-wide statistics pulled from MySQL for the homepage trust metrics."""
    total_products = db.session.query(func.count(Product.product_id)).filter(Product.is_active.is_(True)).scalar() or 0
    total_categories = db.session.query(func.count(Category.category_id)).filter(Category.is_active.is_(True)).scalar() or 0
    total_orders = db.session.query(func.count(Order.order_id)).scalar() or 0
    total_customers = db.session.query(func.count(User.user_id)).scalar() or 0

    return jsonify({
        'total_products': total_products,
        'total_categories': total_categories,
        'total_orders': total_orders,
        'total_customers': total_customers,
    }), 200


@storefront_bp.get('/featured')
def storefront_featured():
    """Return the 4 newest active products for the Featured section."""
    limit = min(int(request.args.get('limit', 4)), 12)
    products = (
        Product.query
        .filter(Product.is_active.is_(True))
        .order_by(Product.created_at.desc())
        .limit(limit)
        .all()
    )
    return jsonify({'products': [p.to_dict() for p in products]}), 200


@storefront_bp.get('/trending')
def storefront_trending():
    """Return products sorted by stock_quantity desc as a proxy for popularity."""
    limit = min(int(request.args.get('limit', 4)), 12)
    products = (
        Product.query
        .filter(Product.is_active.is_(True), Product.stock_quantity > 0)
        .order_by(Product.stock_quantity.desc())
        .limit(limit)
        .all()
    )
    return jsonify({'products': [p.to_dict() for p in products]}), 200


@storefront_bp.get('/deals')
def storefront_deals():
    """Return active in-stock products for the Deals page."""
    limit = min(int(request.args.get('limit', 8)), 20)
    products = (
        Product.query
        .filter(Product.is_active.is_(True), Product.stock_quantity > 0)
        .order_by(Product.price.asc())
        .limit(limit)
        .all()
    )
    return jsonify({'products': [p.to_dict() for p in products]}), 200


@storefront_bp.get('/admin-stats')
def admin_stats():
    """Aggregated admin dashboard metrics."""
    from app.models.auth import LoginHistory, SecurityEvent
    from app.models.forensics import FraudDetection

    total_customers = db.session.query(func.count(User.user_id)).scalar() or 0
    total_orders = db.session.query(func.count(Order.order_id)).scalar() or 0
    total_products = db.session.query(func.count(Product.product_id)).filter(Product.is_active.is_(True)).scalar() or 0
    total_revenue = db.session.query(func.sum(Order.total_amount)).scalar() or 0
    login_attempts = db.session.query(func.count(LoginHistory.login_history_id)).scalar() or 0
    security_alerts = db.session.query(func.count(SecurityEvent.security_event_id)).filter(
        SecurityEvent.event_status == 'open'
    ).scalar() or 0

    fraud_alerts = 0
    try:
        fraud_alerts = db.session.query(func.count(FraudDetection.fraud_detection_id)).filter(
            FraudDetection.detection_status == 'review'
        ).scalar() or 0
    except Exception:
        pass

    return jsonify({
        'total_customers': total_customers,
        'total_orders': total_orders,
        'total_products': total_products,
        'total_revenue': float(total_revenue),
        'login_attempts': login_attempts,
        'security_alerts': security_alerts,
        'fraud_alerts': fraud_alerts,
    }), 200


@storefront_bp.get('/seller-stats')
def seller_stats():
    """Aggregated seller dashboard metrics."""
    total_products = db.session.query(func.count(Product.product_id)).filter(Product.is_active.is_(True)).scalar() or 0
    low_stock = db.session.query(func.count(Product.product_id)).filter(
        Product.is_active.is_(True), Product.stock_quantity < 20
    ).scalar() or 0
    total_orders = db.session.query(func.count(Order.order_id)).scalar() or 0
    pending_orders = db.session.query(func.count(Order.order_id)).filter(
        Order.order_status.in_(['pending', 'paid', 'processing'])
    ).scalar() or 0
    fulfilled_orders = db.session.query(func.count(Order.order_id)).filter(
        Order.order_status.in_(['completed', 'shipped'])
    ).scalar() or 0
    revenue = db.session.query(func.sum(Order.total_amount)).scalar() or 0

    return jsonify({
        'total_products': total_products,
        'low_stock': low_stock,
        'total_orders': total_orders,
        'pending_orders': pending_orders,
        'fulfilled_orders': fulfilled_orders,
        'revenue': float(revenue),
    }), 200
