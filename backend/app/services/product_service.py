from decimal import Decimal, InvalidOperation
from urllib.parse import urlparse

from flask import request
from sqlalchemy import or_

from app.extensions import db
from app.models.auth import User
from app.models.product import Category, Product, ProductImage


ALLOWED_PRODUCT_SORT_FIELDS = {'created_at', 'updated_at', 'price', 'product_name', 'stock_quantity', 'sku'}
ALLOWED_SORT_DIRECTIONS = {'asc', 'desc'}


def normalize_slug(value):
    normalized = ''.join(character.lower() if character.isalnum() else '-' for character in value.strip())
    while '--' in normalized:
        normalized = normalized.replace('--', '-')
    return normalized.strip('-')


def parse_boolean(value, field_name):
    if value is None:
        return None
    if isinstance(value, bool):
        return value
    if isinstance(value, str):
        lowered = value.strip().lower()
        if lowered in {'true', '1', 'yes', 'y'}:
            return True
        if lowered in {'false', '0', 'no', 'n'}:
            return False
    raise ValueError(f'{field_name} must be a boolean value')


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


def parse_csv_integers(value, field_name):
    if value in (None, '', []):
        return []
    if isinstance(value, list):
        values = value
    else:
        values = [item.strip() for item in str(value).split(',') if item.strip()]

    parsed = []
    for item in values:
        parsed.append(parse_int(item, field_name, minimum=1))
    return list(dict.fromkeys(parsed))


def parse_images(images):
    if images in (None, ''):
        return []
    if not isinstance(images, list):
        raise ValueError('images must be a list of objects')

    parsed_images = []
    seen_urls = set()
    primary_count = 0

    for index, image in enumerate(images):
        if not isinstance(image, dict):
            raise ValueError('Each image must be an object')

        image_url = str(image.get('image_url', '')).strip()
        if not image_url:
            raise ValueError('image_url is required for each image')
        parsed_url = urlparse(image_url)
        if parsed_url.scheme not in {'http', 'https'} or not parsed_url.netloc:
            raise ValueError('image_url must be a valid http or https URL')
        if image_url in seen_urls:
            raise ValueError('Duplicate image_url values are not allowed')
        seen_urls.add(image_url)

        sort_order = image.get('sort_order', index)
        sort_order = parse_int(sort_order, 'sort_order', minimum=0)
        is_primary = parse_boolean(image.get('is_primary', False), 'is_primary')
        primary_count += int(is_primary)

        parsed_images.append(
            {
                'image_url': image_url,
                'alt_text': str(image.get('alt_text')).strip() if image.get('alt_text') is not None else None,
                'sort_order': sort_order,
                'is_primary': is_primary,
            }
        )

    if primary_count > 1:
        raise ValueError('Only one image can be marked as primary')

    return parsed_images


def validate_category_ids(category_ids):
    parsed_ids = parse_csv_integers(category_ids, 'category_ids')
    if not parsed_ids:
        return []

    categories = Category.query.filter(Category.category_id.in_(parsed_ids), Category.is_active.is_(True)).all()
    found_ids = {category.category_id for category in categories}
    missing_ids = [category_id for category_id in parsed_ids if category_id not in found_ids]
    if missing_ids:
        raise ValueError(f'Unknown category_ids: {", ".join(str(category_id) for category_id in missing_ids)}')
    return categories


def validate_product_payload(payload, is_update=False):
    cleaned = {}

    if not is_update or 'sku' in payload:
        sku = str(payload.get('sku', '')).strip()
        if not sku:
            raise ValueError('sku is required')
        if len(sku) > 80:
            raise ValueError('sku must be 80 characters or fewer')
        cleaned['sku'] = sku

    if not is_update or 'product_name' in payload:
        product_name = str(payload.get('product_name', '')).strip()
        if not product_name:
            raise ValueError('product_name is required')
        if len(product_name) > 200:
            raise ValueError('product_name must be 200 characters or fewer')
        cleaned['product_name'] = product_name

    if 'description' in payload:
        description = payload.get('description')
        cleaned['description'] = str(description).strip() if description is not None else None

    if not is_update or 'price' in payload:
        cleaned['price'] = parse_decimal(payload.get('price'), 'price', minimum=0)

    if 'currency_code' in payload:
        currency_code = str(payload.get('currency_code', '')).strip().upper()
        if len(currency_code) != 3:
            raise ValueError('currency_code must be a 3-letter ISO currency code')
        cleaned['currency_code'] = currency_code

    if not is_update or 'stock_quantity' in payload:
        cleaned['stock_quantity'] = parse_int(payload.get('stock_quantity', 0), 'stock_quantity', minimum=0)

    if 'is_active' in payload:
        cleaned['is_active'] = parse_boolean(payload.get('is_active'), 'is_active')

    if 'category_ids' in payload:
        cleaned['categories'] = validate_category_ids(payload.get('category_ids'))

    if 'images' in payload:
        cleaned['images'] = parse_images(payload.get('images'))

    return cleaned


