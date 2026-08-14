package org.example.marketplace.service;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.example.marketplace.client.DeliveryShippingQuoteClient;
import org.example.marketplace.dto.request.MarketplaceShippingQuoteRequest;
import org.example.marketplace.dto.response.MarketplaceShippingQuoteGroupResponse;
import org.example.marketplace.entity.MarketplaceCartItem;
import org.example.marketplace.entity.MarketplaceProduct;
import org.example.marketplace.exception.BadRequestException;
import org.example.marketplace.exception.ResourceNotFoundException;
import org.example.marketplace.repository.MarketplaceAddressRepository;
import org.example.marketplace.shared.security.CurrentUserService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class MarketplaceShippingQuoteService {
    private final MarketplaceCheckoutItemResolver checkoutItemResolver;
    private final MarketplaceAddressRepository marketplaceAddressRepository;
    private final DeliveryShippingQuoteClient deliveryShippingQuoteClient;
    private final CurrentUserService currentUserService;

    @Transactional(readOnly = true)
    public List<MarketplaceShippingQuoteGroupResponse> quoteCart(MarketplaceShippingQuoteRequest request) {
        Long buyerUserId = currentUserService.getCurrentUserId();
        List<MarketplaceCartItem> checkoutItems = checkoutItemResolver.resolve(buyerUserId, request.items()).items();

        String recipientProvince = request.recipientProvince().trim();
        if (request.addressId() != null) {
            recipientProvince = marketplaceAddressRepository.findByIdAndUserId(request.addressId(), buyerUserId)
                    .orElseThrow(() -> new ResourceNotFoundException("Shipping address not found"))
                    .getProvince();
        }

        Map<GroupKey, List<MarketplaceCartItem>> groups = new LinkedHashMap<>();
        for (MarketplaceCartItem item : checkoutItems) {
            MarketplaceProduct product = item.getProduct();
            requireShippingSource(product);
            groups.computeIfAbsent(new GroupKey(product.getFarmerUserId(), product.getFarmId()), ignored -> new ArrayList<>())
                    .add(item);
        }

        List<MarketplaceShippingQuoteGroupResponse> result = new ArrayList<>();
        for (Map.Entry<GroupKey, List<MarketplaceCartItem>> entry : groups.entrySet()) {
            MarketplaceProduct first = entry.getValue().getFirst().getProduct();
            BigDecimal weight = entry.getValue().stream()
                    .map(item -> item.getProduct().getShippingWeightKgPerUnit().multiply(item.getQuantity()))
                    .reduce(BigDecimal.ZERO, BigDecimal::add);
            boolean perishable = entry.getValue().stream()
                    .anyMatch(item -> Boolean.TRUE.equals(item.getProduct().getPerishable()));
            boolean coldChain = entry.getValue().stream()
                    .anyMatch(item -> Boolean.TRUE.equals(item.getProduct().getRequiresColdChain()));

            List<DeliveryShippingQuoteClient.ShippingQuote> quotes = deliveryShippingQuoteClient.issueQuotes(
                    new DeliveryShippingQuoteClient.IssueQuotesRequest(
                            buyerUserId, entry.getKey().sellerUserId(), entry.getKey().farmId(),
                            first.getFarmRegion(), recipientProvince, weight, perishable, coldChain));
            if (quotes == null || quotes.isEmpty()) {
                throw new BadRequestException("No shipping option is available for farm " + entry.getKey().farmId());
            }

            result.add(new MarketplaceShippingQuoteGroupResponse(
                    entry.getKey().sellerUserId(), entry.getKey().farmId(), first.getFarmName(),
                    first.getFarmRegion(), weight, perishable, coldChain,
                    quotes.stream().map(quote -> new MarketplaceShippingQuoteGroupResponse.Option(
                            quote.quoteId(), quote.providerId(), quote.providerName(), quote.serviceType(),
                            quote.shippingFeeVnd(), quote.estimatedHours(), quote.expiresAt())).toList()));
        }
        return result;
    }

    public DeliveryShippingQuoteClient.ShippingQuote validateAcceptedQuote(
            String quoteId,
            Long buyerUserId,
            Long sellerUserId,
            Integer farmId,
            String recipientProvince) {
        DeliveryShippingQuoteClient.ShippingQuote quote = deliveryShippingQuoteClient.validateQuote(
                new DeliveryShippingQuoteClient.ValidateQuoteRequest(
                        quoteId, buyerUserId, sellerUserId, farmId, recipientProvince));
        if (quote == null || quote.shippingFeeVnd() == null || quote.weightKg() == null) {
            throw new BadRequestException("Delivery service returned an invalid shipping quote");
        }
        return quote;
    }

    private static void requireShippingSource(MarketplaceProduct product) {
        if (product.getFarmId() == null || product.getFarmRegion() == null || product.getFarmRegion().isBlank()) {
            throw new BadRequestException("Product " + product.getId() + " has no authoritative farm origin");
        }
        if (product.getShippingWeightKgPerUnit() == null
                || product.getShippingWeightKgPerUnit().compareTo(BigDecimal.ZERO) <= 0) {
            throw new BadRequestException("Product " + product.getId() + " has no authoritative shipping weight");
        }
    }

    private record GroupKey(Long sellerUserId, Integer farmId) {
    }
}
