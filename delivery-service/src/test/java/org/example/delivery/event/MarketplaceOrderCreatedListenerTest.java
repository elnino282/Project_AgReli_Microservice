package org.example.delivery.event;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.LocalDateTime;
import org.example.delivery.repository.ProcessedEventRepository;
import org.example.delivery.service.DeliveryService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class MarketplaceOrderCreatedListenerTest {

    @Mock
    private DeliveryService deliveryService;

    @Mock
    private ProcessedEventRepository processedEventRepository;

    @InjectMocks
    private MarketplaceOrderCreatedListener listener;

    @Test
    void duplicateEventDoesNotCreateAnotherDelivery() {
        var event = event("event-1");
        when(processedEventRepository.existsById("event-1")).thenReturn(true);

        listener.onOrderCreated(event);

        verify(deliveryService, never()).createDeliveryOrderFromMarketplaceEvent(99L, 11L);
    }

    @Test
    void successfulProvisioningIsMarkedProcessedInSameHandler() {
        var event = event("event-1");

        listener.onOrderCreated(event);

        verify(deliveryService).createDeliveryOrderFromMarketplaceEvent(99L, 11L);
        verify(processedEventRepository).save(org.mockito.ArgumentMatchers.argThat(
                processed -> processed.getEventId().equals("event-1")));
    }

    @Test
    void provisioningFailureRemainsRetryable() {
        var event = event("event-1");
        org.mockito.Mockito.doThrow(new IllegalStateException("marketplace unavailable"))
                .when(deliveryService).createDeliveryOrderFromMarketplaceEvent(99L, 11L);

        assertThatThrownBy(() -> listener.onOrderCreated(event))
                .isInstanceOf(IllegalStateException.class);
        verify(processedEventRepository, never()).save(org.mockito.ArgumentMatchers.any());
    }

    private static MarketplaceOrderCreatedEvent event(String id) {
        return new MarketplaceOrderCreatedEvent(
                id, "MarketplaceOrder", "99", LocalDateTime.now(),
                new MarketplaceOrderCreatedEvent.Payload(1L, 99L, 11L, 33L, "PENDING"));
    }
}
