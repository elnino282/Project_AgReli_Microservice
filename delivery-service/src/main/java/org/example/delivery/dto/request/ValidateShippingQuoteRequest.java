package org.example.delivery.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record ValidateShippingQuoteRequest(
        @NotBlank String quoteId,
        @NotNull Long buyerUserId,
        @NotNull Long sellerUserId,
        @NotNull Integer farmId,
        @NotBlank String recipientProvince) {
}
