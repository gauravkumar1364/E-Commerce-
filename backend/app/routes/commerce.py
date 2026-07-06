from flask import Blueprint, jsonify, request, Response
from flask_jwt_extended import jwt_required
from sqlalchemy.exc import IntegrityError

from app.decorators import role_required
from app.extensions import db
from app.models.commerce import Cart, CartItem, Order, Payment, Wishlist, WishlistItem
from app.services.forensics_service import collect_evidence, detect_fraud, log_transaction, record_security_event
from app.services.commerce_service import (
    add_item_to_cart,
    add_item_to_wishlist,
    build_invoice,
    clear_cart,
    clear_wishlist,
    create_checkout_order,
    get_current_user,
    get_user_order,
    get_or_create_active_cart,
    get_or_create_wishlist,
    invoice_as_text,
    list_user_orders,
    remove_cart_item,
    remove_item_from_wishlist,
    serialize_cart,
    serialize_wishlist,
    update_cart_item,
    parse_int,
)

commerce_bp = Blueprint('commerce', __name__)


def parse_json_body(required_fields=None):
    data = request.get_json(silent=True) or {}
    required_fields = required_fields or []
    missing = [field for field in required_fields if not data.get(field)]
    if missing:
        return None, (jsonify({'message': f"Missing required fields: {', '.join(missing)}"}), 400)
    return data, None


def current_user_or_error():
    user = get_current_user()
    if user is None:
        return None, (jsonify({'message': 'Authenticated user is required'}), 401)
    return user, None


@commerce_bp.get('/cart')
@jwt_required()
def view_cart():
    user, error_response = current_user_or_error()
    if error_response is not None:
        return error_response
    cart = get_or_create_active_cart(user)
    return jsonify({'cart': serialize_cart(cart)}), 200


@commerce_bp.post('/cart/items')
@jwt_required()
def add_cart_item():
    user, error_response = current_user_or_error()
    if error_response is not None:
        return error_response
    data, error_response = parse_json_body(['product_id', 'quantity'])
    if error_response is not None:
        return error_response

    try:
        cart = add_item_to_cart(user, parse_int(data['product_id'], 'product_id', minimum=1), parse_int(data['quantity'], 'quantity', minimum=1, maximum=9999))
        from app.extensions import db

        db.session.commit()
        return jsonify({'message': 'Item added to cart', 'cart': serialize_cart(cart)}), 201
    except ValueError as exc:
        from app.extensions import db

        db.session.rollback()
        return jsonify({'message': str(exc)}), 400
    except IntegrityError:
        from app.extensions import db

        db.session.rollback()
        return jsonify({'message': 'Could not add item to cart'}), 409


@commerce_bp.patch('/cart/items/<int:cart_item_id>')
@jwt_required()
def update_cart_item_route(cart_item_id):
    user, error_response = current_user_or_error()
    if error_response is not None:
        return error_response
    data, error_response = parse_json_body(['quantity'])
    if error_response is not None:
        return error_response

    try:
        cart = update_cart_item(user, cart_item_id, parse_int(data['quantity'], 'quantity', minimum=1, maximum=9999))
        from app.extensions import db

        db.session.commit()
        return jsonify({'message': 'Cart item updated', 'cart': serialize_cart(cart)}), 200
    except ValueError as exc:
        from app.extensions import db

        db.session.rollback()
        return jsonify({'message': str(exc)}), 400


@commerce_bp.delete('/cart/items/<int:cart_item_id>')
@jwt_required()
def delete_cart_item(cart_item_id):
    user, error_response = current_user_or_error()
    if error_response is not None:
        return error_response

    try:
        cart = remove_cart_item(user, cart_item_id)
        from app.extensions import db

        db.session.commit()
        return jsonify({'message': 'Cart item removed', 'cart': serialize_cart(cart)}), 200
    except ValueError as exc:
        from app.extensions import db

        db.session.rollback()
        return jsonify({'message': str(exc)}), 400


