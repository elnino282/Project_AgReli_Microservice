package org.example.delivery.service;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Optional;
import org.example.delivery.dto.request.IssueShippingQuotesRequest;
import org.example.delivery.dto.request.ValidateShippingQuoteRequest;
import org.example.delivery.entity.ShippingQuote;
import org.example.delivery.repository.DeliveryProviderRepository;
import org.example.delivery.repository.ShippingQuoteRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class ShippingQuoteServiceTest {
    @Mock ShippingFeeCalculator shippingFeeCalculator;
    @Mock ShippingQuoteRepository shippingQuoteRepository;
    @Mock DeliveryProviderRepository deliveryProviderRepository;
    @InjectMocks ShippingQuoteService shippingQuoteService;

    @Test
    void issueRejectsMissingAuthoritativeWeightBeforeCalculatingFee() {
        IssueShippingQuotesRequest request = new IssueShippingQuotesRequest(
                1L, 2L, 3, "Lam Dong", "HCM", BigDecimal.ZERO, false, false);

        assertThrows(IllegalArgumentException.class, () -> shippingQuoteService.issueQuotes(request));
        verify(shippingFeeCalculator, never()).calculateOptions(any());
        verify(shippingQuoteRepository, never()).save(any());
    }

    @Test
    void expiredQuoteCannotBeValidatedOrConsumed() {
        ShippingQuote quote = ShippingQuote.builder()
                .quoteId("expired")
                .buyerUserId(1L)
                .sellerUserId(2L)
                .farmId(3)
                .recipientProvince("HCM")
                .weightKg(BigDecimal.ONE)
                .shippingFeeVnd(BigDecimal.TEN)
                .expiresAt(LocalDateTime.now().minusSeconds(1))
                .build();
        when(shippingQuoteRepository.findById("expired")).thenReturn(Optional.of(quote));

        assertThrows(IllegalArgumentException.class, () -> shippingQuoteService.validateQuote(
                new ValidateShippingQuoteRequest("expired", 1L, 2L, 3, "HCM")));
        verify(shippingQuoteRepository, never()).save(any());
    }

    @Test
    void quoteForAnotherBuyerOrGroupIsRejected() {
        ShippingQuote quote = ShippingQuote.builder()
                .quoteId("quote")
                .buyerUserId(10L)
                .sellerUserId(20L)
                .farmId(30)
                .recipientProvince("HCM")
                .weightKg(BigDecimal.ONE)
                .shippingFeeVnd(BigDecimal.TEN)
                .expiresAt(LocalDateTime.now().plusMinutes(5))
                .build();
        when(shippingQuoteRepository.findById("quote")).thenReturn(Optional.of(quote));

        assertThrows(IllegalArgumentException.class, () -> shippingQuoteService.validateQuote(
                new ValidateShippingQuoteRequest("quote", 11L, 20L, 30, "HCM")));
    }

    @Test
    void delayedConsumerCanUseQuoteThatWasValidWhenOrderWasAccepted() {
        LocalDateTime orderCreatedAt = LocalDateTime.now().minusMinutes(2);
        ShippingQuote quote = ShippingQuote.builder()
                .quoteId("accepted").buyerUserId(1L).sellerUserId(2L).farmId(3)
                .recipientProvince("HCM").weightKg(BigDecimal.ONE).shippingFeeVnd(BigDecimal.TEN)
                .expiresAt(LocalDateTime.now().minusMinutes(1)).build();
        when(shippingQuoteRepository.findForUpdateByQuoteId("accepted")).thenReturn(Optional.of(quote));
        when(shippingQuoteRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));

        shippingQuoteService.consumeAcceptedQuote(
                "accepted", 1L, 2L, 3, "HCM", 99L, orderCreatedAt);

        verify(shippingQuoteRepository).save(quote);
    }
}
