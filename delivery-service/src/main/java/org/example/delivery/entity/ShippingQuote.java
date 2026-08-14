package org.example.delivery.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "shipping_quotes")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ShippingQuote {
    @Id
    @Column(name = "quote_id", length = 36)
    private String quoteId;

    @Column(name = "buyer_user_id", nullable = false)
    private Long buyerUserId;

    @Column(name = "seller_user_id", nullable = false)
    private Long sellerUserId;

    @Column(name = "farm_id", nullable = false)
    private Integer farmId;

    @Column(name = "provider_id", nullable = false)
    private Integer providerId;

    @Column(name = "service_type", nullable = false, length = 30)
    private String serviceType;

    @Column(name = "sender_province", nullable = false, length = 100)
    private String senderProvince;

    @Column(name = "recipient_province", nullable = false, length = 100)
    private String recipientProvince;

    @Column(name = "weight_kg", nullable = false, precision = 10, scale = 3)
    private BigDecimal weightKg;

    @Column(name = "is_perishable", nullable = false)
    private Boolean perishable;

    @Column(name = "requires_cold_chain", nullable = false)
    private Boolean requiresColdChain;

    @Column(name = "shipping_fee_vnd", nullable = false, precision = 12, scale = 2)
    private BigDecimal shippingFeeVnd;

    @Column(name = "estimated_hours", nullable = false)
    private Integer estimatedHours;

    @Column(name = "expires_at", nullable = false)
    private LocalDateTime expiresAt;

    @Column(name = "consumed_at")
    private LocalDateTime consumedAt;

    @Column(name = "marketplace_order_id")
    private Long marketplaceOrderId;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @PrePersist
    void onCreate() {
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
    }
}
