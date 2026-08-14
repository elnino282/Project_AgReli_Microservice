package org.example.delivery.service;

import org.example.delivery.config.CurrentUserService;
import org.example.delivery.client.MarketplaceOrderClient;
import org.example.delivery.client.MarketplaceOrderDeliveryContext;
import org.example.delivery.dto.request.CreateDeliveryOrderRequest;
import org.example.delivery.entity.DeliveryOrder;
import org.example.delivery.entity.DeliveryProvider;
import org.example.delivery.entity.ShippingQuote;
import org.example.delivery.repository.DeliveryOrderRepository;
import org.example.delivery.repository.DeliveryProviderRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.access.AccessDeniedException;

import java.util.Optional;
import java.math.BigDecimal;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class DeliveryServiceAuthorizationTest {

    @Mock
    private ShippingFeeCalculator shippingFeeCalculator;

    @Mock
    private DeliveryOrderRepository deliveryOrderRepository;

    @Mock
    private DeliveryProviderRepository deliveryProviderRepository;

    @Mock
    private CurrentUserService currentUserService;

    @Mock
    private ShippingQuoteService shippingQuoteService;

    @Mock
    private MarketplaceOrderClient marketplaceOrderClient;

    @InjectMocks
    private DeliveryService deliveryService;

    @Test
    void buyerCannotReadAnotherBuyersDelivery() {
        DeliveryOrder order = DeliveryOrder.builder().id(10).buyerUserId(22L).build();
        when(deliveryOrderRepository.findById(10)).thenReturn(Optional.of(order));
        when(currentUserService.getCurrentRole()).thenReturn("BUYER");
        when(currentUserService.getCurrentUserId()).thenReturn(11L);

        assertThrows(AccessDeniedException.class, () -> deliveryService.getDeliveryOrder(10));
    }

    @Test
    void buyerCannotCreateDeliveryForAnotherBuyersMarketplaceOrder() {
        when(currentUserService.getCurrentUserId()).thenReturn(11L);
        when(marketplaceOrderClient.getDeliveryContext(99L)).thenReturn(
                new MarketplaceOrderDeliveryContext(
                        99L, 22L, 33L, 44, "quote-1", null,
                        "Buyer", "0900000000", "Address", "Lam Dong"));

        CreateDeliveryOrderRequest request = new CreateDeliveryOrderRequest(
                99L,
                "quote-1",
                null,
                null);

        assertThrows(AccessDeniedException.class,
                () -> deliveryService.createDeliveryOrder(request));
        verify(shippingQuoteService, never()).consumeQuote(any(), any(), any(), any(), any(), any());
        verify(deliveryOrderRepository, never()).save(any());
    }

    @Test
    void deliveryPersistsFeeAndWeightFromQuoteInsteadOfBrowserInput() {
        when(currentUserService.getCurrentUserId()).thenReturn(11L);
        when(marketplaceOrderClient.getDeliveryContext(99L)).thenReturn(
                new MarketplaceOrderDeliveryContext(
                        99L, 11L, 33L, 44, "quote-1", new BigDecimal("45000"),
                        "Buyer", "0900000000", "Address", "HCM"));
        ShippingQuote quote = ShippingQuote.builder()
                .quoteId("quote-1").buyerUserId(11L).sellerUserId(33L).farmId(44)
                .providerId(2).shippingFeeVnd(new BigDecimal("45000"))
                .weightKg(new BigDecimal("3.5")).estimatedHours(18)
                .perishable(true).requiresColdChain(true).build();
        when(shippingQuoteService.consumeQuote("quote-1", 11L, 33L, 44, "HCM", 99L))
                .thenReturn(quote);
        when(deliveryProviderRepository.findById(2))
                .thenReturn(Optional.of(DeliveryProvider.builder().id(2).build()));
        when(deliveryOrderRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));

        DeliveryOrder created = deliveryService.createDeliveryOrder(
                new CreateDeliveryOrderRequest(99L, "quote-1", null, null));

        org.assertj.core.api.Assertions.assertThat(created.getShippingFeeVnd())
                .isEqualByComparingTo("45000");
        org.assertj.core.api.Assertions.assertThat(created.getWeightKg())
                .isEqualByComparingTo("3.5");
        org.assertj.core.api.Assertions.assertThat(created.getRecipientAddress())
                .isEqualTo("Address");
    }
}
