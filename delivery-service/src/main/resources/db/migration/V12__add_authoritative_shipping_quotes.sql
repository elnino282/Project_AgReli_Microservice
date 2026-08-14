CREATE TABLE shipping_quotes (
    quote_id VARCHAR(36) PRIMARY KEY,
    buyer_user_id BIGINT NOT NULL,
    seller_user_id BIGINT NOT NULL,
    farm_id INT NOT NULL,
    provider_id INT NOT NULL,
    service_type VARCHAR(30) NOT NULL,
    sender_province VARCHAR(100) NOT NULL,
    recipient_province VARCHAR(100) NOT NULL,
    weight_kg DECIMAL(10,3) NOT NULL,
    is_perishable BOOLEAN NOT NULL DEFAULT FALSE,
    requires_cold_chain BOOLEAN NOT NULL DEFAULT FALSE,
    shipping_fee_vnd DECIMAL(12,2) NOT NULL,
    estimated_hours INT NOT NULL,
    expires_at DATETIME(6) NOT NULL,
    consumed_at DATETIME(6) NULL,
    marketplace_order_id BIGINT NULL,
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    INDEX idx_shipping_quote_buyer (buyer_user_id),
    INDEX idx_shipping_quote_expiry (expires_at),
    UNIQUE KEY uk_shipping_quote_order (marketplace_order_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

ALTER TABLE delivery_orders
    ADD COLUMN shipping_quote_id VARCHAR(36) NULL AFTER marketplace_order_id,
    ADD UNIQUE KEY uk_delivery_order_quote (shipping_quote_id),
    ADD CONSTRAINT fk_delivery_order_quote
        FOREIGN KEY (shipping_quote_id) REFERENCES shipping_quotes (quote_id);
