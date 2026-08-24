package org.example.delivery.event;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import java.time.LocalDateTime;

@JsonIgnoreProperties(ignoreUnknown = true)
public record MarketplaceOrderCreatedEvent(
        String eventId,
        String aggregateType,
        String aggregateId,
        LocalDateTime occurredAt,
        Payload payload) {

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Payload(
            Long orderGroupId,
            Long orderId,
            Long buyerUserId,
            Long farmerUserId,
            String status) {
    }
}
