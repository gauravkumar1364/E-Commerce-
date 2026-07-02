from datetime import datetime

from app.extensions import db


product_categories = db.Table(
    'product_categories',
    db.Column('product_id', db.BigInteger, db.ForeignKey('products.product_id'), primary_key=True),
    db.Column('category_id', db.BigInteger, db.ForeignKey('categories.category_id'), primary_key=True),
    db.Column('created_at', db.DateTime, nullable=False, default=datetime.utcnow),
)


class TimestampMixin:
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    updated_at = db.Column(
        db.DateTime,
        nullable=False,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
    )


class Category(TimestampMixin, db.Model):
    __tablename__ = 'categories'

    category_id = db.Column(db.BigInteger, primary_key=True)
    parent_category_id = db.Column(db.BigInteger, db.ForeignKey('categories.category_id'), nullable=True)
    category_name = db.Column(db.String(150), nullable=False)
    slug = db.Column(db.String(170), nullable=False, unique=True, index=True)
    description = db.Column(db.Text, nullable=True)
    is_active = db.Column(db.Boolean, nullable=False, default=True)

    parent = db.relationship('Category', remote_side=[category_id], backref=db.backref('children', lazy='selectin'))

    def to_dict(self):
        return {
            'category_id': self.category_id,
            'parent_category_id': self.parent_category_id,
            'category_name': self.category_name,
            'slug': self.slug,
            'description': self.description,
            'is_active': self.is_active,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
        }


class Product(TimestampMixin, db.Model):
    __tablename__ = 'products'

    product_id = db.Column(db.BigInteger, primary_key=True)
    sku = db.Column(db.String(80), nullable=False, unique=True, index=True)
    product_name = db.Column(db.String(200), nullable=False, index=True)
    description = db.Column(db.Text, nullable=True)
    price = db.Column(db.Numeric(12, 2), nullable=False)
    currency_code = db.Column(db.String(3), nullable=False, default='USD')
    stock_quantity = db.Column(db.Integer, nullable=False, default=0)
    is_active = db.Column(db.Boolean, nullable=False, default=True)

    categories = db.relationship('Category', secondary=product_categories, lazy='selectin', backref=db.backref('products', lazy='selectin'))
    images = db.relationship('ProductImage', cascade='all, delete-orphan', lazy='selectin', backref='product')

    def to_dict(self):
        return {
            'product_id': self.product_id,
            'sku': self.sku,
            'product_name': self.product_name,
            'description': self.description,
            'price': float(self.price),
            'currency_code': self.currency_code,
            'stock_quantity': self.stock_quantity,
            'is_active': self.is_active,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
            'categories': [category.to_dict() for category in self.categories],
            'images': [image.to_dict() for image in sorted(self.images, key=lambda item: (item.sort_order, item.product_image_id or 0))],
        }


class ProductImage(TimestampMixin, db.Model):
    __tablename__ = 'product_images'

    product_image_id = db.Column(db.BigInteger, primary_key=True)
    product_id = db.Column(db.BigInteger, db.ForeignKey('products.product_id', ondelete='CASCADE'), nullable=False)
    image_url = db.Column(db.String(500), nullable=False)
    alt_text = db.Column(db.String(255), nullable=True)
    sort_order = db.Column(db.Integer, nullable=False, default=0)
    is_primary = db.Column(db.Boolean, nullable=False, default=False)

    def to_dict(self):
        return {
            'product_image_id': self.product_image_id,
            'image_url': self.image_url,
            'alt_text': self.alt_text,
            'sort_order': self.sort_order,
            'is_primary': self.is_primary,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
        }