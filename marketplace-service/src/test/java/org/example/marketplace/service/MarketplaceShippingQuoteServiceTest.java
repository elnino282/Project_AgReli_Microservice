package org.example.marketplace.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import org.example.marketplace.client.DeliveryShippingQuoteClient;
import org.example.marketplace.dto.request.MarketplaceShippingQuoteRequest;
import org.example.marketplace.entity.MarketplaceCart;
import org.example.marketplace.entity.MarketplaceCartItem;
import org.example.marketplace.entity.MarketplaceProduct;
import org.example.marketplace.exception.BadRequestException;
import org.example.marketplace.repository.MarketplaceAddressRepository;
import org.example.marketplace.repository.MarketplaceCartRepository;
import org.example.marketplace.shared.security.CurrentUserService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class MarketplaceShippingQuoteServiceTest {
    @Mock MarketplaceCheckoutItemResolver checkoutItemResolver;
    @Mock MarketplaceAddressRepository marketplaceAddressRepository;
    @Mock DeliveryShippingQuoteClient deliveryShippingQuoteClient;
    @Mock CurrentUserService currentUserService;
    @InjectMocks MarketplaceShippingQuoteService shippingQuoteService;

    @Test
    void createsIndependentAuthoritativeQuotesPerSellerAndFarm() {
        MarketplaceCartItem first = item(product(1L, 10L, 100, "Lam Dong", new BigDecimal("1.5")), 2);
        MarketplaceCartItem second = item(product(2L, 20L, 200, "HCM", new BigDecimal("0.25")), 4);
        MarketplaceCart cart = MarketplaceCart.builder().userId(7L).items(List.of(first, second)).build();
        when(currentUserService.getCurrentUserId()).thenReturn(7L);
        when(checkoutItemResolver.resolve(7L, null))
                .thenReturn(new MarketplaceCheckoutItemResolver.Selection(cart.getItems(), cart));
        when(deliveryShippingQuoteClient.issueQuotes(any())).thenAnswer(invocation -> {
            DeliveryShippingQuoteClient.IssueQuotesRequest request = invocation.getArgument(0);
            return List.of(new DeliveryShippingQuoteClient.ShippingQuote(
                    "q-" + request.farmId(), request.sellerUserId(), request.farmId(), 1, "Provider",
                    "standard", request.senderProvince(), request.recipientProvince(), request.weightKg(),
                    request.perishable(), request.requiresColdChain(), BigDecimal.TEN, 24,
                    LocalDateTime.now().plusMinutes(15)));
        });

        var groups = shippingQuoteService.quoteCart(new MarketplaceShippingQuoteRequest(null, "Ha Noi", null));

        assertThat(groups).hasSize(2);
        assertThat(groups).extracting(group -> group.options().getFirst().quoteId())
                .containsExactly("q-100", "q-200");
        ArgumentCaptor<DeliveryShippingQuoteClient.IssueQuotesRequest> captor =
                ArgumentCaptor.forClass(DeliveryShippingQuoteClient.IssueQuotesRequest.class);
        verify(deliveryShippingQuoteClient, org.mockito.Mockito.times(2)).issueQuotes(captor.capture());
        assertThat(captor.getAllValues()).extracting(DeliveryShippingQuoteClient.IssueQuotesRequest::weightKg)
                .containsExactly(new BigDecimal("3.0"), new BigDecimal("1.00"));
    }

    @Test
    void missingAuthoritativeProductWeightFailsClosed() {
        MarketplaceCart cart = MarketplaceCart.builder().userId(7L)
                .items(List.of(item(product(1L, 10L, 100, "Lam Dong", null), 1)))
                .build();
        when(currentUserService.getCurrentUserId()).thenReturn(7L);
        when(checkoutItemResolver.resolve(7L, null))
                .thenReturn(new MarketplaceCheckoutItemResolver.Selection(cart.getItems(), cart));

        assertThrows(BadRequestException.class,
                () -> shippingQuoteService.quoteCart(new MarketplaceShippingQuoteRequest(null, "Ha Noi", null)));
        verify(deliveryShippingQuoteClient, never()).issueQuotes(any());
    }

    private static MarketplaceProduct product(
            Long id, Long sellerId, Integer farmId, String region, BigDecimal weight) {
        return MarketplaceProduct.builder()
                .id(id)
                .farmerUserId(sellerId)
                .farmId(farmId)
                .farmName("Farm " + farmId)
                .farmRegion(region)
                .shippingWeightKgPerUnit(weight)
                .perishable(false)
                .requiresColdChain(false)
                .build();
    }

    private static MarketplaceCartItem item(MarketplaceProduct product, int quantity) {
        return MarketplaceCartItem.builder()
                .product(product)
                .farmerUserId(product.getFarmerUserId())
                .quantity(BigDecimal.valueOf(quantity))
                .build();
    }
}
