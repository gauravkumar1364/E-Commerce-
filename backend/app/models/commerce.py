from datetime import datetime

from app.extensions import db


class TimestampMixin:
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    updated_at = db.Column(
        db.DateTime,
        nullable=False,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
    )


class Cart(TimestampMixin, db.Model):
    __tablename__ = 'carts'

    cart_id = db.Column(db.BigInteger, primary_key=True)
    user_id = db.Column(db.BigInteger, db.ForeignKey('users.user_id'), nullable=False)
    cart_status = db.Column(
        db.Enum('active', 'converted', 'abandoned', name='cart_status_enum'),
        nullable=False,
        default='active',
    )

    user = db.relationship('User', lazy='joined')
    items = db.relationship('CartItem', cascade='all, delete-orphan', lazy='selectin', backref='cart')

    def to_dict(self):
        return {
            'cart_id': self.cart_id,
            'user_id': self.user_id,
            'cart_status': self.cart_status,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
            'items': [item.to_dict() for item in self.items],
        }


class CartItem(TimestampMixin, db.Model):
    __tablename__ = 'cart_items'

    cart_item_id = db.Column(db.BigInteger, primary_key=True)
    cart_id = db.Column(db.BigInteger, db.ForeignKey('carts.cart_id', ondelete='CASCADE'), nullable=False)
    product_id = db.Column(db.BigInteger, db.ForeignKey('products.product_id', ondelete='RESTRICT'), nullable=False)
    quantity = db.Column(db.Integer, nullable=False, default=1)
    unit_price = db.Column(db.Numeric(12, 2), nullable=False)

    product = db.relationship('Product', lazy='joined')

    def to_dict(self):
        return {
            'cart_item_id': self.cart_item_id,
            'product_id': self.product_id,
            'quantity': self.quantity,
            'unit_price': float(self.unit_price),
            'line_total': float(self.unit_price * self.quantity),
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
            'product': self.product.to_dict() if self.product else None,
        }


class Wishlist(TimestampMixin, db.Model):
    __tablename__ = 'wishlists'

    wishlist_id = db.Column(db.BigInteger, primary_key=True)
    user_id = db.Column(db.BigInteger, db.ForeignKey('users.user_id'), nullable=False)
    wishlist_name = db.Column(db.String(150), nullable=False, default='My Wishlist')

    user = db.relationship('User', lazy='joined')
    items = db.relationship('WishlistItem', cascade='all, delete-orphan', lazy='selectin', backref='wishlist')

    def to_dict(self):
        return {
            'wishlist_id': self.wishlist_id,
            'user_id': self.user_id,
            'wishlist_name': self.wishlist_name,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
            'items': [item.to_dict() for item in self.items],
        }


class WishlistItem(TimestampMixin, db.Model):
    __tablename__ = 'wishlist_items'

    wishlist_item_id = db.Column(db.BigInteger, primary_key=True)
    wishlist_id = db.Column(db.BigInteger, db.ForeignKey('wishlists.wishlist_id', ondelete='CASCADE'), nullable=False)
    product_id = db.Column(db.BigInteger, db.ForeignKey('products.product_id', ondelete='RESTRICT'), nullable=False)

    product = db.relationship('Product', lazy='joined')

    def to_dict(self):
        return {
            'wishlist_item_id': self.wishlist_item_id,
            'product_id': self.product_id,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'product': self.product.to_dict() if self.product else None,
        }


