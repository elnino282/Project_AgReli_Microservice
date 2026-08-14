package org.example.delivery.client;

public interface MarketplaceOrderClient {
    MarketplaceOrderDeliveryContext getDeliveryContext(Long orderId);
}
