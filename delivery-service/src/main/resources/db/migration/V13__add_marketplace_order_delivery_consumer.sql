CREATE TABLE processed_events (
    event_id VARCHAR(64) PRIMARY KEY,
    processed_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

ALTER TABLE delivery_orders
    ADD UNIQUE KEY uk_delivery_marketplace_order (marketplace_order_id);
