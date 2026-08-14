package org.example.marketplace.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.when;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import org.example.marketplace.dto.request.MarketplaceCreateOrderRequest;
import org.example.marketplace.entity.MarketplaceProduct;
import org.example.marketplace.exception.BadRequestException;
import org.example.marketplace.model.MarketplaceProductStatus;
import org.example.marketplace.repository.MarketplaceCartRepository;
import org.example.marketplace.repository.MarketplaceProductRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class MarketplaceCheckoutItemResolverTest {
    @Mock MarketplaceCartRepository marketplaceCartRepository;
    @Mock MarketplaceProductRepository marketplaceProductRepository;
    @InjectMocks MarketplaceCheckoutItemResolver resolver;

    @Test
    void buyNowUsesTheRequestedProductInsteadOfAnUnrelatedCart() {
        MarketplaceProduct product = MarketplaceProduct.builder()
                .id(5L).farmerUserId(8L).price(BigDecimal.TEN).unit("kg")
                .stockQuantity(BigDecimal.TEN).status(MarketplaceProductStatus.ACTIVE).build();
        when(marketplaceProductRepository.findByIdAndStatusIn(
                5L, MarketplaceServiceImpl.PUBLIC_PRODUCT_STATUSES)).thenReturn(Optional.of(product));

        var selection = resolver.resolve(1L, List.of(
                new MarketplaceCreateOrderRequest.MarketplaceOrderItemRequest(5L, new BigDecimal("2"))));

        assertThat(selection.fromCart()).isFalse();
        assertThat(selection.items()).singleElement().satisfies(item -> {
            assertThat(item.getProduct().getId()).isEqualTo(5L);
            assertThat(item.getQuantity()).isEqualByComparingTo("2");
        });
    }

    @Test
    void duplicateBuyNowProductFailsClosed() {
        var item = new MarketplaceCreateOrderRequest.MarketplaceOrderItemRequest(5L, BigDecimal.ONE);
        when(marketplaceProductRepository.findByIdAndStatusIn(
                5L, MarketplaceServiceImpl.PUBLIC_PRODUCT_STATUSES)).thenReturn(Optional.of(
                        MarketplaceProduct.builder().id(5L).farmerUserId(8L).price(BigDecimal.TEN)
                                .unit("kg").stockQuantity(BigDecimal.TEN).build()));

        assertThrows(BadRequestException.class, () -> resolver.resolve(1L, List.of(item, item)));
    }
}
