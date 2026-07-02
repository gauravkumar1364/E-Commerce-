-- Normalized MySQL schema for a secure e-commerce platform.
-- Engine: InnoDB
-- Character set: utf8mb4

SET NAMES utf8mb4;
SET time_zone = '+00:00';

CREATE TABLE roles (
	role_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
	role_name VARCHAR(50) NOT NULL,
	description VARCHAR(255) NULL,
	created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
	updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	PRIMARY KEY (role_id),
	UNIQUE KEY uq_roles_role_name (role_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE users (
	user_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
	role_id BIGINT UNSIGNED NOT NULL,
	first_name VARCHAR(100) NOT NULL,
	last_name VARCHAR(100) NOT NULL,
	email VARCHAR(255) NOT NULL,
	phone VARCHAR(30) NULL,
	password_hash VARCHAR(255) NOT NULL,
	is_active TINYINT(1) NOT NULL DEFAULT 1,
	email_verified_at TIMESTAMP NULL,
	last_login_at TIMESTAMP NULL,
	created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
	updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	PRIMARY KEY (user_id),
	UNIQUE KEY uq_users_email (email),
	KEY idx_users_role_id (role_id),
	CONSTRAINT fk_users_role_id
		FOREIGN KEY (role_id) REFERENCES roles (role_id)
		ON UPDATE CASCADE
		ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE categories (
	category_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
	parent_category_id BIGINT UNSIGNED NULL,
	category_name VARCHAR(150) NOT NULL,
	slug VARCHAR(170) NOT NULL,
	description TEXT NULL,
	is_active TINYINT(1) NOT NULL DEFAULT 1,
	created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
	updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	PRIMARY KEY (category_id),
	UNIQUE KEY uq_categories_slug (slug),
	KEY idx_categories_parent_category_id (parent_category_id),
	CONSTRAINT fk_categories_parent_category_id
		FOREIGN KEY (parent_category_id) REFERENCES categories (category_id)
		ON UPDATE CASCADE
		ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE products (
	product_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
	sku VARCHAR(80) NOT NULL,
	product_name VARCHAR(200) NOT NULL,
	description TEXT NULL,
	price DECIMAL(12,2) NOT NULL,
	currency_code CHAR(3) NOT NULL DEFAULT 'USD',
	stock_quantity INT UNSIGNED NOT NULL DEFAULT 0,
	is_active TINYINT(1) NOT NULL DEFAULT 1,
	created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
	updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	PRIMARY KEY (product_id),
	UNIQUE KEY uq_products_sku (sku),
	KEY idx_products_product_name (product_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE product_categories (
	product_id BIGINT UNSIGNED NOT NULL,
	category_id BIGINT UNSIGNED NOT NULL,
	created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
	PRIMARY KEY (product_id, category_id),
	KEY idx_product_categories_category_id (category_id),
	CONSTRAINT fk_product_categories_product_id
		FOREIGN KEY (product_id) REFERENCES products (product_id)
		ON UPDATE CASCADE
		ON DELETE CASCADE,
	CONSTRAINT fk_product_categories_category_id
		FOREIGN KEY (category_id) REFERENCES categories (category_id)
		ON UPDATE CASCADE
		ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE product_images (
	product_image_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
	product_id BIGINT UNSIGNED NOT NULL,
	image_url VARCHAR(500) NOT NULL,
	alt_text VARCHAR(255) NULL,
	sort_order INT NOT NULL DEFAULT 0,
	is_primary TINYINT(1) NOT NULL DEFAULT 0,
	created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
	updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	PRIMARY KEY (product_image_id),
	UNIQUE KEY uq_product_images_product_url (product_id, image_url),
	KEY idx_product_images_product_id (product_id),
	CONSTRAINT fk_product_images_product_id
		FOREIGN KEY (product_id) REFERENCES products (product_id)
		ON UPDATE CASCADE
		ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE carts (
	cart_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
	user_id BIGINT UNSIGNED NOT NULL,
	cart_status ENUM('active', 'converted', 'abandoned') NOT NULL DEFAULT 'active',
	created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
	updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	PRIMARY KEY (cart_id),
	KEY idx_carts_user_id (user_id),
	CONSTRAINT fk_carts_user_id
		FOREIGN KEY (user_id) REFERENCES users (user_id)
		ON UPDATE CASCADE
		ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE cart_items (
	cart_item_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
	cart_id BIGINT UNSIGNED NOT NULL,
	product_id BIGINT UNSIGNED NOT NULL,
	quantity INT UNSIGNED NOT NULL DEFAULT 1,
	unit_price DECIMAL(12,2) NOT NULL,
	created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
	updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	PRIMARY KEY (cart_item_id),
	UNIQUE KEY uq_cart_items_cart_product (cart_id, product_id),
	KEY idx_cart_items_product_id (product_id),
	CONSTRAINT fk_cart_items_cart_id
		FOREIGN KEY (cart_id) REFERENCES carts (cart_id)
		ON UPDATE CASCADE
		ON DELETE CASCADE,
	CONSTRAINT fk_cart_items_product_id
		FOREIGN KEY (product_id) REFERENCES products (product_id)
		ON UPDATE CASCADE
		ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE wishlists (
	wishlist_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
	user_id BIGINT UNSIGNED NOT NULL,
	wishlist_name VARCHAR(150) NOT NULL DEFAULT 'My Wishlist',
	created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
	updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	PRIMARY KEY (wishlist_id),
	KEY idx_wishlists_user_id (user_id),
	CONSTRAINT fk_wishlists_user_id
		FOREIGN KEY (user_id) REFERENCES users (user_id)
		ON UPDATE CASCADE
		ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE wishlist_items (
	wishlist_item_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
	wishlist_id BIGINT UNSIGNED NOT NULL,
	product_id BIGINT UNSIGNED NOT NULL,
	created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
	PRIMARY KEY (wishlist_item_id),
	UNIQUE KEY uq_wishlist_items_wishlist_product (wishlist_id, product_id),
	KEY idx_wishlist_items_product_id (product_id),
	CONSTRAINT fk_wishlist_items_wishlist_id
		FOREIGN KEY (wishlist_id) REFERENCES wishlists (wishlist_id)
		ON UPDATE CASCADE
		ON DELETE CASCADE,
	CONSTRAINT fk_wishlist_items_product_id
		FOREIGN KEY (product_id) REFERENCES products (product_id)
		ON UPDATE CASCADE
		ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE orders (
	order_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
	user_id BIGINT UNSIGNED NOT NULL,
	order_number VARCHAR(40) NOT NULL,
	order_status ENUM('pending', 'paid', 'processing', 'shipped', 'completed', 'cancelled', 'refunded') NOT NULL DEFAULT 'pending',
	subtotal DECIMAL(12,2) NOT NULL DEFAULT 0.00,
	tax_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
	shipping_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
	discount_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
	total_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
	currency_code CHAR(3) NOT NULL DEFAULT 'USD',
	shipping_name VARCHAR(200) NOT NULL,
	shipping_address_line1 VARCHAR(255) NOT NULL,
	shipping_address_line2 VARCHAR(255) NULL,
	shipping_city VARCHAR(100) NOT NULL,
	shipping_state VARCHAR(100) NULL,
	shipping_postal_code VARCHAR(20) NOT NULL,
	shipping_country VARCHAR(100) NOT NULL,
	tracking_number VARCHAR(100) NULL,
	carrier_name VARCHAR(100) NULL,
	tracking_url VARCHAR(500) NULL,
	shipped_at TIMESTAMP NULL,
	delivered_at TIMESTAMP NULL,
	invoice_number VARCHAR(40) NULL,
	invoice_issued_at TIMESTAMP NULL,
	created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
	updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	PRIMARY KEY (order_id),
	UNIQUE KEY uq_orders_order_number (order_number),
	UNIQUE KEY uq_orders_tracking_number (tracking_number),
	UNIQUE KEY uq_orders_invoice_number (invoice_number),
	KEY idx_orders_user_id (user_id),
	CONSTRAINT fk_orders_user_id
		FOREIGN KEY (user_id) REFERENCES users (user_id)
		ON UPDATE CASCADE
		ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE order_items (
	order_item_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
	order_id BIGINT UNSIGNED NOT NULL,
	product_id BIGINT UNSIGNED NOT NULL,
	quantity INT UNSIGNED NOT NULL,
	unit_price DECIMAL(12,2) NOT NULL,
	line_total DECIMAL(12,2) NOT NULL,
	created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
	PRIMARY KEY (order_item_id),
	UNIQUE KEY uq_order_items_order_product (order_id, product_id),
	KEY idx_order_items_product_id (product_id),
	CONSTRAINT fk_order_items_order_id
		FOREIGN KEY (order_id) REFERENCES orders (order_id)
		ON UPDATE CASCADE
		ON DELETE CASCADE,
	CONSTRAINT fk_order_items_product_id
		FOREIGN KEY (product_id) REFERENCES products (product_id)
		ON UPDATE CASCADE
		ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE payments (
	payment_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
	order_id BIGINT UNSIGNED NOT NULL,
	payer_user_id BIGINT UNSIGNED NOT NULL,
	payment_method ENUM('card', 'wallet', 'bank_transfer', 'cod') NOT NULL,
	payment_status ENUM('pending', 'authorized', 'captured', 'failed', 'refunded', 'voided') NOT NULL DEFAULT 'pending',
	amount DECIMAL(12,2) NOT NULL,
	currency_code CHAR(3) NOT NULL DEFAULT 'USD',
	transaction_reference VARCHAR(100) NULL,
	provider_name VARCHAR(100) NULL,
	paid_at TIMESTAMP NULL,
	created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
	updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	PRIMARY KEY (payment_id),
	UNIQUE KEY uq_payments_transaction_reference (transaction_reference),
	KEY idx_payments_order_id (order_id),
	KEY idx_payments_payer_user_id (payer_user_id),
	CONSTRAINT fk_payments_order_id
		FOREIGN KEY (order_id) REFERENCES orders (order_id)
		ON UPDATE CASCADE
		ON DELETE RESTRICT,
	CONSTRAINT fk_payments_payer_user_id
		FOREIGN KEY (payer_user_id) REFERENCES users (user_id)
		ON UPDATE CASCADE
		ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE reviews (
	review_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
	user_id BIGINT UNSIGNED NOT NULL,
	product_id BIGINT UNSIGNED NOT NULL,
	order_item_id BIGINT UNSIGNED NULL,
	rating TINYINT UNSIGNED NOT NULL,
	review_title VARCHAR(200) NULL,
	review_body TEXT NULL,
	is_verified_purchase TINYINT(1) NOT NULL DEFAULT 0,
	created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
	updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	PRIMARY KEY (review_id),
	UNIQUE KEY uq_reviews_user_product (user_id, product_id),
	KEY idx_reviews_product_id (product_id),
	KEY idx_reviews_order_item_id (order_item_id),
	CONSTRAINT fk_reviews_user_id
		FOREIGN KEY (user_id) REFERENCES users (user_id)
		ON UPDATE CASCADE
		ON DELETE CASCADE,
	CONSTRAINT fk_reviews_product_id
		FOREIGN KEY (product_id) REFERENCES products (product_id)
		ON UPDATE CASCADE
		ON DELETE CASCADE,
	CONSTRAINT fk_reviews_order_item_id
		FOREIGN KEY (order_item_id) REFERENCES order_items (order_item_id)
		ON UPDATE CASCADE
		ON DELETE SET NULL,
	CONSTRAINT chk_reviews_rating CHECK (rating BETWEEN 1 AND 5)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE sessions (
	session_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
	session_key VARCHAR(64) NOT NULL,
	user_id BIGINT UNSIGNED NOT NULL,
	jwt_jti VARCHAR(64) NOT NULL,
	refresh_token_hash VARCHAR(255) NULL,
	ip_address VARBINARY(16) NULL,
	user_agent VARCHAR(512) NULL,
	device_fingerprint VARCHAR(255) NULL,
	expires_at TIMESTAMP NOT NULL,
	revoked_at TIMESTAMP NULL,
	created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
	PRIMARY KEY (session_id),
	UNIQUE KEY uq_sessions_session_key (session_key),
	UNIQUE KEY uq_sessions_jwt_jti (jwt_jti),
	KEY idx_sessions_user_id (user_id),
	KEY idx_sessions_expires_at (expires_at),
	CONSTRAINT fk_sessions_user_id
		FOREIGN KEY (user_id) REFERENCES users (user_id)
		ON UPDATE CASCADE
		ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE login_history (
	login_history_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
	user_id BIGINT UNSIGNED NOT NULL,
	session_id BIGINT UNSIGNED NULL,
	login_status ENUM('success', 'failure') NOT NULL,
	failure_reason VARCHAR(255) NULL,
	ip_address VARBINARY(16) NULL,
	user_agent VARCHAR(512) NULL,
	logged_in_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
	PRIMARY KEY (login_history_id),
	KEY idx_login_history_user_id (user_id),
	KEY idx_login_history_session_id (session_id),
	CONSTRAINT fk_login_history_user_id
		FOREIGN KEY (user_id) REFERENCES users (user_id)
		ON UPDATE CASCADE
		ON DELETE CASCADE,
	CONSTRAINT fk_login_history_session_id
		FOREIGN KEY (session_id) REFERENCES sessions (session_id)
		ON UPDATE CASCADE
		ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE audit_logs (
	audit_log_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
	actor_user_id BIGINT UNSIGNED NULL,
	entity_name VARCHAR(100) NOT NULL,
	entity_id BIGINT UNSIGNED NULL,
	action_type VARCHAR(100) NOT NULL,
	old_values JSON NULL,
	new_values JSON NULL,
	ip_address VARBINARY(16) NULL,
	user_agent VARCHAR(512) NULL,
	created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
	PRIMARY KEY (audit_log_id),
	KEY idx_audit_logs_actor_user_id (actor_user_id),
	KEY idx_audit_logs_entity (entity_name, entity_id),
	CONSTRAINT fk_audit_logs_actor_user_id
		FOREIGN KEY (actor_user_id) REFERENCES users (user_id)
		ON UPDATE CASCADE
		ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE transaction_logs (
	transaction_log_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
	order_id BIGINT UNSIGNED NULL,
	payment_id BIGINT UNSIGNED NULL,
	user_id BIGINT UNSIGNED NULL,
	transaction_type VARCHAR(100) NOT NULL,
	transaction_status VARCHAR(50) NOT NULL,
	amount DECIMAL(12,2) NULL,
	currency_code CHAR(3) NULL,
	gateway_reference VARCHAR(100) NULL,
	risk_score INT NOT NULL DEFAULT 0,
	metadata JSON NULL,
	created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
	updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	PRIMARY KEY (transaction_log_id),
	KEY idx_transaction_logs_order_id (order_id),
	KEY idx_transaction_logs_payment_id (payment_id),
	KEY idx_transaction_logs_user_id (user_id),
	CONSTRAINT fk_transaction_logs_order_id
		FOREIGN KEY (order_id) REFERENCES orders (order_id)
		ON UPDATE CASCADE
		ON DELETE SET NULL,
	CONSTRAINT fk_transaction_logs_payment_id
		FOREIGN KEY (payment_id) REFERENCES payments (payment_id)
		ON UPDATE CASCADE
		ON DELETE SET NULL,
	CONSTRAINT fk_transaction_logs_user_id
		FOREIGN KEY (user_id) REFERENCES users (user_id)
		ON UPDATE CASCADE
		ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE fraud_detections (
	fraud_detection_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
	order_id BIGINT UNSIGNED NULL,
	payment_id BIGINT UNSIGNED NULL,
	user_id BIGINT UNSIGNED NULL,
	risk_score INT NOT NULL DEFAULT 0,
	detection_status VARCHAR(50) NOT NULL DEFAULT 'review',
	rule_name VARCHAR(100) NOT NULL,
	reasons JSON NULL,
	metadata JSON NULL,
	created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
	updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	PRIMARY KEY (fraud_detection_id),
	KEY idx_fraud_detections_order_id (order_id),
	KEY idx_fraud_detections_payment_id (payment_id),
	KEY idx_fraud_detections_user_id (user_id),
	CONSTRAINT fk_fraud_detections_order_id
		FOREIGN KEY (order_id) REFERENCES orders (order_id)
		ON UPDATE CASCADE
		ON DELETE SET NULL,
	CONSTRAINT fk_fraud_detections_payment_id
		FOREIGN KEY (payment_id) REFERENCES payments (payment_id)
		ON UPDATE CASCADE
		ON DELETE SET NULL,
	CONSTRAINT fk_fraud_detections_user_id
		FOREIGN KEY (user_id) REFERENCES users (user_id)
		ON UPDATE CASCADE
		ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE evidence_collection (
	evidence_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
	user_id BIGINT UNSIGNED NULL,
	session_id BIGINT UNSIGNED NULL,
	entity_name VARCHAR(100) NOT NULL,
	entity_id BIGINT UNSIGNED NULL,
	source_type VARCHAR(50) NOT NULL,
	source_path VARCHAR(255) NULL,
	request_method VARCHAR(10) NULL,
	request_path VARCHAR(255) NULL,
	ip_address VARBINARY(16) NULL,
	user_agent VARCHAR(512) NULL,
	payload_snapshot JSON NULL,
	payload_hash VARCHAR(128) NULL,
	evidence_status VARCHAR(50) NOT NULL DEFAULT 'collected',
	notes TEXT NULL,
	created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
	updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	PRIMARY KEY (evidence_id),
	KEY idx_evidence_collection_user_id (user_id),
	KEY idx_evidence_collection_session_id (session_id),
	KEY idx_evidence_collection_entity (entity_name, entity_id),
	CONSTRAINT fk_evidence_collection_user_id
		FOREIGN KEY (user_id) REFERENCES users (user_id)
		ON UPDATE CASCADE
		ON DELETE SET NULL,
	CONSTRAINT fk_evidence_collection_session_id
		FOREIGN KEY (session_id) REFERENCES sessions (session_id)
		ON UPDATE CASCADE
		ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE security_events (
	security_event_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
	user_id BIGINT UNSIGNED NULL,
	session_id BIGINT UNSIGNED NULL,
	event_type VARCHAR(100) NOT NULL,
	event_severity ENUM('low', 'medium', 'high', 'critical') NOT NULL DEFAULT 'medium',
	event_status ENUM('open', 'investigating', 'resolved', 'dismissed') NOT NULL DEFAULT 'open',
	event_message VARCHAR(500) NOT NULL,
	ip_address VARBINARY(16) NULL,
	metadata JSON NULL,
	created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
	resolved_at TIMESTAMP NULL,
	PRIMARY KEY (security_event_id),
	KEY idx_security_events_user_id (user_id),
	KEY idx_security_events_session_id (session_id),
	KEY idx_security_events_event_type (event_type),
	CONSTRAINT fk_security_events_user_id
		FOREIGN KEY (user_id) REFERENCES users (user_id)
		ON UPDATE CASCADE
		ON DELETE SET NULL,
	CONSTRAINT fk_security_events_session_id
		FOREIGN KEY (session_id) REFERENCES sessions (session_id)
		ON UPDATE CASCADE
		ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;