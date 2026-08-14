package org.example.marketplace.dto.request;

import jakarta.validation.constraints.NotBlank;
import java.util.List;

public record MarketplaceShippingQuoteRequest(
        Long addressId,
        @NotBlank String recipientProvince,
        List<MarketplaceCreateOrderRequest.MarketplaceOrderItemRequest> items) {
}
