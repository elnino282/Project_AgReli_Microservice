package org.example.delivery.client;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public record MarketplaceOrderDeliveryContext(
        Long orderId,
        Long buyerUserId,
        Long sellerUserId,
        Integer farmId,
        String shippingQuoteId,
        BigDecimal shippingFee,
        String recipientName,
        String recipientPhone,
        String recipientAddress,
        String recipientProvince,
        LocalDateTime orderCreatedAt) {
}
