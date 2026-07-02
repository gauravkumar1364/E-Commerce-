from datetime import datetime, timezone
from decimal import Decimal, InvalidOperation
from uuid import uuid4

from flask import current_app, request

from app.extensions import db
from app.models.auth import User
from app.models.commerce import Cart, CartItem, Order, OrderItem, Payment, Wishlist, WishlistItem
from app.models.product import Product


DEFAULT_TAX_RATE = Decimal('0.08')
DEFAULT_SHIPPING_AMOUNT = Decimal('0.00')


def parse_int(value, field_name, minimum=None, maximum=None):
    try:
        parsed = int(value)
    except (TypeError, ValueError):
        raise ValueError(f'{field_name} must be an integer')
    if minimum is not None and parsed < minimum:
        raise ValueError(f'{field_name} must be greater than or equal to {minimum}')
    if maximum is not None and parsed > maximum:
        raise ValueError(f'{field_name} must be less than or equal to {maximum}')
    return parsed


def parse_decimal(value, field_name, minimum=None):
    try:
        parsed = Decimal(str(value))
    except (InvalidOperation, TypeError, ValueError):
        raise ValueError(f'{field_name} must be a decimal number')
    if minimum is not None and parsed < Decimal(str(minimum)):
        raise ValueError(f'{field_name} must be greater than or equal to {minimum}')
    return parsed


def parse_boolean(value, field_name):
    if isinstance(value, bool):
        return value
    if isinstance(value, str):
        lowered = value.strip().lower()
        if lowered in {'true', '1', 'yes', 'y'}:
            return True
        if lowered in {'false', '0', 'no', 'n'}:
            return False
    raise ValueError(f'{field_name} must be a boolean value')


def normalize_string(value, field_name, minimum_length=1, maximum_length=None):
    normalized = str(value or '').strip()
    if len(normalized) < minimum_length:
        raise ValueError(f'{field_name} is required')
    if maximum_length is not None and len(normalized) > maximum_length:
        raise ValueError(f'{field_name} must be {maximum_length} characters or fewer')
    return normalized


def get_current_user():
    from app.services.auth_service import current_user_from_jwt

    return current_user_from_jwt()


def _require_current_user(user=None):
    current_user = user or get_current_user()
    if current_user is None:
        raise ValueError('Authenticated user is required')
    return current_user


def get_or_create_active_cart(user):
    cart = Cart.query.filter_by(user_id=user.user_id, cart_status='active').first()
    if cart is None:
        cart = Cart(user_id=user.user_id, cart_status='active')
        db.session.add(cart)
        db.session.flush()
    return cart


def get_or_create_wishlist(user):
    wishlist = Wishlist.query.filter_by(user_id=user.user_id).first()
    if wishlist is None:
        wishlist = Wishlist(user_id=user.user_id)
        db.session.add(wishlist)
        db.session.flush()
    return wishlist


def serialize_cart(cart):
    cart = Cart.query.get(cart.cart_id)
    return cart.to_dict() if cart else None


def serialize_wishlist(wishlist):
    wishlist = Wishlist.query.get(wishlist.wishlist_id)
    return wishlist.to_dict() if wishlist else None


def add_item_to_cart(user, product_id, quantity):
    current_user = _require_current_user(user)
    product = Product.query.get(product_id)
    if product is None or not product.is_active:
        raise ValueError('Product not found or unavailable')
    if product.stock_quantity < quantity:
        raise ValueError('Insufficient stock for this product')

    cart = get_or_create_active_cart(current_user)
    item = CartItem.query.filter_by(cart_id=cart.cart_id, product_id=product.product_id).first()
    if item is None:
        item = CartItem(cart_id=cart.cart_id, product_id=product.product_id, quantity=quantity, unit_price=product.price)
        db.session.add(item)
    else:
        item.quantity += quantity
        item.unit_price = product.price

    db.session.flush()
    return cart


