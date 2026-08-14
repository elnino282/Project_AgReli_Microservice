package org.example.marketplace.dto.response;

import java.math.BigDecimal;
import java.util.List;

public record MarketplaceCreateOrderResultResponse(
        Long orderGroupId,
        List<Long> orderIds,
        BigDecimal totalAmount,
        String currency,
        String message,
        String nextStep,
        List<OrderShippingQuote> orderShippingQuotes) {

    public record OrderShippingQuote(
            Long orderId,
            String shippingQuoteId) {
    }
}