class Order(TimestampMixin, db.Model):
    __tablename__ = 'orders'

    order_id = db.Column(db.BigInteger, primary_key=True)
    user_id = db.Column(db.BigInteger, db.ForeignKey('users.user_id'), nullable=False)
    order_number = db.Column(db.String(40), nullable=False, unique=True, index=True)
    order_status = db.Column(
        db.Enum('pending', 'paid', 'processing', 'shipped', 'completed', 'cancelled', 'refunded', name='order_status_enum'),
        nullable=False,
        default='pending',
    )
    subtotal = db.Column(db.Numeric(12, 2), nullable=False, default=0)
    tax_amount = db.Column(db.Numeric(12, 2), nullable=False, default=0)
    shipping_amount = db.Column(db.Numeric(12, 2), nullable=False, default=0)
    discount_amount = db.Column(db.Numeric(12, 2), nullable=False, default=0)
    total_amount = db.Column(db.Numeric(12, 2), nullable=False, default=0)
    currency_code = db.Column(db.String(3), nullable=False, default='USD')
    shipping_name = db.Column(db.String(200), nullable=False)
    shipping_address_line1 = db.Column(db.String(255), nullable=False)
    shipping_address_line2 = db.Column(db.String(255), nullable=True)
    shipping_city = db.Column(db.String(100), nullable=False)
    shipping_state = db.Column(db.String(100), nullable=True)
    shipping_postal_code = db.Column(db.String(20), nullable=False)
    shipping_country = db.Column(db.String(100), nullable=False)
    tracking_number = db.Column(db.String(100), nullable=True, unique=True)
    carrier_name = db.Column(db.String(100), nullable=True)
    tracking_url = db.Column(db.String(500), nullable=True)
    shipped_at = db.Column(db.DateTime, nullable=True)
    delivered_at = db.Column(db.DateTime, nullable=True)
    invoice_number = db.Column(db.String(40), nullable=True, unique=True)
    invoice_issued_at = db.Column(db.DateTime, nullable=True)

    user = db.relationship('User', lazy='joined')
    items = db.relationship('OrderItem', cascade='all, delete-orphan', lazy='selectin', backref='order')
    payments = db.relationship('Payment', cascade='all, delete-orphan', lazy='selectin', backref='order')

    def to_dict(self):
        return {
            'order_id': self.order_id,
            'order_number': self.order_number,
            'order_status': self.order_status,
            'subtotal': float(self.subtotal),
            'tax_amount': float(self.tax_amount),
            'shipping_amount': float(self.shipping_amount),
            'discount_amount': float(self.discount_amount),
            'total_amount': float(self.total_amount),
            'currency_code': self.currency_code,
            'shipping_name': self.shipping_name,
            'shipping_address_line1': self.shipping_address_line1,
            'shipping_address_line2': self.shipping_address_line2,
            'shipping_city': self.shipping_city,
            'shipping_state': self.shipping_state,
            'shipping_postal_code': self.shipping_postal_code,
            'shipping_country': self.shipping_country,
            'tracking_number': self.tracking_number,
            'carrier_name': self.carrier_name,
            'tracking_url': self.tracking_url,
            'shipped_at': self.shipped_at.isoformat() if self.shipped_at else None,
            'delivered_at': self.delivered_at.isoformat() if self.delivered_at else None,
            'invoice_number': self.invoice_number,
            'invoice_issued_at': self.invoice_issued_at.isoformat() if self.invoice_issued_at else None,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
            'items': [item.to_dict() for item in self.items],
            'payments': [payment.to_dict() for payment in self.payments],
        }


class OrderItem(TimestampMixin, db.Model):
    __tablename__ = 'order_items'

    order_item_id = db.Column(db.BigInteger, primary_key=True)
    order_id = db.Column(db.BigInteger, db.ForeignKey('orders.order_id', ondelete='CASCADE'), nullable=False)
    product_id = db.Column(db.BigInteger, db.ForeignKey('products.product_id', ondelete='RESTRICT'), nullable=False)
    quantity = db.Column(db.Integer, nullable=False)
    unit_price = db.Column(db.Numeric(12, 2), nullable=False)
    line_total = db.Column(db.Numeric(12, 2), nullable=False)

    product = db.relationship('Product', lazy='joined')

    def to_dict(self):
        return {
            'order_item_id': self.order_item_id,
            'product_id': self.product_id,
            'quantity': self.quantity,
            'unit_price': float(self.unit_price),
            'line_total': float(self.line_total),
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'product': self.product.to_dict() if self.product else None,
        }


class Payment(TimestampMixin, db.Model):
    __tablename__ = 'payments'

    payment_id = db.Column(db.BigInteger, primary_key=True)
    order_id = db.Column(db.BigInteger, db.ForeignKey('orders.order_id', ondelete='RESTRICT'), nullable=False)
    payer_user_id = db.Column(db.BigInteger, db.ForeignKey('users.user_id', ondelete='RESTRICT'), nullable=False)
    payment_method = db.Column(
        db.Enum('card', 'wallet', 'bank_transfer', 'cod', name='payment_method_enum'),
        nullable=False,
    )
    payment_status = db.Column(
        db.Enum('pending', 'authorized', 'captured', 'failed', 'refunded', 'voided', name='payment_status_enum'),
        nullable=False,
        default='pending',
    )
    amount = db.Column(db.Numeric(12, 2), nullable=False)
    currency_code = db.Column(db.String(3), nullable=False, default='USD')
    transaction_reference = db.Column(db.String(100), nullable=True, unique=True)
    provider_name = db.Column(db.String(100), nullable=True)
    paid_at = db.Column(db.DateTime, nullable=True)

    user = db.relationship('User', lazy='joined')

    def to_dict(self):
        return {
            'payment_id': self.payment_id,
            'order_id': self.order_id,
            'payer_user_id': self.payer_user_id,
            'payment_method': self.payment_method,
            'payment_status': self.payment_status,
            'amount': float(self.amount),
            'currency_code': self.currency_code,
            'transaction_reference': self.transaction_reference,
            'provider_name': self.provider_name,
            'paid_at': self.paid_at.isoformat() if self.paid_at else None,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
        }