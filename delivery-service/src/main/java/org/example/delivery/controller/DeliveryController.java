package org.example.delivery.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.example.delivery.dto.request.CalculateShippingRequest;
import org.example.delivery.dto.request.CreateDeliveryOrderRequest;
import org.example.delivery.dto.response.ShippingOption;
import org.example.delivery.entity.DeliveryOrder;
import org.example.delivery.entity.enums.DeliveryStatus;
import org.example.delivery.service.DeliveryService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import org.springframework.security.access.prepost.PreAuthorize;

@RestController
@RequestMapping("/api/v1/delivery")
@RequiredArgsConstructor
@Slf4j
public class DeliveryController {

    private final DeliveryService deliveryService;

    @PostMapping("/calculate")
    public ResponseEntity<List<ShippingOption>> calculateShipping(
            @Valid @RequestBody CalculateShippingRequest request) {
        log.info("Received shipping calculation request");
        List<ShippingOption> options = deliveryService.calculateShippingOptions(request);
        return ResponseEntity.ok(options);
    }

    @PreAuthorize("hasRole('BUYER')")
    @PostMapping("/orders")
    public ResponseEntity<DeliveryOrder> createDeliveryOrder(
            @Valid @RequestBody CreateDeliveryOrderRequest request) {
        log.info("Received delivery order creation request");
        DeliveryOrder order = deliveryService.createDeliveryOrder(request);
        return ResponseEntity.ok(order);
    }

    @PreAuthorize("hasAnyRole('BUYER', 'ADMIN')")
    @GetMapping("/orders")
    public ResponseEntity<List<DeliveryOrder>> getAllDeliveryOrders() {
        log.info("Fetching all delivery orders");
        return ResponseEntity.ok(deliveryService.getAllDeliveryOrders());
    }

    @PreAuthorize("hasAnyRole('BUYER', 'ADMIN')")
    @GetMapping("/orders/{id}")
    public ResponseEntity<DeliveryOrder> getDeliveryOrder(@PathVariable Integer id) {
        log.info("Fetching delivery order: {}", id);
        DeliveryOrder order = deliveryService.getDeliveryOrder(id);
        return ResponseEntity.ok(order);
    }

    @PreAuthorize("hasAnyRole('BUYER', 'ADMIN')")
    @GetMapping("/orders/marketplace/{orderId}")
    public ResponseEntity<List<DeliveryOrder>> getDeliveryOrdersByMarketplace(@PathVariable Long orderId) {
        log.info("Fetching delivery orders for marketplace order: {}", orderId);
        List<DeliveryOrder> orders = deliveryService.getDeliveryOrdersByMarketplaceOrder(orderId);
        return ResponseEntity.ok(orders);
    }

    @PreAuthorize("hasRole('ADMIN')")
    @PutMapping("/orders/{id}/status")
    public ResponseEntity<DeliveryOrder> updateDeliveryStatus(
            @PathVariable Integer id,
            @RequestParam DeliveryStatus status) {
        log.info("Received status update request for order {} to {}", id, status);
        DeliveryOrder order = deliveryService.updateDeliveryStatus(id, status);
        return ResponseEntity.ok(order);
    }

    @PreAuthorize("hasAnyRole('FARMER', 'ADMIN')")
    @GetMapping("/batch-suggestions")
    public ResponseEntity<org.example.delivery.dto.response.BatchSuggestionResponse> getBatchSuggestions(
            @RequestParam("date") @org.springframework.format.annotation.DateTimeFormat(iso = org.springframework.format.annotation.DateTimeFormat.ISO.DATE) java.time.LocalDate date,
            @RequestParam("zone") String zone) {
        log.info("Fetching batch suggestions for date: {}, zone: {}", date, zone);
        return ResponseEntity.ok(deliveryService.getBatchSuggestions(date, zone));
    }
}
