package org.example.delivery.controller;

import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.example.delivery.dto.request.IssueShippingQuotesRequest;
import org.example.delivery.dto.request.ValidateShippingQuoteRequest;
import org.example.delivery.dto.response.ShippingQuoteResponse;
import org.example.delivery.service.ShippingQuoteService;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.security.access.prepost.PreAuthorize;

@RestController
@RequestMapping("/api/v1/internal/shipping-quotes")
@PreAuthorize("permitAll()")
@RequiredArgsConstructor
public class InternalShippingQuoteController {
    private final ShippingQuoteService shippingQuoteService;

    @PostMapping
    public List<ShippingQuoteResponse> issueQuotes(@Valid @RequestBody IssueShippingQuotesRequest request) {
        return shippingQuoteService.issueQuotes(request);
    }

    @PostMapping("/validate")
    public ShippingQuoteResponse validateQuote(@Valid @RequestBody ValidateShippingQuoteRequest request) {
        return shippingQuoteService.validateQuote(request);
    }
}
