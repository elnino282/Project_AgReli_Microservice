package org.example.marketplace.dto.response;

import java.math.BigDecimal;

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
        String recipientProvince) {
}
