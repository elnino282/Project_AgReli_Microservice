package org.example.delivery.dto.request;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;

public record IssueShippingQuotesRequest(
        @NotNull Long buyerUserId,
        @NotNull Long sellerUserId,
        @NotNull Integer farmId,
        @NotBlank String senderProvince,
        @NotBlank String recipientProvince,
        @NotNull @DecimalMin(value = "0.0", inclusive = false) BigDecimal weightKg,
        boolean perishable,
        boolean requiresColdChain) {
}
