package org.example.delivery.dto.response;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public record ShippingQuoteResponse(
        String quoteId,
        Long sellerUserId,
        Integer farmId,
        Integer providerId,
        String providerName,
        String serviceType,
        String senderProvince,
        String recipientProvince,
        BigDecimal weightKg,
        boolean perishable,
        boolean requiresColdChain,
        BigDecimal shippingFeeVnd,
        int estimatedHours,
        LocalDateTime expiresAt) {
}
