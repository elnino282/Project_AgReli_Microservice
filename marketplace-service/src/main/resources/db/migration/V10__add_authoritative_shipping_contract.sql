ALTER TABLE marketplace_products
    ADD COLUMN shipping_weight_kg_per_unit DECIMAL(10,3) NULL AFTER stock_quantity,
    ADD COLUMN is_perishable BOOLEAN NOT NULL DEFAULT FALSE AFTER shipping_weight_kg_per_unit,
    ADD COLUMN requires_cold_chain BOOLEAN NOT NULL DEFAULT FALSE AFTER is_perishable;

ALTER TABLE marketplace_orders
    ADD COLUMN farm_id INT NULL AFTER farmer_user_id,
    ADD COLUMN shipping_quote_id VARCHAR(36) NULL AFTER shipping_fee,
    ADD COLUMN shipping_weight_kg DECIMAL(10,3) NULL AFTER shipping_quote_id,
    ADD COLUMN shipping_provider_id INT NULL AFTER shipping_weight_kg,
    ADD COLUMN shipping_origin_province VARCHAR(100) NULL AFTER shipping_provider_id,
    ADD COLUMN shipping_destination_province VARCHAR(100) NULL AFTER shipping_origin_province,
    ADD UNIQUE KEY uk_marketplace_order_shipping_quote (shipping_quote_id);
