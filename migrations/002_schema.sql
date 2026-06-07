USE restaurant_db;

-- ------------------------------------------------------------
-- TABLES (mesas)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS tables (
  id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  number     INT UNSIGNED   NOT NULL UNIQUE,
  capacity   INT UNSIGNED   NOT NULL DEFAULT 4,
  status     ENUM('free','occupied','waiting_payment') NOT NULL DEFAULT 'free',
  qr_code    VARCHAR(200),
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_tables_status (status)
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- TABLE SESSIONS (comanda)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS table_sessions (
  id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  table_id   INT UNSIGNED NOT NULL,
  opened_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  closed_at  DATETIME,
  total      DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  status     ENUM('open','closed') NOT NULL DEFAULT 'open',
  CONSTRAINT fk_session_table FOREIGN KEY (table_id)
    REFERENCES tables(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  INDEX idx_sessions_table  (table_id),
  INDEX idx_sessions_status (status)
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- Adiciona session_id na tabela orders
-- ------------------------------------------------------------
ALTER TABLE orders
  ADD COLUMN session_id INT UNSIGNED AFTER id,
  ADD CONSTRAINT fk_order_session FOREIGN KEY (session_id)
    REFERENCES table_sessions(id) ON DELETE SET NULL ON UPDATE CASCADE;

-- ------------------------------------------------------------
-- SEED - Mesas
-- ------------------------------------------------------------
INSERT INTO tables (number, capacity) VALUES
  (1, 2),(2, 2),(3, 4),(4, 4),(5, 4),
  (6, 6),(7, 6),(8, 8),(9, 8),(10, 10);