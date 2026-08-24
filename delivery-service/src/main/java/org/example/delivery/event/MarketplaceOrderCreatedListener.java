package org.example.delivery.event;

import java.time.LocalDateTime;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.example.delivery.config.MarketplaceEventConfig;
import org.example.delivery.entity.ProcessedEvent;
import org.example.delivery.repository.ProcessedEventRepository;
import org.example.delivery.service.DeliveryService;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
@RequiredArgsConstructor
@Slf4j
public class MarketplaceOrderCreatedListener {
    private final DeliveryService deliveryService;
    private final ProcessedEventRepository processedEventRepository;

    @RabbitListener(queues = MarketplaceEventConfig.ORDER_CREATED_QUEUE)
    @Transactional
    public void onOrderCreated(MarketplaceOrderCreatedEvent event) {
        if (processedEventRepository.existsById(event.eventId())) {
            log.info("Skipping already processed marketplace event {}", event.eventId());
            return;
        }
        deliveryService.createDeliveryOrderFromMarketplaceEvent(
                event.payload().orderId(), event.payload().buyerUserId());
        processedEventRepository.save(ProcessedEvent.builder()
                .eventId(event.eventId())
                .processedAt(LocalDateTime.now())
                .build());
    }
}
