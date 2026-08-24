package org.example.delivery.service;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.example.delivery.dto.request.CalculateShippingRequest;
import org.example.delivery.dto.request.IssueShippingQuotesRequest;
import org.example.delivery.dto.request.ValidateShippingQuoteRequest;
import org.example.delivery.dto.response.ShippingOption;
import org.example.delivery.dto.response.ShippingQuoteResponse;
import org.example.delivery.entity.DeliveryProvider;
import org.example.delivery.entity.ShippingQuote;
import org.example.delivery.repository.DeliveryProviderRepository;
import org.example.delivery.repository.ShippingQuoteRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class ShippingQuoteService {
    static final int QUOTE_TTL_MINUTES = 15;

    private final ShippingFeeCalculator shippingFeeCalculator;
    private final ShippingQuoteRepository shippingQuoteRepository;
    private final DeliveryProviderRepository deliveryProviderRepository;
    private final Clock clock = Clock.systemDefaultZone();

    @Transactional
    public List<ShippingQuoteResponse> issueQuotes(IssueShippingQuotesRequest request) {
        requirePositive(request.weightKg(), "Authoritative shipping weight must be positive");
        CalculateShippingRequest calculation = new CalculateShippingRequest(
                request.senderProvince(), request.recipientProvince(), request.weightKg(),
                request.requiresColdChain(), false, null, null, null, null, false);
        List<ShippingOption> options = shippingFeeCalculator.calculateOptions(calculation);
        if (options.isEmpty()) {
            throw new IllegalArgumentException("No delivery rate is available for this seller/farm group");
        }

        LocalDateTime expiresAt = LocalDateTime.now(clock).plusMinutes(QUOTE_TTL_MINUTES);
        Map<Integer, DeliveryProvider> providers = deliveryProviderRepository.findAllById(
                        options.stream().map(ShippingOption::providerId).distinct().toList())
                .stream().collect(Collectors.toMap(DeliveryProvider::getId, Function.identity()));

        return options.stream().map(option -> {
            requirePositive(option.shippingFeeVnd(), "Calculated shipping fee must be positive");
            ShippingQuote quote = ShippingQuote.builder()
                    .quoteId(UUID.randomUUID().toString())
                    .buyerUserId(request.buyerUserId())
                    .sellerUserId(request.sellerUserId())
                    .farmId(request.farmId())
                    .providerId(option.providerId())
                    .serviceType(option.type())
                    .senderProvince(request.senderProvince().trim())
                    .recipientProvince(request.recipientProvince().trim())
                    .weightKg(request.weightKg())
                    .perishable(request.perishable())
                    .requiresColdChain(request.requiresColdChain())
                    .shippingFeeVnd(option.shippingFeeVnd())
                    .estimatedHours(option.estimatedHours())
                    .expiresAt(expiresAt)
                    .build();
            ShippingQuote saved = shippingQuoteRepository.save(quote);
            String providerName = providers.containsKey(option.providerId())
                    ? providers.get(option.providerId()).getName()
                    : option.providerName();
            return toResponse(saved, providerName);
        }).toList();
    }

    @Transactional(readOnly = true)
    public ShippingQuoteResponse validateQuote(ValidateShippingQuoteRequest request) {
        ShippingQuote quote = shippingQuoteRepository.findById(request.quoteId())
                .orElseThrow(() -> new IllegalArgumentException("Shipping quote not found"));
        validateIdentityAndState(quote, request.buyerUserId(), request.sellerUserId(),
                request.farmId(), request.recipientProvince(), null);
        String providerName = deliveryProviderRepository.findById(quote.getProviderId())
                .map(DeliveryProvider::getName)
                .orElseThrow(() -> new IllegalArgumentException("Shipping provider is unavailable"));
        return toResponse(quote, providerName);
    }

    @Transactional
    public ShippingQuote consumeQuote(
            String quoteId,
            Long buyerUserId,
            Long sellerUserId,
            Integer farmId,
            String recipientProvince,
            Long marketplaceOrderId) {
        return consumeAcceptedQuote(quoteId, buyerUserId, sellerUserId, farmId,
                recipientProvince, marketplaceOrderId, null);
    }

    @Transactional
    public ShippingQuote consumeAcceptedQuote(
            String quoteId,
            Long buyerUserId,
            Long sellerUserId,
            Integer farmId,
            String recipientProvince,
            Long marketplaceOrderId,
            LocalDateTime orderCreatedAt) {
        ShippingQuote quote = shippingQuoteRepository.findForUpdateByQuoteId(quoteId)
                .orElseThrow(() -> new IllegalArgumentException("Shipping quote not found"));
        validateIdentityAndState(quote, buyerUserId, sellerUserId, farmId, recipientProvince, orderCreatedAt);
        quote.setConsumedAt(LocalDateTime.now(clock));
        quote.setMarketplaceOrderId(marketplaceOrderId);
        return shippingQuoteRepository.save(quote);
    }

    private void validateIdentityAndState(
            ShippingQuote quote,
            Long buyerUserId,
            Long sellerUserId,
            Integer farmId,
            String recipientProvince,
            LocalDateTime acceptedAt) {
        if (!quote.getBuyerUserId().equals(buyerUserId)
                || !quote.getSellerUserId().equals(sellerUserId)
                || !quote.getFarmId().equals(farmId)
                || !quote.getRecipientProvince().equalsIgnoreCase(recipientProvince.trim())) {
            throw new IllegalArgumentException("Shipping quote does not match this buyer/order group");
        }
        if (quote.getConsumedAt() != null || quote.getMarketplaceOrderId() != null) {
            throw new IllegalArgumentException("Shipping quote has already been consumed");
        }
        LocalDateTime expiryReference = acceptedAt == null ? LocalDateTime.now(clock) : acceptedAt;
        if (!quote.getExpiresAt().isAfter(expiryReference)) {
            throw new IllegalArgumentException("Shipping quote has expired");
        }
        requirePositive(quote.getWeightKg(), "Shipping quote weight must be positive");
        requirePositive(quote.getShippingFeeVnd(), "Shipping quote fee must be positive");
    }

    private static void requirePositive(BigDecimal value, String message) {
        if (value == null || value.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException(message);
        }
    }

    private static ShippingQuoteResponse toResponse(ShippingQuote quote, String providerName) {
        return new ShippingQuoteResponse(
                quote.getQuoteId(), quote.getSellerUserId(), quote.getFarmId(), quote.getProviderId(),
                providerName, quote.getServiceType(), quote.getSenderProvince(), quote.getRecipientProvince(),
                quote.getWeightKg(), Boolean.TRUE.equals(quote.getPerishable()),
                Boolean.TRUE.equals(quote.getRequiresColdChain()), quote.getShippingFeeVnd(),
                quote.getEstimatedHours(), quote.getExpiresAt());
    }
}
