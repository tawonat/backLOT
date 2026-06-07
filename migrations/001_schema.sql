-- ============================================================
-- Restaurant System - Database Schema
-- ============================================================

CREATE DATABASE IF NOT EXISTS restaurant_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE restaurant_db;

-- ------------------------------------------------------------
-- CATEGORIES
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS categories (
  id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name       VARCHAR(100)    NOT NULL,
  slug       VARCHAR(120)    NOT NULL UNIQUE,
  description TEXT,
  active     TINYINT(1)      NOT NULL DEFAULT 1,
  created_at DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- PRODUCTS
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS products (
  id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  category_id  INT UNSIGNED    NOT NULL,
  name         VARCHAR(150)    NOT NULL,
  slug         VARCHAR(170)    NOT NULL UNIQUE,
  description  TEXT,
  price        DECIMAL(10, 2)  NOT NULL,
  cost_price   DECIMAL(10, 2)  NOT NULL DEFAULT 0.00,
  image_url    VARCHAR(500),
  sku          VARCHAR(80)     UNIQUE,
  stock        INT             NOT NULL DEFAULT 0,
  is_available TINYINT(1)      NOT NULL DEFAULT 1,
  active       TINYINT(1)      NOT NULL DEFAULT 1,
  created_at   DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at   DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_product_category FOREIGN KEY (category_id)
    REFERENCES categories(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  INDEX idx_products_category (category_id),
  INDEX idx_products_active    (active),
  INDEX idx_products_available (is_available)
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- CUSTOMERS
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS customers (
  id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name       VARCHAR(150)   NOT NULL,
  email      VARCHAR(200)   UNIQUE,
  phone      VARCHAR(30),
  active     TINYINT(1)     NOT NULL DEFAULT 1,
  created_at DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- ORDERS
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS orders (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  customer_id     INT UNSIGNED,
  order_number    VARCHAR(20)    NOT NULL UNIQUE,
  status          ENUM('pending','confirmed','preparing','ready','delivered','cancelled')
                  NOT NULL DEFAULT 'pending',
  table_number    INT UNSIGNED,
  notes           TEXT,
  subtotal        DECIMAL(10,2)  NOT NULL DEFAULT 0.00,
  discount        DECIMAL(10,2)  NOT NULL DEFAULT 0.00,
  total           DECIMAL(10,2)  NOT NULL DEFAULT 0.00,
  payment_method  ENUM('cash','credit_card','debit_card','pix','other'),
  payment_status  ENUM('pending','paid','refunded') NOT NULL DEFAULT 'pending',
  created_at      DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_order_customer FOREIGN KEY (customer_id)
    REFERENCES customers(id) ON DELETE SET NULL ON UPDATE CASCADE,
  INDEX idx_orders_status      (status),
  INDEX idx_orders_customer    (customer_id),
  INDEX idx_orders_created_at  (created_at)
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- ORDER ITEMS
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS order_items (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  order_id    INT UNSIGNED   NOT NULL,
  product_id  INT UNSIGNED   NOT NULL,
  quantity    INT UNSIGNED   NOT NULL DEFAULT 1,
  unit_price  DECIMAL(10,2)  NOT NULL,
  subtotal    DECIMAL(10,2)  NOT NULL,
  notes       VARCHAR(300),
  created_at  DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_item_order   FOREIGN KEY (order_id)   REFERENCES orders(id)   ON DELETE CASCADE  ON UPDATE CASCADE,
  CONSTRAINT fk_item_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  INDEX idx_items_order   (order_id),
  INDEX idx_items_product (product_id)
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- SEED - Categories
-- ------------------------------------------------------------
INSERT INTO categories (name, slug, description) VALUES
  ('Entradas',      'entradas',       'Porções e entradas para compartilhar'),
  ('Pratos Principais', 'pratos-principais', 'Pratos quentes do cardápio principal'),
  ('Bebidas',       'bebidas',        'Refrigerantes, sucos e outras bebidas'),
  ('Sobremesas',    'sobremesas',     'Doces e sobremesas artesanais'),
  ('Pizzas',        'pizzas',         'Pizzas tradicionais e especiais');

-- ------------------------------------------------------------
-- SEED - Products
-- ------------------------------------------------------------
INSERT INTO products (category_id, name, slug, description, price, cost_price, sku, stock, is_available) VALUES
  (1, 'Coxinha (6 un)',      'coxinha-6-un',       'Coxinhas de frango crocantes',        18.90,  6.00, 'ENT-001', 100, 1),
  (1, 'Batata Frita',        'batata-frita',        'Batata palito crocante com cheddar',  22.00,  7.00, 'ENT-002', 100, 1),
  (1, 'Bolinho de Bacalhau', 'bolinho-bacalhau',    'Bolinho tradicional português (8 un)',28.00,  9.00, 'ENT-003',  80, 1),
  (2, 'Frango Grelhado',     'frango-grelhado',     'Filé de frango com legumes e arroz',  39.90, 13.00, 'PRI-001', 999, 1),
  (2, 'Picanha Grelhada',    'picanha-grelhada',    '300g de picanha com fritas e farofa', 68.00, 22.00, 'PRI-002', 999, 1),
  (2, 'Risoto de Funghi',    'risoto-de-funghi',    'Risoto cremoso com mix de cogumelos', 52.00, 16.00, 'PRI-003', 999, 1),
  (3, 'Refrigerante Lata',   'refrigerante-lata',   'Coca-Cola, Pepsi ou Guaraná 350ml',    7.00,  2.50, 'BEB-001', 200, 1),
  (3, 'Suco Natural',        'suco-natural',        'Laranja, limão ou maracujá 400ml',    12.00,  3.50, 'BEB-002', 150, 1),
  (3, 'Água Mineral',        'agua-mineral',        'Garrafa 500ml',                        5.00,  1.00, 'BEB-003', 300, 1),
  (4, 'Petit Gateau',        'petit-gateau',        'Com sorvete de creme',                24.00,  8.00, 'SOB-001',  60, 1),
  (5, 'Pizza Margherita',    'pizza-margherita',    'Molho, mussarela e manjericão G',     45.00, 15.00, 'PIZ-001', 999, 1),
  (5, 'Pizza Calabresa',     'pizza-calabresa',     'Calabresa, cebola e mussarela G',     48.00, 16.00, 'PIZ-002', 999, 1);
