-- ============================================================
-- ShopZen Seed Data
-- ============================================================

-- Roles
INSERT IGNORE INTO roles (role_id, role_name, description, created_at, updated_at) VALUES
  (1, 'Admin',    'Full platform access',           NOW(), NOW()),
  (2, 'Seller',   'Manage listings and inventory',  NOW(), NOW()),
  (3, 'Customer', 'Browse, buy, and review',        NOW(), NOW());

-- Categories
INSERT IGNORE INTO categories (category_id, category_name, slug, description, is_active, created_at, updated_at) VALUES
  (1,  'Electronics',   'electronics',   'Smartphones, laptops, audio, and gadgets', 1, NOW(), NOW()),
  (2,  'Fashion',       'fashion',       'Clothing, ethnic wear, and western styles', 1, NOW(), NOW()),
  (3,  'Home & Kitchen','home-kitchen',  'Appliances, cookware, and home decor',    1, NOW(), NOW()),
  (4,  'Beauty',        'beauty',        'Skincare, makeup, and personal care',      1, NOW(), NOW()),
  (5,  'Footwear',      'footwear',      'Sneakers, formal shoes, and sandals',      1, NOW(), NOW()),
  (6,  'Sports',        'sports',        'Gym, outdoor, cycling, and fitness',       1, NOW(), NOW()),
  (7,  'Accessories',   'accessories',   'Bags, wallets, belts, and watches',        1, NOW(), NOW()),
  (8,  'Gaming',        'gaming',        'Consoles, games, and peripherals',         1, NOW(), NOW()),
  (9,  'Books',         'books',         'Fiction, non-fiction, and academic',       1, NOW(), NOW()),
  (10, 'Furniture',     'furniture',     'Sofas, beds, and office furniture',        1, NOW(), NOW());

-- Products
INSERT IGNORE INTO products (product_id, sku, product_name, description, price, currency_code, stock_quantity, is_active, created_at, updated_at) VALUES
  (1, 'SKU-AUR-001', 'Aurora Pro Jacket',
    'Weatherproof shell with a soft fleece lining and a minimalist silhouette — built for the modern explorer, day to night.',
    8999.00, 'INR', 24, 1, NOW(), NOW()),

  (2, 'SKU-ORB-002', 'Orbit ANC Headphones',
    'Adaptive noise cancellation, deep spatial audio, and a 30-hour battery life for distraction-free focus and music.',
    12999.00, 'INR', 18, 1, NOW(), NOW()),

  (3, 'SKU-ATL-003', 'Atlas Travel Backpack',
    'Structured travel pack with padded laptop sleeve, luggage pass-through, and an anti-theft zipper for worry-free travel.',
    4999.00, 'INR', 37, 1, NOW(), NOW()),

  (4, 'SKU-NOV-004', 'Nova Smart Watch Series 5',
    'Premium smartwatch with sleep tracking, SpO2 monitoring, fast charging, and an always-on AMOLED display.',
    19999.00, 'INR', 12, 1, NOW(), NOW()),

  (5, 'SKU-PUL-005', 'Pulse Insulated Bottle',
    'Double-wall insulated stainless steel bottle with a leak-proof lid and premium matte finish for everyday carry.',
    1999.00, 'INR', 71, 1, NOW(), NOW()),

  (6, 'SKU-MON-006', 'Mono Pro Desk Lamp',
    'Slim, adjustable-brightness desk lamp with 5 colour temperature settings and a USB-C charging port in the base.',
    3999.00, 'INR', 26, 1, NOW(), NOW()),

  (7, 'SKU-SWT-007', 'Swift Running Shoes',
    'Ultra-lightweight running shoes with responsive foam cushioning and breathable mesh upper for all-day comfort.',
    6499.00, 'INR', 45, 1, NOW(), NOW()),

  (8, 'SKU-GLW-008', 'Glow Skincare Set',
    'Complete 4-step skincare routine with cleanser, toner, vitamin-C serum, and moisturiser. Dermatologist-approved formula.',
    2999.00, 'INR', 60, 1, NOW(), NOW());

-- Product → Category mappings
INSERT IGNORE INTO product_categories (product_id, category_id, created_at) VALUES
  (1, 2,  NOW()),   -- Aurora Jacket → Fashion
  (2, 1,  NOW()),   -- Orbit Headphones → Electronics
  (3, 7,  NOW()),   -- Atlas Backpack → Accessories
  (4, 1,  NOW()),   -- Nova Watch → Electronics
  (5, 3,  NOW()),   -- Pulse Bottle → Home & Kitchen
  (6, 3,  NOW()),   -- Mono Lamp → Home & Kitchen
  (7, 5,  NOW()),   -- Swift Shoes → Footwear
  (8, 4,  NOW());   -- Glow Skincare → Beauty

-- Product images (gradient placeholders via picsum)
INSERT IGNORE INTO product_images (product_image_id, product_id, image_url, alt_text, sort_order, is_primary, created_at, updated_at) VALUES
  (1,  1, 'https://picsum.photos/seed/aurora-jacket/600/600',    'Aurora Pro Jacket',          0, 1, NOW(), NOW()),
  (2,  2, 'https://picsum.photos/seed/orbit-headphones/600/600', 'Orbit ANC Headphones',       0, 1, NOW(), NOW()),
  (3,  3, 'https://picsum.photos/seed/atlas-backpack/600/600',   'Atlas Travel Backpack',      0, 1, NOW(), NOW()),
  (4,  4, 'https://picsum.photos/seed/nova-watch/600/600',       'Nova Smart Watch Series 5',  0, 1, NOW(), NOW()),
  (5,  5, 'https://picsum.photos/seed/pulse-bottle/600/600',     'Pulse Insulated Bottle',     0, 1, NOW(), NOW()),
  (6,  6, 'https://picsum.photos/seed/mono-lamp/600/600',        'Mono Pro Desk Lamp',         0, 1, NOW(), NOW()),
  (7,  7, 'https://picsum.photos/seed/swift-shoes/600/600',      'Swift Running Shoes',        0, 1, NOW(), NOW()),
  (8,  8, 'https://picsum.photos/seed/glow-skincare/600/600',    'Glow Skincare Set',          0, 1, NOW(), NOW());