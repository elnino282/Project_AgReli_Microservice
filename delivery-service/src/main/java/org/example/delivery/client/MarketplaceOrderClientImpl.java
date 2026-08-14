package org.example.delivery.client;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

@Component
public class MarketplaceOrderClientImpl implements MarketplaceOrderClient {
    private final RestClient restClient;

    public MarketplaceOrderClientImpl(
            RestClient.Builder builder,
            @Value("${external-services.marketplace-service-url:http://marketplace-service:8090}") String baseUrl) {
        this.restClient = builder.baseUrl(baseUrl).build();
    }

    @Override
    public MarketplaceOrderDeliveryContext getDeliveryContext(Long orderId) {
        MarketplaceOrderDeliveryContext context = restClient.get()
                .uri("/api/v1/internal/marketplace/orders/{orderId}/delivery-context", orderId)
                .retrieve()
                .body(MarketplaceOrderDeliveryContext.class);
        if (context == null) {
            throw new IllegalStateException("Marketplace order lookup returned no data");
        }
        return context;
    }
}