def update_cart_item(user, cart_item_id, quantity):
    current_user = _require_current_user(user)
    item = CartItem.query.join(Cart).filter(CartItem.cart_item_id == cart_item_id, Cart.user_id == current_user.user_id, Cart.cart_status == 'active').first()
    if item is None:
        raise ValueError('Cart item not found')
    if item.product.stock_quantity < quantity:
        raise ValueError('Insufficient stock for this product')
    item.quantity = quantity
    db.session.flush()
    return item.cart


def remove_cart_item(user, cart_item_id):
    current_user = _require_current_user(user)
    item = CartItem.query.join(Cart).filter(CartItem.cart_item_id == cart_item_id, Cart.user_id == current_user.user_id, Cart.cart_status == 'active').first()
    if item is None:
        raise ValueError('Cart item not found')
    cart = item.cart
    db.session.delete(item)
    db.session.flush()
    return cart


def clear_cart(user):
    current_user = _require_current_user(user)
    cart = get_or_create_active_cart(current_user)
    for item in list(cart.items):
        db.session.delete(item)
    db.session.flush()
    return cart


def add_item_to_wishlist(user, product_id):
    current_user = _require_current_user(user)
    product = Product.query.get(product_id)
    if product is None or not product.is_active:
        raise ValueError('Product not found or unavailable')

    wishlist = get_or_create_wishlist(current_user)
    item = WishlistItem.query.filter_by(wishlist_id=wishlist.wishlist_id, product_id=product.product_id).first()
    if item is None:
        item = WishlistItem(wishlist_id=wishlist.wishlist_id, product_id=product.product_id)
        db.session.add(item)
        db.session.flush()
    return wishlist


def remove_item_from_wishlist(user, wishlist_item_id):
    current_user = _require_current_user(user)
    item = WishlistItem.query.join(Wishlist).filter(WishlistItem.wishlist_item_id == wishlist_item_id, Wishlist.user_id == current_user.user_id).first()
    if item is None:
        raise ValueError('Wishlist item not found')
    wishlist = item.wishlist
    db.session.delete(item)
    db.session.flush()
    return wishlist


def clear_wishlist(user):
    current_user = _require_current_user(user)
    wishlist = get_or_create_wishlist(current_user)
    for item in list(wishlist.items):
        db.session.delete(item)
    db.session.flush()
    return wishlist


def validate_shipping_address(payload):
    required_fields = ['shipping_name', 'shipping_address_line1', 'shipping_city', 'shipping_postal_code', 'shipping_country']
    cleaned = {}
    for field in required_fields:
        cleaned[field] = normalize_string(payload.get(field), field, maximum_length=255)

    optional_fields = {
        'shipping_address_line2': 255,
        'shipping_state': 100,
    }
    for field, maximum_length in optional_fields.items():
        if field in payload:
            value = payload.get(field)
            cleaned[field] = normalize_string(value, field, minimum_length=0, maximum_length=maximum_length) if value not in (None, '') else None
        else:
            cleaned[field] = None

    return cleaned


def validate_checkout_payload(payload):
    shipping = validate_shipping_address(payload)
    payment_method = normalize_string(payload.get('payment_method'), 'payment_method').lower()
    if payment_method not in {'card', 'wallet', 'bank_transfer', 'cod'}:
        raise ValueError('payment_method must be one of: card, wallet, bank_transfer, cod')

    payment_token = str(payload.get('payment_token', '')).strip()
    simulate_failure = parse_boolean(payload.get('simulate_failure', False), 'simulate_failure') if 'simulate_failure' in payload else False
    tax_rate = parse_decimal(payload.get('tax_rate', DEFAULT_TAX_RATE), 'tax_rate', minimum=0)
    shipping_amount = parse_decimal(payload.get('shipping_amount', DEFAULT_SHIPPING_AMOUNT), 'shipping_amount', minimum=0)
    discount_amount = parse_decimal(payload.get('discount_amount', 0), 'discount_amount', minimum=0)

    if payment_method != 'cod' and not payment_token:
        raise ValueError('payment_token is required for non-COD payments')

    return {
        'shipping': shipping,
        'payment_method': payment_method,
        'payment_token': payment_token,
        'simulate_failure': simulate_failure,
        'tax_rate': tax_rate,
        'shipping_amount': shipping_amount,
        'discount_amount': discount_amount,
        'currency_code': str(payload.get('currency_code', 'USD')).strip().upper() or 'USD',
    }


