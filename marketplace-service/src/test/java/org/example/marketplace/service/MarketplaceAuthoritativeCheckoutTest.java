package org.example.marketplace.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicReference;
import org.example.marketplace.client.DeliveryShippingQuoteClient;
import org.example.marketplace.client.FarmClient;
import org.example.marketplace.client.IdentityClient;
import org.example.marketplace.client.InventoryClient;
import org.example.marketplace.client.SeasonClient;
import org.example.marketplace.dto.request.MarketplaceCreateOrderRequest;
import org.example.marketplace.entity.MarketplaceCartItem;
import org.example.marketplace.entity.MarketplaceOrder;
import org.example.marketplace.entity.MarketplaceOrderGroup;
import org.example.marketplace.entity.MarketplaceOrderItem;
import org.example.marketplace.entity.MarketplaceProduct;
import org.example.marketplace.event.DomainEventPublisher;
import org.example.marketplace.model.MarketplacePaymentMethod;
import org.example.marketplace.repository.MarketplaceAddressRepository;
import org.example.marketplace.repository.MarketplaceCartItemRepository;
import org.example.marketplace.repository.MarketplaceCartRepository;
import org.example.marketplace.repository.MarketplaceOrderAuditLogRepository;
import org.example.marketplace.repository.MarketplaceOrderGroupRepository;
import org.example.marketplace.repository.MarketplaceOrderItemRepository;
import org.example.marketplace.repository.MarketplaceOrderRepository;
import org.example.marketplace.repository.MarketplaceProductRepository;
import org.example.marketplace.repository.MarketplaceProductReviewRepository;
import org.example.marketplace.shared.security.CurrentUserService;
import org.example.marketplace.util.QRCodeGenerator;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class MarketplaceAuthoritativeCheckoutTest {
    @Mock MarketplaceProductRepository productRepository;
    @Mock MarketplaceCartRepository cartRepository;
    @Mock MarketplaceCartItemRepository cartItemRepository;
    @Mock MarketplaceOrderGroupRepository orderGroupRepository;
    @Mock MarketplaceOrderItemRepository orderItemRepository;
    @Mock MarketplaceOrderRepository orderRepository;
    @Mock MarketplaceAddressRepository addressRepository;
    @Mock MarketplaceProductReviewRepository reviewRepository;
    @Mock MarketplaceOrderAuditLogRepository auditLogRepository;
    @Mock FarmClient farmClient;
    @Mock SeasonClient seasonClient;
    @Mock InventoryClient inventoryClient;
    @Mock IdentityClient identityClient;
    @Mock CurrentUserService currentUserService;
    @Mock ObjectMapper objectMapper;
    @Mock IdempotencyService idempotencyService;
    @Mock MarketplaceStorageService storageService;
    @Mock QRCodeGenerator qrCodeGenerator;
    @Mock DomainEventPublisher domainEventPublisher;
    @Mock MarketplaceComplianceGateService complianceGateService;
    @Mock MarketplaceShippingQuoteService shippingQuoteService;
    @Mock MarketplaceCheckoutItemResolver checkoutItemResolver;
    @InjectMocks MarketplaceServiceImpl marketplaceService;

    @Test
    void marketplaceOrderPersistsExactlyTheAcceptedQuoteFeeAndWeight() {
        MarketplaceProduct product = MarketplaceProduct.builder()
                .id(10L).slug("rice").name("Rice").price(new BigDecimal("10000"))
                .unit("kg").stockQuantity(BigDecimal.TEN).farmerUserId(20L).farmId(30)
                .farmName("Farm").farmRegion("Lam Dong").shippingWeightKgPerUnit(BigDecimal.ONE)
                .perishable(false).requiresColdChain(false).lotId(40).lotCode("LOT-40").build();
        MarketplaceCartItem item = MarketplaceCartItem.builder()
                .product(product).farmerUserId(20L).quantity(new BigDecimal("2"))
                .lotId(40).lotCode("LOT-40").build();
        when(currentUserService.getCurrentUserId()).thenReturn(7L);
        when(idempotencyService.getExistingResponse(anyString(), anyString(), eq(org.example.marketplace.dto.response.MarketplaceCreateOrderResultResponse.class)))
                .thenReturn(Optional.empty());
        when(idempotencyService.tryAcquireLock(anyString(), anyString())).thenReturn(true);
        when(checkoutItemResolver.resolve(eq(7L), any()))
                .thenReturn(new MarketplaceCheckoutItemResolver.Selection(List.of(item), null));
        when(shippingQuoteService.validateAcceptedQuote("quote-1", 7L, 20L, 30, "HCM"))
                .thenReturn(new DeliveryShippingQuoteClient.ShippingQuote(
                        "quote-1", 20L, 30, 2, "Provider", "standard", "Lam Dong", "HCM",
                        new BigDecimal("2"), false, false, new BigDecimal("34567"), 24,
                        LocalDateTime.now().plusMinutes(10)));
        when(orderGroupRepository.save(any())).thenAnswer(invocation -> {
            MarketplaceOrderGroup group = invocation.getArgument(0);
            group.setId(50L);
            return group;
        });
        when(orderRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
        when(orderRepository.saveAndFlush(any())).thenAnswer(invocation -> {
            MarketplaceOrder order = invocation.getArgument(0);
            order.setId(60L);
            return order;
        });
        List<MarketplaceOrderItem> persistedItems = new ArrayList<>();
        when(orderItemRepository.save(any())).thenAnswer(invocation -> {
            MarketplaceOrderItem orderItem = invocation.getArgument(0);
            orderItem.setId(70L);
            persistedItems.add(orderItem);
            return orderItem;
        });
        when(orderItemRepository.findByOrderId(60L)).thenAnswer(ignored -> persistedItems);
        when(inventoryClient.reserveStock(anyString(), eq(60L), any()))
                .thenReturn(new InventoryClient.ReservationResult(true, "ok", List.of()));

        MarketplaceCreateOrderRequest request = new MarketplaceCreateOrderRequest(
                MarketplacePaymentMethod.COD, null, "Buyer", "0900", "Address", "HCM", null,
                "idem", false, null, null,
                List.of(new MarketplaceCreateOrderRequest.MarketplaceOrderItemRequest(10L, new BigDecimal("2"))),
                List.of(new MarketplaceCreateOrderRequest.AcceptedShippingQuote(20L, 30, "quote-1")));

        var result = marketplaceService.createOrder(request, "idem");

        ArgumentCaptor<MarketplaceOrder> orderCaptor = ArgumentCaptor.forClass(MarketplaceOrder.class);
        verify(orderRepository, org.mockito.Mockito.atLeastOnce()).save(orderCaptor.capture());
        MarketplaceOrder persisted = orderCaptor.getAllValues().getFirst();
        assertThat(persisted.getShippingFee()).isEqualByComparingTo("34567");
        assertThat(persisted.getShippingWeightKg()).isEqualByComparingTo("2");
        assertThat(persisted.getShippingQuoteId()).isEqualTo("quote-1");
        assertThat(persisted.getTotalAmount()).isEqualByComparingTo("54567");
        assertThat(result.totalAmount()).isEqualByComparingTo("54567");
        assertThat(result.orderShippingQuotes().getFirst().shippingQuoteId()).isEqualTo("quote-1");
    }
}
