package org.example.marketplace.dto.response;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

public record MarketplaceShippingQuoteGroupResponse(
        Long sellerUserId,
        Integer farmId,
        String farmName,
        String senderProvince,
        BigDecimal weightKg,
        boolean perishable,
        boolean requiresColdChain,
        List<Option> options) {

    public record Option(
            String quoteId,
            Integer providerId,
            String providerName,
            String serviceType,
            BigDecimal shippingFeeVnd,
            int estimatedHours,
            LocalDateTime expiresAt) {
    }
}
