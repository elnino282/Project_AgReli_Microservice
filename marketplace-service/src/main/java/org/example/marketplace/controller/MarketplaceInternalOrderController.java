package org.example.marketplace.controller;

import lombok.RequiredArgsConstructor;
import org.example.marketplace.dto.response.MarketplaceOrderDeliveryContext;
import org.example.marketplace.entity.MarketplaceOrder;
import org.example.marketplace.exception.ResourceNotFoundException;
import org.example.marketplace.repository.MarketplaceOrderRepository;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.security.access.prepost.PreAuthorize;

@RestController
@RequestMapping("/api/v1/internal/marketplace/orders")
@PreAuthorize("permitAll()")
@RequiredArgsConstructor
public class MarketplaceInternalOrderController {
    private final MarketplaceOrderRepository marketplaceOrderRepository;

    @GetMapping("/{orderId}/delivery-context")
    public MarketplaceOrderDeliveryContext getDeliveryContext(@PathVariable Long orderId) {
        MarketplaceOrder order = marketplaceOrderRepository.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Marketplace order not found"));
        if (order.getShippingQuoteId() == null || order.getFarmId() == null
                || order.getShippingDestinationProvince() == null) {
            throw new ResourceNotFoundException("Marketplace order has no accepted shipping quote");
        }
        return new MarketplaceOrderDeliveryContext(
                order.getId(), order.getBuyerUserId(), order.getFarmerUserId(), order.getFarmId(),
                order.getShippingQuoteId(), order.getShippingFee(), order.getShippingRecipientName(),
                order.getShippingPhone(), order.getShippingAddressLine(), order.getShippingDestinationProvince(),
                order.getCreatedAt());
    }
}