def calculate_order_totals(cart_items, tax_rate=DEFAULT_TAX_RATE, shipping_amount=DEFAULT_SHIPPING_AMOUNT, discount_amount=Decimal('0')):
    subtotal = sum((Decimal(str(item.unit_price)) * item.quantity for item in cart_items), Decimal('0'))
    tax_amount = (subtotal * tax_rate).quantize(Decimal('0.01'))
    total_amount = (subtotal + tax_amount + shipping_amount - discount_amount).quantize(Decimal('0.01'))
    if total_amount < 0:
        total_amount = Decimal('0.00')
    return {
        'subtotal': subtotal.quantize(Decimal('0.01')),
        'tax_amount': tax_amount,
        'shipping_amount': shipping_amount.quantize(Decimal('0.01')),
        'discount_amount': discount_amount.quantize(Decimal('0.01')),
        'total_amount': total_amount,
    }


def build_order_number():
    return f"ORD-{uuid4().hex[:12].upper()}"


def build_invoice_number():
    return f"INV-{uuid4().hex[:12].upper()}"


def build_tracking_number():
    return f"TRK-{uuid4().hex[:12].upper()}"


def fake_payment_gateway(order, payload):
    provider_name = 'FakePay'
    success = not payload['simulate_failure'] and payload['payment_token'].lower() not in {'fail', 'decline', 'failed'}
    transaction_reference = f"FP-{uuid4().hex[:16].upper()}"
    return {
        'provider_name': provider_name,
        'transaction_reference': transaction_reference,
        'payment_status': 'captured' if success else 'failed',
        'success': success,
        'response_message': 'Payment approved' if success else 'Payment declined by fake gateway',
    }


def create_checkout_order(user, payload):
    current_user = _require_current_user(user)
    cart = Cart.query.filter_by(user_id=current_user.user_id, cart_status='active').first()
    if cart is None or not cart.items:
        raise ValueError('Cart is empty')

    validated = validate_checkout_payload(payload)
    for item in cart.items:
        if item.product is None or not item.product.is_active:
            raise ValueError('One or more cart products are unavailable')
        if item.product.stock_quantity < item.quantity:
            raise ValueError(f'Insufficient stock for product {item.product.product_name}')

    totals = calculate_order_totals(
        cart.items,
        tax_rate=validated['tax_rate'],
        shipping_amount=validated['shipping_amount'],
        discount_amount=validated['discount_amount'],
    )

    order = Order(
        user_id=current_user.user_id,
        order_number=build_order_number(),
        order_status='pending',
        currency_code=validated['currency_code'],
        shipping_name=validated['shipping']['shipping_name'],
        shipping_address_line1=validated['shipping']['shipping_address_line1'],
        shipping_address_line2=validated['shipping']['shipping_address_line2'],
        shipping_city=validated['shipping']['shipping_city'],
        shipping_state=validated['shipping']['shipping_state'],
        shipping_postal_code=validated['shipping']['shipping_postal_code'],
        shipping_country=validated['shipping']['shipping_country'],
        subtotal=totals['subtotal'],
        tax_amount=totals['tax_amount'],
        shipping_amount=totals['shipping_amount'],
        discount_amount=totals['discount_amount'],
        total_amount=totals['total_amount'],
        tracking_number=build_tracking_number(),
        carrier_name=payload.get('carrier_name') or 'FakeShip',
        tracking_url=payload.get('tracking_url') or None,
        invoice_number=build_invoice_number(),
        invoice_issued_at=datetime.now(timezone.utc),
    )
    db.session.add(order)
    db.session.flush()

    for cart_item in cart.items:
        order_item = OrderItem(
            order_id=order.order_id,
            product_id=cart_item.product_id,
            quantity=cart_item.quantity,
            unit_price=cart_item.unit_price,
            line_total=(Decimal(str(cart_item.unit_price)) * cart_item.quantity).quantize(Decimal('0.01')),
        )
        db.session.add(order_item)
        cart_item.product.stock_quantity -= cart_item.quantity

    payment_result = fake_payment_gateway(order, validated)
    payment = Payment(
        order_id=order.order_id,
        payer_user_id=current_user.user_id,
        payment_method=validated['payment_method'],
        payment_status=payment_result['payment_status'],
        amount=totals['total_amount'],
        currency_code=validated['currency_code'],
        transaction_reference=payment_result['transaction_reference'],
        provider_name=payment_result['provider_name'],
        paid_at=datetime.now(timezone.utc) if payment_result['success'] else None,
    )
    db.session.add(payment)

    if payment_result['success']:
        order.order_status = 'paid'
        cart.cart_status = 'converted'
    else:
        order.order_status = 'pending'

    for cart_item in list(cart.items):
        db.session.delete(cart_item)

    db.session.flush()

    return order, payment, payment_result