def validate_category_payload(payload, is_update=False):
    cleaned = {}

    if not is_update or 'category_name' in payload:
        category_name = str(payload.get('category_name', '')).strip()
        if not category_name:
            raise ValueError('category_name is required')
        if len(category_name) > 150:
            raise ValueError('category_name must be 150 characters or fewer')
        cleaned['category_name'] = category_name

    if not is_update or 'slug' in payload:
        slug = str(payload.get('slug', '')).strip() or normalize_slug(payload.get('category_name', ''))
        if not slug:
            raise ValueError('slug is required')
        if len(slug) > 170:
            raise ValueError('slug must be 170 characters or fewer')
        cleaned['slug'] = slug

    if 'description' in payload:
        description = payload.get('description')
        cleaned['description'] = str(description).strip() if description is not None else None

    if 'is_active' in payload:
        cleaned['is_active'] = parse_boolean(payload.get('is_active'), 'is_active')

    if 'parent_category_id' in payload:
        parent_category_id = payload.get('parent_category_id')
        if parent_category_id in (None, ''):
            cleaned['parent_category_id'] = None
        else:
            cleaned['parent_category_id'] = parse_int(parent_category_id, 'parent_category_id', minimum=1)

    return cleaned


def build_product_query(params):
    query = Product.query

    search_term = str(params.get('q', '')).strip()
    if search_term:
        search_pattern = f'%{search_term}%'
        query = query.filter(
            or_(
                Product.product_name.ilike(search_pattern),
                Product.description.ilike(search_pattern),
                Product.sku.ilike(search_pattern),
            )
        )

    category_ids = parse_csv_integers(params.get('category_ids'), 'category_ids')
    if category_ids:
        query = query.join(Product.categories).filter(Category.category_id.in_(category_ids))

    category_slug = str(params.get('category_slug', '')).strip()
    if category_slug:
        query = query.join(Product.categories).filter(Category.slug == category_slug)

    if category_ids or category_slug:
        query = query.distinct()

    min_price = params.get('min_price')
    if min_price not in (None, ''):
        query = query.filter(Product.price >= parse_decimal(min_price, 'min_price', minimum=0))

    max_price = params.get('max_price')
    if max_price not in (None, ''):
        query = query.filter(Product.price <= parse_decimal(max_price, 'max_price', minimum=0))

    is_active = params.get('is_active')
    if is_active not in (None, ''):
        query = query.filter(Product.is_active.is_(parse_boolean(is_active, 'is_active')))

    in_stock = params.get('in_stock')
    if in_stock not in (None, ''):
        if parse_boolean(in_stock, 'in_stock'):
            query = query.filter(Product.stock_quantity > 0)

    sort_by = str(params.get('sort_by', 'created_at')).strip()
    if sort_by not in ALLOWED_PRODUCT_SORT_FIELDS:
        raise ValueError(f'sort_by must be one of: {", ".join(sorted(ALLOWED_PRODUCT_SORT_FIELDS))}')

    sort_direction = str(params.get('sort_order', 'desc')).strip().lower()
    if sort_direction not in ALLOWED_SORT_DIRECTIONS:
        raise ValueError('sort_order must be asc or desc')

    sort_column = getattr(Product, sort_by)
    query = query.order_by(sort_column.asc() if sort_direction == 'asc' else sort_column.desc())
    return query


def paginate_query(query, page, per_page):
    total = query.order_by(None).count()
    items = query.offset((page - 1) * per_page).limit(per_page).all()
    total_pages = (total + per_page - 1) // per_page if total else 0
    return {
        'items': items,
        'page': page,
        'per_page': per_page,
        'total': total,
        'total_pages': total_pages,
        'has_next': page < total_pages,
        'has_prev': page > 1,
    }


def build_pagination_response(query, page, per_page):
    page_data = paginate_query(query, page, per_page)
    return {
        'items': [product.to_dict() for product in page_data['items']],
        'pagination': {
            'page': page_data['page'],
            'per_page': page_data['per_page'],
            'total': page_data['total'],
            'total_pages': page_data['total_pages'],
            'has_next': page_data['has_next'],
            'has_prev': page_data['has_prev'],
        },
    }


def replace_product_categories(product, categories):
    product.categories = categories


def replace_product_images(product, images):
    product.images.clear()
    for image_data in images:
        product.images.append(ProductImage(**image_data))


def create_product(payload):
    cleaned = validate_product_payload(payload)
    categories = cleaned.pop('categories', [])
    images = cleaned.pop('images', [])
    product = Product(**cleaned)
    product.categories = categories
    replace_product_images(product, images)
    db.session.add(product)
    db.session.flush()
    return product


def update_product(product, payload):
    cleaned = validate_product_payload(payload, is_update=True)
    categories = cleaned.pop('categories', None)
    images = cleaned.pop('images', None)

    for key, value in cleaned.items():
        setattr(product, key, value)

    if categories is not None:
        replace_product_categories(product, categories)

    if images is not None:
        replace_product_images(product, images)

    return product
