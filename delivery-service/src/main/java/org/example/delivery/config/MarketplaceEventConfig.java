package org.example.delivery.config;

import org.springframework.amqp.core.Binding;
import org.springframework.amqp.core.BindingBuilder;
import org.springframework.amqp.core.Queue;
import org.springframework.amqp.core.TopicExchange;
import org.springframework.amqp.support.converter.Jackson2JsonMessageConverter;
import org.springframework.amqp.support.converter.MessageConverter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.amqp.rabbit.annotation.EnableRabbit;

@Configuration
@EnableRabbit
public class MarketplaceEventConfig {
    public static final String EXCHANGE = "marketplace-exchange";
    public static final String ORDER_CREATED_QUEUE = "delivery.marketplace.order-created.v1";

    @Bean
    TopicExchange marketplaceExchange() {
        return new TopicExchange(EXCHANGE, true, false);
    }

    @Bean
    Queue marketplaceOrderCreatedQueue() {
        return new Queue(ORDER_CREATED_QUEUE, true);
    }

    @Bean
    Binding marketplaceOrderCreatedBinding(Queue marketplaceOrderCreatedQueue, TopicExchange marketplaceExchange) {
        return BindingBuilder.bind(marketplaceOrderCreatedQueue).to(marketplaceExchange).with("order.created");
    }

    @Bean
    MessageConverter rabbitMessageConverter() {
        return new Jackson2JsonMessageConverter();
    }
}
