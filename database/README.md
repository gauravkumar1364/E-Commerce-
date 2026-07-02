# Database

This folder contains the normalized MySQL data model for the secure e-commerce platform.

## Files

- [schema.sql](schema.sql) - Complete DDL with primary keys, foreign keys, and constraints.
- [seeds.sql](seeds.sql) - Seed data placeholder.
- [migrations](migrations) - Migration workspace placeholder.

## Relationship Summary

- A user belongs to one role.
- Products can belong to multiple categories through a junction table.
- Users own carts, wishlists, orders, sessions, login history, reviews, audit logs, and security events.
- Products own images and many-to-many category links.
- Orders contain many order items.
- Payments belong to orders and reference the paying user.
- Sessions are linked to users and can be referenced by login history and security events.
- Orders also carry tracking and invoice metadata for shipment follow-up and invoice generation.
- Transaction logs, fraud detections, and evidence collection support forensic investigation and incident response.

## ER Diagram

```mermaid
erDiagram
	ROLES ||--o{ USERS : assigns
	USERS ||--o{ ORDERS : places
	USERS ||--o{ CARTS : owns
	CARTS ||--o{ CART_ITEMS : contains
	USERS ||--o{ WISHLISTS : owns
	WISHLISTS ||--o{ WISHLIST_ITEMS : contains
	USERS ||--o{ SESSIONS : opens
	USERS ||--o{ LOGIN_HISTORY : records
	USERS ||--o{ AUDIT_LOGS : performs
	USERS ||--o{ SECURITY_EVENTS : triggers
	USERS ||--o{ TRANSACTION_LOGS : generates
	USERS ||--o{ FRAUD_DETECTIONS : reviewed_in
	USERS ||--o{ EVIDENCE_COLLECTION : sources
	USERS ||--o{ REVIEWS : writes
	USERS ||--o{ PAYMENTS : makes
	ORDERS ||--o{ ORDER_ITEMS : includes
	ORDERS ||--o{ PAYMENTS : settles
	ORDERS ||--o{ TRANSACTION_LOGS : traced_by
	ORDERS ||--o{ FRAUD_DETECTIONS : traced_by
	PRODUCTS ||--o{ ORDER_ITEMS : sold_as
	PRODUCTS ||--o{ CART_ITEMS : added_as
	PRODUCTS ||--o{ WISHLIST_ITEMS : saved_as
	PRODUCTS ||--o{ PRODUCT_IMAGES : has
	PRODUCTS ||--o{ REVIEWS : reviewed_in
	CATEGORIES ||--o{ CATEGORIES : nests
	PRODUCTS ||--o{ PRODUCT_CATEGORIES : mapped
	CATEGORIES ||--o{ PRODUCT_CATEGORIES : mapped
	SESSIONS ||--o{ LOGIN_HISTORY : referenced_by
	SESSIONS ||--o{ SECURITY_EVENTS : referenced_by
	ORDER_ITEMS ||--o| REVIEWS : verifies
	SESSIONS ||--o{ SECURITY_EVENTS : tracks
	USERS ||--o{ SECURITY_EVENTS : associated_with
	USERS ||--o{ AUDIT_LOGS : actor
	USERS ||--o{ LOGIN_HISTORY : actor
```