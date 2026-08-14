package org.example.delivery.dto.request;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.NotBlank;

public record CreateDeliveryOrderRequest(
    @NotNull Long marketplaceOrderId,
    @NotBlank String shippingQuoteId,
    java.time.LocalDate requestedDeliveryDate,
    String deliveryZoneTo
) {}
