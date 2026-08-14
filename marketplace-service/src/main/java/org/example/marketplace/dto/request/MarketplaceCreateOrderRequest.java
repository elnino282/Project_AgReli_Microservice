package org.example.marketplace.dto.request;

import jakarta.validation.constraints.NotNull;
import org.example.marketplace.model.MarketplacePaymentMethod;

import java.math.BigDecimal;
import java.util.List;

public record MarketplaceCreateOrderRequest(
        @NotNull MarketplacePaymentMethod paymentMethod,
        Long addressId,
        String shippingRecipientName,
        String shippingPhone,
        String shippingAddressLine,
        String shippingProvince,
        String note,
        String idempotencyKey,
        Boolean isPreOrder,
        java.time.LocalDate requestedDeliveryDate,
        java.time.LocalDate harvestReadyDate,
        List<MarketplaceOrderItemRequest> items,
        List<AcceptedShippingQuote> shippingQuotes) {

    public MarketplaceCreateOrderRequest(
            MarketplacePaymentMethod paymentMethod,
            Long addressId,
            String shippingRecipientName,
            String shippingPhone,
            String shippingAddressLine,
            String note,
            String idempotencyKey) {
        this(paymentMethod, addressId, shippingRecipientName, shippingPhone, shippingAddressLine, null,
                note, idempotencyKey, false, null, null, null, null);
    }

    public record MarketplaceOrderItemRequest(
            @NotNull Long productId,
            @NotNull BigDecimal quantity) {
    }

    public record AcceptedShippingQuote(
            @NotNull Long sellerUserId,
            @NotNull Integer farmId,
            @NotNull String quoteId) {
    }
}
