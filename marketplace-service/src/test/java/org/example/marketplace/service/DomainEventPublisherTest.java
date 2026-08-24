package org.example.marketplace.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.example.marketplace.entity.OutboxEvent;
import org.example.marketplace.event.DomainEventPublisher;
import org.example.marketplace.event.MarketplaceOrderCreatedEvent;
import org.example.marketplace.repository.OutboxEventRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("Outbox Event Publisher Tests")
class DomainEventPublisherTest {

    @Mock
    private OutboxEventRepository outboxEventRepository;
    @Mock
    private ObjectMapper objectMapper;

    private DomainEventPublisher domainEventPublisher;

    @BeforeEach
    void setUp() {
        domainEventPublisher = new DomainEventPublisher(outboxEventRepository, objectMapper);
    }

    @Test
    @DisplayName("Should save OrderCreated event to outbox")
    void publish_OrderCreatedEvent_shouldSaveToOutbox() throws Exception {
        // Given
        MarketplaceOrderCreatedEvent event = new MarketplaceOrderCreatedEvent(
                UUID.randomUUID().toString(),
                "MarketplaceOrder",
                "123",
                LocalDateTime.now(),
                new MarketplaceOrderCreatedEvent.Payload(
                        1L, 123L, 1L, 2L, "PENDING", List.of(), java.math.BigDecimal.TEN
                )
        );

        when(objectMapper.writeValueAsString(event)).thenReturn("{\"event\":\"test\"}");
        when(outboxEventRepository.save(any(OutboxEvent.class)))
                .thenAnswer(inv -> inv.getArgument(0));

        // When
        domainEventPublisher.publish(event);

        // Then
        ArgumentCaptor<OutboxEvent> eventCaptor = ArgumentCaptor.forClass(OutboxEvent.class);
        verify(outboxEventRepository).save(eventCaptor.capture());

        OutboxEvent savedEvent = eventCaptor.getValue();
        assertThat(savedEvent.getAggregateType()).isEqualTo("MarketplaceOrder");
        assertThat(savedEvent.getAggregateId()).isEqualTo("123");
        assertThat(savedEvent.getEventType()).isEqualTo("MarketplaceOrderCreatedEvent");
        assertThat(savedEvent.getProcessed()).isFalse();
    }

    @Test
    @DisplayName("Should set correct event type from class name")
    void publish_anyEvent_shouldSetEventTypeCorrectly() throws Exception {
        // Given
        MarketplaceOrderCreatedEvent event = new MarketplaceOrderCreatedEvent(
                UUID.randomUUID().toString(),
                "MarketplaceOrder",
                "456",
                LocalDateTime.now(),
                new MarketplaceOrderCreatedEvent.Payload(
                        1L, 456L, 1L, 2L, "PENDING", List.of(), java.math.BigDecimal.TEN
                )
        );

        when(objectMapper.writeValueAsString(event)).thenReturn("{}");
        when(outboxEventRepository.save(any(OutboxEvent.class)))
                .thenAnswer(inv -> inv.getArgument(0));

        // When
        domainEventPublisher.publish(event);

        // Then
        ArgumentCaptor<OutboxEvent> eventCaptor = ArgumentCaptor.forClass(OutboxEvent.class);
        verify(outboxEventRepository).save(eventCaptor.capture());

        OutboxEvent savedEvent = eventCaptor.getValue();
        assertThat(savedEvent.getEventType()).isEqualTo("MarketplaceOrderCreatedEvent");
    }

    @Test
    void serializationFailureDoesNotAllowOrderTransactionToContinueWithoutOutbox() throws Exception {
        MarketplaceOrderCreatedEvent event = new MarketplaceOrderCreatedEvent(
                "event-1", "MarketplaceOrder", "456", LocalDateTime.now(),
                new MarketplaceOrderCreatedEvent.Payload(
                        1L, 456L, 1L, 2L, "PENDING", List.of(), java.math.BigDecimal.TEN));
        when(objectMapper.writeValueAsString(event))
                .thenThrow(new com.fasterxml.jackson.core.JsonProcessingException("broken") {});

        assertThatThrownBy(() -> domainEventPublisher.publish(event))
                .isInstanceOf(IllegalStateException.class);
        org.mockito.Mockito.verify(outboxEventRepository, org.mockito.Mockito.never()).save(any());
    }
}