@commerce_bp.delete('/cart')
@jwt_required()
def clear_cart_route():
    user, error_response = current_user_or_error()
    if error_response is not None:
        return error_response
    try:
        cart = clear_cart(user)
        from app.extensions import db

        db.session.commit()
        return jsonify({'message': 'Cart cleared', 'cart': serialize_cart(cart)}), 200
    except ValueError as exc:
        from app.extensions import db

        db.session.rollback()
        return jsonify({'message': str(exc)}), 400


@commerce_bp.get('/wishlist')
@jwt_required()
def view_wishlist():
    user, error_response = current_user_or_error()
    if error_response is not None:
        return error_response
    wishlist = get_or_create_wishlist(user)
    return jsonify({'wishlist': serialize_wishlist(wishlist)}), 200


@commerce_bp.post('/wishlist/items')
@jwt_required()
def add_wishlist_item():
    user, error_response = current_user_or_error()
    if error_response is not None:
        return error_response
    data, error_response = parse_json_body(['product_id'])
    if error_response is not None:
        return error_response

    try:
        wishlist = add_item_to_wishlist(user, parse_int(data['product_id'], 'product_id', minimum=1))
        from app.extensions import db

        db.session.commit()
        return jsonify({'message': 'Item added to wishlist', 'wishlist': serialize_wishlist(wishlist)}), 201
    except ValueError as exc:
        from app.extensions import db

        db.session.rollback()
        return jsonify({'message': str(exc)}), 400
    except IntegrityError:
        from app.extensions import db

        db.session.rollback()
        return jsonify({'message': 'Could not add item to wishlist'}), 409


@commerce_bp.delete('/wishlist/items/<int:wishlist_item_id>')
@jwt_required()
def delete_wishlist_item(wishlist_item_id):
    user, error_response = current_user_or_error()
    if error_response is not None:
        return error_response

    try:
        wishlist = remove_item_from_wishlist(user, wishlist_item_id)
        from app.extensions import db

        db.session.commit()
        return jsonify({'message': 'Wishlist item removed', 'wishlist': serialize_wishlist(wishlist)}), 200
    except ValueError as exc:
        from app.extensions import db

        db.session.rollback()
        return jsonify({'message': str(exc)}), 400


@commerce_bp.delete('/wishlist')
@jwt_required()
def clear_wishlist_route():
    user, error_response = current_user_or_error()
    if error_response is not None:
        return error_response
    try:
        wishlist = clear_wishlist(user)
        from app.extensions import db

        db.session.commit()
        return jsonify({'message': 'Wishlist cleared', 'wishlist': serialize_wishlist(wishlist)}), 200
    except ValueError as exc:
        from app.extensions import db

        db.session.rollback()
        return jsonify({'message': str(exc)}), 400


@commerce_bp.post('/checkout')
@jwt_required()
def checkout():
    user, error_response = current_user_or_error()
    if error_response is not None:
        return error_response
    data, _ = parse_json_body()

    try:
        order, payment, payment_result = create_checkout_order(user, data)
        fraud = detect_fraud(
            user.user_id,
            order_id=order.order_id,
            payment_id=payment.payment_id,
            amount=order.total_amount,
            currency_code=order.currency_code,
            payment_method=data.get('payment_method'),
            payment_status=payment_result.get('payment_status'),
            payload=data,
        )
        log_transaction(
            user.user_id,
            order.order_id,
            payment.payment_id,
            'checkout',
            payment_result.get('payment_status', 'pending'),
            order.total_amount,
            order.currency_code,
            payment_result.get('transaction_reference'),
            risk_score=fraud.risk_score,
            metadata={'gateway': payment_result.get('provider_name')},
        )
        if fraud.risk_score >= 50:
            record_security_event(
                user.user_id,
                None,
                'fraud_detected',
                'Checkout was flagged by heuristic fraud detection',
                severity='high',
                metadata={'order_id': order.order_id, 'risk_score': fraud.risk_score, 'reasons': fraud.reasons},
            )
            collect_evidence(user.user_id, None, 'order', order.order_id, 'checkout_payload', payload=data, notes='Flagged by fraud detection')
        from app.extensions import db

        db.session.commit()
        return jsonify({'message': 'Checkout completed', 'payment': payment_result, 'order': order.to_dict()}), 201
    except ValueError as exc:
        from app.extensions import db

        db.session.rollback()
        return jsonify({'message': str(exc)}), 400
    except IntegrityError:
        from app.extensions import db

        db.session.rollback()
        return jsonify({'message': 'Checkout failed due to a database constraint'}), 409


