package org.example.delivery.entity;

import jakarta.persistence.*;
import lombok.*;
import org.example.delivery.entity.enums.DeliveryStatus;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "delivery_orders")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DeliveryOrder {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(name = "marketplace_order_id", nullable = false)
    private Long marketplaceOrderId;

    @Column(name = "shipping_quote_id", length = 36, unique = true)
    private String shippingQuoteId;

    @Column(name = "buyer_user_id")
    private Long buyerUserId;

    @Column(name = "provider_id", nullable = false)
    private Integer providerId;

    @Column(name = "tracking_number", length = 100)
    private String trackingNumber;

    @Enumerated(EnumType.STRING)
    @Column(length = 20)
    @Builder.Default
    private DeliveryStatus status = DeliveryStatus.PENDING;

    @Column(name = "shipping_fee_vnd", nullable = false)
    private BigDecimal shippingFeeVnd;

    @Column(name = "estimated_delivery")
    private LocalDateTime estimatedDelivery;

    @Column(name = "actual_delivery")
    private LocalDateTime actualDelivery;

    @Column(name = "is_perishable")
    @Builder.Default
    private Boolean isPerishable = false;

    @Column(name = "requires_cold_chain")
    @Builder.Default
    private Boolean requiresColdChain = false;

    @Column(name = "recipient_name", nullable = false)
    private String recipientName;

    @Column(name = "recipient_phone", nullable = false, length = 20)
    private String recipientPhone;

    @Column(name = "recipient_address", nullable = false, length = 500)
    private String recipientAddress;

    @Column(name = "recipient_province", nullable = false, length = 100)
    private String recipientProvince;

    @Column(name = "weight_kg")
    @Builder.Default
    private BigDecimal weightKg = BigDecimal.ZERO;

    @Column(name = "requested_delivery_date")
    private java.time.LocalDate requestedDeliveryDate;

    @Column(name = "delivery_zone_to", length = 50)
    private String deliveryZoneTo;

    @Column(name = "created_at", insertable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", insertable = false, updatable = false)
    private LocalDateTime updatedAt;
}