def list_user_orders(user):
    current_user = _require_current_user(user)
    return Order.query.filter_by(user_id=current_user.user_id).order_by(Order.created_at.desc()).all()


def get_user_order(user, order_id):
    current_user = _require_current_user(user)
    order = Order.query.filter_by(order_id=order_id, user_id=current_user.user_id).first()
    if order is None:
        raise ValueError('Order not found')
    return order


def build_invoice(order):
    if order.invoice_number is None:
        order.invoice_number = build_invoice_number()
    if order.invoice_issued_at is None:
        order.invoice_issued_at = datetime.now(timezone.utc)

    invoice = {
        'invoice_number': order.invoice_number,
        'invoice_issued_at': order.invoice_issued_at.isoformat() if order.invoice_issued_at else None,
        'order': order.to_dict(),
        'bill_to': {
            'name': order.shipping_name,
            'address_line1': order.shipping_address_line1,
            'address_line2': order.shipping_address_line2,
            'city': order.shipping_city,
            'state': order.shipping_state,
            'postal_code': order.shipping_postal_code,
            'country': order.shipping_country,
        },
        'line_items': [
            {
                'product_name': item.product.product_name if item.product else None,
                'sku': item.product.sku if item.product else None,
                'quantity': item.quantity,
                'unit_price': float(item.unit_price),
                'line_total': float(item.line_total),
            }
            for item in order.items
        ],
        'totals': {
            'subtotal': float(order.subtotal),
            'tax_amount': float(order.tax_amount),
            'shipping_amount': float(order.shipping_amount),
            'discount_amount': float(order.discount_amount),
            'total_amount': float(order.total_amount),
            'currency_code': order.currency_code,
        },
    }
    return invoice


def invoice_as_text(invoice):
    lines = [
        f"Invoice: {invoice['invoice_number']}",
        f"Issued: {invoice['invoice_issued_at']}",
        f"Order: {invoice['order']['order_number']}",
        '',
        'Bill To:',
        f"{invoice['bill_to']['name']}",
        f"{invoice['bill_to']['address_line1']}",
    ]
    if invoice['bill_to']['address_line2']:
        lines.append(invoice['bill_to']['address_line2'])
    lines.extend([
        f"{invoice['bill_to']['city']}, {invoice['bill_to']['state'] or ''} {invoice['bill_to']['postal_code']}",
        f"{invoice['bill_to']['country']}",
        '',
        'Items:',
    ])
    for item in invoice['line_items']:
        lines.append(f"- {item['product_name']} ({item['sku']}) x{item['quantity']} = {item['line_total']}")
    lines.extend([
        '',
        f"Subtotal: {invoice['totals']['subtotal']}",
        f"Tax: {invoice['totals']['tax_amount']}",
        f"Shipping: {invoice['totals']['shipping_amount']}",
        f"Discount: {invoice['totals']['discount_amount']}",
        f"Total: {invoice['totals']['total_amount']} {invoice['totals']['currency_code']}",
    ])
    return '\n'.join(lines)