@commerce_bp.post('/payments/fake-gateway')
def fake_gateway_only():
    data, error_response = parse_json_body(['amount', 'payment_method', 'payment_token'])
    if error_response is not None:
        return error_response

    try:
        amount = parse_int(data.get('amount'), 'amount', minimum=1)
        payment_method = str(data.get('payment_method', '')).strip().lower()
        if payment_method not in {'card', 'wallet', 'bank_transfer', 'cod'}:
            raise ValueError('payment_method must be one of: card, wallet, bank_transfer, cod')
        token = str(data.get('payment_token', '')).strip()
        success = token.lower() not in {'fail', 'decline', 'failed'} and not parse_int(data.get('simulate_failure', 0), 'simulate_failure', minimum=0, maximum=1)
        response = {
            'provider_name': 'FakePay',
            'payment_status': 'captured' if success else 'failed',
            'transaction_reference': f"FP-{amount}-{token[:8].upper()}",
            'message': 'Payment approved' if success else 'Payment declined by fake gateway',
        }
        return jsonify(response), 200
    except ValueError as exc:
        return jsonify({'message': str(exc)}), 400


@commerce_bp.get('/orders')
@jwt_required()
def order_history():
    user, error_response = current_user_or_error()
    if error_response is not None:
        return error_response
    orders = list_user_orders(user)
    return jsonify({'orders': [order.to_dict() for order in orders]}), 200


@commerce_bp.get('/orders/<int:order_id>')
@jwt_required()
def order_detail(order_id):
    user, error_response = current_user_or_error()
    if error_response is not None:
        return error_response
    try:
        order = get_user_order(user, order_id)
        return jsonify({'order': order.to_dict()}), 200
    except ValueError as exc:
        return jsonify({'message': str(exc)}), 404


@commerce_bp.get('/orders/<int:order_id>/tracking')
@jwt_required()
def order_tracking(order_id):
    user, error_response = current_user_or_error()
    if error_response is not None:
        return error_response
    try:
        order = get_user_order(user, order_id)
        return jsonify(
            {
                'order_id': order.order_id,
                'order_number': order.order_number,
                'order_status': order.order_status,
                'tracking_number': order.tracking_number,
                'carrier_name': order.carrier_name,
                'tracking_url': order.tracking_url,
                'shipped_at': order.shipped_at.isoformat() if order.shipped_at else None,
                'delivered_at': order.delivered_at.isoformat() if order.delivered_at else None,
            }
        ), 200
    except ValueError as exc:
        return jsonify({'message': str(exc)}), 404


@commerce_bp.get('/orders/<int:order_id>/invoice')
@jwt_required()
def order_invoice(order_id):
    user, error_response = current_user_or_error()
    if error_response is not None:
        return error_response
    try:
        order = get_user_order(user, order_id)
        invoice = build_invoice(order)
        from app.extensions import db

        db.session.commit()
        if request.args.get('format', '').lower() == 'text':
            return Response(invoice_as_text(invoice), mimetype='text/plain'), 200
        return jsonify({'invoice': invoice}), 200
    except ValueError as exc:
        from app.extensions import db

        db.session.rollback()
        return jsonify({'message': str(exc)}), 404
