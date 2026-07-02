# API Documentation

This project exposes a Flask API for authentication, product browsing, commerce operations, and forensic administration.

## Base URL

- Development: `http://localhost:5000`
- Frontend dev proxy: `/forensics` is proxied to the backend during local development.

## Authentication

Most protected routes require a JWT bearer token.

Headers:

```http
Authorization: Bearer <access_token>
Content-Type: application/json
```

## Auth Endpoints

### `POST /auth/register`
Creates a new user account.

### `POST /auth/login`
Authenticates a user and returns access and refresh tokens.

### `POST /auth/refresh`
Issues a new access token using a refresh token.

### `POST /auth/logout`
Revokes the current session and token pair.

### `GET /auth/me`
Returns the authenticated user profile.

## Product Endpoints

### `GET /products`
Lists products with search, pagination, and filtering support.

### `GET /products/<id>`
Returns a single product.

### `POST /products`
Creates a product. Seller or admin access required.

### `PUT /products/<id>`
Updates a product. Seller or admin access required.

### `DELETE /products/<id>`
Deletes a product. Admin access required.

### `GET /categories`
Lists categories.

### `POST /categories`
Creates a category. Admin access required.

## Commerce Endpoints

### `GET /commerce/cart`
Returns the current user cart.

### `POST /commerce/cart/items`
Adds or updates a cart item.

### `GET /commerce/wishlist`
Returns the current user wishlist.

### `POST /commerce/checkout`
Creates an order, generates a payment, and records forensic events.

### `GET /commerce/orders`
Returns the authenticated user order history.

### `GET /commerce/orders/<order_id>`
Returns a single order.

### `GET /commerce/orders/<order_id>/invoice`
Returns invoice data for the selected order.

## Forensic Endpoints

All forensic endpoints require Admin access.

### `GET /forensics/dashboard`
Returns dashboard KPIs and chart data for the admin dashboard.

### `GET /forensics/logs`
Returns recent audit, login, security, transaction, fraud, and evidence records.

### `GET /forensics/audit-logs`
Returns audit log entries.

### `GET /forensics/login-history`
Returns login history entries.

### `GET /forensics/security-events`
Returns security events.

### `GET /forensics/transaction-logs`
Returns transaction logs.

### `GET /forensics/fraud-detections`
Returns fraud detections.

### `GET /forensics/evidence`
Returns evidence collection records.

## Common Response Pattern

List endpoints return data in the shape:

```json
{
  "items": [],
  "pagination": {
    "page": 1,
    "per_page": 20,
    "total": 0,
    "total_pages": 0
  }
}
```

## Error Responses

Typical error payloads include a message and a status code:

```json
{
  "message": "Unauthorized"
}
```
