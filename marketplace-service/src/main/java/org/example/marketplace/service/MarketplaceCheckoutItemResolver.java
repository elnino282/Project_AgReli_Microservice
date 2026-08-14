package org.example.marketplace.service;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import lombok.RequiredArgsConstructor;
import org.example.marketplace.dto.request.MarketplaceCreateOrderRequest;
import org.example.marketplace.entity.MarketplaceCart;
import org.example.marketplace.entity.MarketplaceCartItem;
import org.example.marketplace.entity.MarketplaceProduct;
import org.example.marketplace.exception.BadRequestException;
import org.example.marketplace.exception.ResourceNotFoundException;
import org.example.marketplace.repository.MarketplaceCartRepository;
import org.example.marketplace.repository.MarketplaceProductRepository;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
@RequiredArgsConstructor
public class MarketplaceCheckoutItemResolver {
    private final MarketplaceCartRepository marketplaceCartRepository;
    private final MarketplaceProductRepository marketplaceProductRepository;

    @Transactional(readOnly = true)
    public Selection resolve(
            Long buyerUserId,
            List<MarketplaceCreateOrderRequest.MarketplaceOrderItemRequest> requestedItems) {
        if (requestedItems == null || requestedItems.isEmpty()) {
            MarketplaceCart cart = marketplaceCartRepository.findByUserIdWithItems(buyerUserId)
                    .orElseThrow(() -> new ResourceNotFoundException("Cart not found"));
            if (cart.getItems().isEmpty()) {
                throw new BadRequestException("Cart is empty");
            }
            return new Selection(cart.getItems(), cart);
        }

        Set<Long> seenProductIds = new HashSet<>();
        List<MarketplaceCartItem> resolved = new ArrayList<>();
        for (MarketplaceCreateOrderRequest.MarketplaceOrderItemRequest requested : requestedItems) {
            if (!seenProductIds.add(requested.productId())) {
                throw new BadRequestException("Duplicate product in checkout request: " + requested.productId());
            }
            if (requested.quantity() == null || requested.quantity().compareTo(BigDecimal.ZERO) <= 0) {
                throw new BadRequestException("Checkout quantity must be positive");
            }
            MarketplaceProduct product = marketplaceProductRepository.findByIdAndStatusIn(
                            requested.productId(), MarketplaceServiceImpl.PUBLIC_PRODUCT_STATUSES)
                    .orElseThrow(() -> new ResourceNotFoundException("Sellable product not found"));
            if (product.getStockQuantity() == null
                    || product.getStockQuantity().compareTo(requested.quantity()) < 0) {
                throw new BadRequestException("Requested quantity exceeds product stock");
            }
            resolved.add(MarketplaceCartItem.builder()
                    .product(product)
                    .farmerUserId(product.getFarmerUserId())
                    .quantity(requested.quantity())
                    .unitPriceSnapshot(product.getPrice())
                    .unitSnapshot(product.getUnit())
                    .lotId(product.getLotId())
                    .lotCode(product.getLotCode())
                    .build());
        }
        return new Selection(resolved, null);
    }

    public record Selection(List<MarketplaceCartItem> items, MarketplaceCart sourceCart) {
        public boolean fromCart() {
            return sourceCart != null;
        }
    }
}
