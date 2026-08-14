ALTER TABLE delivery_orders
    ADD COLUMN buyer_user_id BIGINT NULL AFTER marketplace_order_id,
    ADD INDEX idx_delivery_buyer (buyer_user_id);

