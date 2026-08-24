package org.example.marketplace.event;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.LocalDateTime;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.example.marketplace.entity.OutboxEvent;
import org.example.marketplace.repository.OutboxEventRepository;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class DomainEventPublisher {

    private final OutboxEventRepository outboxEventRepository;
    private final ObjectMapper objectMapper;

    public void publish(DomainEvent event) {
        try {
            String payload = objectMapper.writeValueAsString(event);
            OutboxEvent outboxEvent = OutboxEvent.builder()
                    .id(UUID.randomUUID().toString())
                    .aggregateType(event.aggregateType())
                    .aggregateId(event.aggregateId())
                    .eventType(event.getClass().getSimpleName())
                    .payload(payload)
                    .createdAt(LocalDateTime.now())
                    .processed(false)
                    .build();
            outboxEventRepository.save(outboxEvent);
            log.info("Published domain event to outbox: {} for aggregate {}:{}",
                    event.getClass().getSimpleName(), event.aggregateType(), event.aggregateId());
        } catch (JsonProcessingException e) {
            log.error("Failed to serialize domain event: {}", event, e);
            throw new IllegalStateException("Cannot persist an unserializable domain event", e);
        }
    }
}
