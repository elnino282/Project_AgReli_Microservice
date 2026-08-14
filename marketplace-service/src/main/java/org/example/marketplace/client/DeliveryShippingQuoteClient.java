package org.example.marketplace.client;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;

@FeignClient(name = "delivery-shipping-quotes", url = "${external-services.delivery-service-url:http://delivery-service:8092}")
public interface DeliveryShippingQuoteClient {
    @PostMapping("/api/v1/internal/shipping-quotes")
    List<ShippingQuote> issueQuotes(@RequestBody IssueQuotesRequest request);

    @PostMapping("/api/v1/internal/shipping-quotes/validate")
    ShippingQuote validateQuote(@RequestBody ValidateQuoteRequest request);

    record IssueQuotesRequest(
            Long buyerUserId,
            Long sellerUserId,
            Integer farmId,
            String senderProvince,
            String recipientProvince,
            BigDecimal weightKg,
            boolean perishable,
            boolean requiresColdChain) {
    }

    record ValidateQuoteRequest(
            String quoteId,
            Long buyerUserId,
            Long sellerUserId,
            Integer farmId,
            String recipientProvince) {
    }

    record ShippingQuote(
            String quoteId,
            Long sellerUserId,
            Integer farmId,
            Integer providerId,
            String providerName,
            String serviceType,
            String senderProvince,
            String recipientProvince,
            BigDecimal weightKg,
            boolean perishable,
            boolean requiresColdChain,
            BigDecimal shippingFeeVnd,
            int estimatedHours,
            LocalDateTime expiresAt) {
    }
}
