package org.example.delivery.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.example.delivery.dto.request.CalculateShippingRequest;
import org.example.delivery.dto.request.CreateDeliveryOrderRequest;
import org.example.delivery.dto.response.ShippingOption;
import org.example.delivery.entity.ShippingQuote;
import org.example.delivery.entity.DeliveryOrder;
import org.example.delivery.entity.enums.DeliveryStatus;
import org.example.delivery.repository.DeliveryOrderRepository;
import org.example.delivery.repository.DeliveryProviderRepository;
import org.example.delivery.config.CurrentUserService;
import org.example.delivery.client.MarketplaceOrderClient;
import org.example.delivery.client.MarketplaceOrderDeliveryContext;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class DeliveryService {

    private final ShippingFeeCalculator shippingFeeCalculator;
    private final DeliveryOrderRepository deliveryOrderRepository;
    private final DeliveryProviderRepository deliveryProviderRepository;
    private final CurrentUserService currentUserService;
    private final ShippingQuoteService shippingQuoteService;
    private final MarketplaceOrderClient marketplaceOrderClient;

    public List<ShippingOption> calculateShippingOptions(CalculateShippingRequest request) {
        return shippingFeeCalculator.calculateOptions(request);
    }

    @Transactional
    public DeliveryOrder createDeliveryOrder(CreateDeliveryOrderRequest request) {
        log.info("Creating delivery order for marketplace order: {}", request.marketplaceOrderId());

        Long buyerUserId = currentUserService.getCurrentUserId();
        MarketplaceOrderDeliveryContext context = marketplaceOrderClient.getDeliveryContext(request.marketplaceOrderId());
        if (!request.marketplaceOrderId().equals(context.orderId())
                || !buyerUserId.equals(context.buyerUserId())
                || !request.shippingQuoteId().equals(context.shippingQuoteId())) {
            throw new AccessDeniedException("Marketplace order does not belong to this buyer/quote");
        }
        return provisionDelivery(context, request.requestedDeliveryDate(), request.deliveryZoneTo());
    }

    @Transactional
    public DeliveryOrder createDeliveryOrderFromMarketplaceEvent(Long marketplaceOrderId, Long eventBuyerUserId) {
        DeliveryOrder existing = deliveryOrderRepository.findFirstByMarketplaceOrderId(marketplaceOrderId)
                .orElse(null);
        if (existing != null) {
            return existing;
        }
        MarketplaceOrderDeliveryContext context = marketplaceOrderClient.getDeliveryContext(marketplaceOrderId);
        if (!marketplaceOrderId.equals(context.orderId()) || !eventBuyerUserId.equals(context.buyerUserId())) {
            throw new AccessDeniedException("Marketplace event does not match the persisted order owner");
        }
        return provisionDelivery(context, null, null);
    }

    private DeliveryOrder provisionDelivery(
            MarketplaceOrderDeliveryContext context,
            java.time.LocalDate requestedDeliveryDate,
            String deliveryZoneTo) {
        ShippingQuote quote = shippingQuoteService.consumeAcceptedQuote(
                context.shippingQuoteId(), context.buyerUserId(), context.sellerUserId(), context.farmId(),
                context.recipientProvince(), context.orderId(), context.orderCreatedAt());
        if (context.shippingFee() == null || context.shippingFee().compareTo(quote.getShippingFeeVnd()) != 0) {
            throw new IllegalArgumentException("Marketplace order shipping fee does not match the accepted quote");
        }

        deliveryProviderRepository.findById(quote.getProviderId())
                .orElseThrow(() -> new IllegalArgumentException("Shipping provider is unavailable"));

        // Generate a random mock tracking number
        String trackingNumber = "VTF" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();

        DeliveryOrder order = DeliveryOrder.builder()
                .marketplaceOrderId(context.orderId())
                .shippingQuoteId(quote.getQuoteId())
                .buyerUserId(context.buyerUserId())
                .providerId(quote.getProviderId())
                .trackingNumber(trackingNumber)
                .status(DeliveryStatus.PENDING)
                .shippingFeeVnd(quote.getShippingFeeVnd())
                .isPerishable(quote.getPerishable())
                .requiresColdChain(quote.getRequiresColdChain())
                .recipientName(context.recipientName())
                .recipientPhone(context.recipientPhone())
                .recipientAddress(context.recipientAddress())
                .recipientProvince(context.recipientProvince())
                .weightKg(quote.getWeightKg())
                .estimatedDelivery(LocalDateTime.now().plusHours(quote.getEstimatedHours()))
                .requestedDeliveryDate(requestedDeliveryDate)
                .deliveryZoneTo(deliveryZoneTo)
                .build();

        return deliveryOrderRepository.save(order);
    }

    public org.example.delivery.dto.response.BatchSuggestionResponse getBatchSuggestions(java.time.LocalDate date, String zone) {
        long count = deliveryOrderRepository.countByRequestedDeliveryDateAndDeliveryZoneTo(date, zone);
        boolean batchEligible = count >= 5;
        return new org.example.delivery.dto.response.BatchSuggestionResponse(batchEligible, date, zone, count, 5L);
    }

    public List<DeliveryOrder> getAllDeliveryOrders() {
        if (isAdmin()) {
            return deliveryOrderRepository.findAll();
        }
        return deliveryOrderRepository.findByBuyerUserId(currentUserService.getCurrentUserId());
    }

    public DeliveryOrder getDeliveryOrder(Integer id) {
        DeliveryOrder order = deliveryOrderRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Delivery order not found with ID: " + id));
        requireOwnerOrAdmin(order);
        return order;
    }

    public List<DeliveryOrder> getDeliveryOrdersByMarketplaceOrder(Long marketplaceOrderId) {
        if (isAdmin()) {
            return deliveryOrderRepository.findByMarketplaceOrderId(marketplaceOrderId);
        }
        return deliveryOrderRepository.findByMarketplaceOrderIdAndBuyerUserId(
                marketplaceOrderId, currentUserService.getCurrentUserId());
    }

    @Transactional
    public DeliveryOrder updateDeliveryStatus(Integer id, DeliveryStatus status) {
        log.info("Updating delivery order {} status to {}", id, status);
        DeliveryOrder order = getDeliveryOrder(id);
        order.setStatus(status);

        if (status == DeliveryStatus.DELIVERED) {
            order.setActualDelivery(LocalDateTime.now());
        }

        return deliveryOrderRepository.save(order);
    }

    private boolean isAdmin() {
        String role = currentUserService.getCurrentRole();
        return "ADMIN".equalsIgnoreCase(role) || "ROLE_ADMIN".equalsIgnoreCase(role);
    }

    private void requireOwnerOrAdmin(DeliveryOrder order) {
        if (isAdmin()) {
            return;
        }
        Long currentUserId = currentUserService.getCurrentUserId();
        if (order.getBuyerUserId() == null || !order.getBuyerUserId().equals(currentUserId)) {
            throw new AccessDeniedException("Delivery order does not belong to the current user");
        }
    }
}
