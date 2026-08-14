package org.example.marketplace.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Convert;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.OneToMany;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.experimental.FieldDefaults;
import org.example.marketplace.model.MarketplaceOrderStatus;
import org.example.marketplace.model.MarketplacePaymentMethod;
import org.example.marketplace.model.MarketplacePaymentVerificationStatus;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
@Entity
@Table(name = "marketplace_orders")
public class MarketplaceOrder {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    Long id;

    @Column(name = "order_group_id", nullable = false)
    Long orderGroupId;

    @Column(name = "order_code", nullable = false, length = 64, unique = true)
    String orderCode;

    @Column(name = "buyer_user_id", nullable = false)
    Long buyerUserId;

    @Column(name = "farmer_user_id", nullable = false)
    Long farmerUserId;

    @Column(name = "farm_id")
    Integer farmId;

    @Convert(converter = org.example.marketplace.model.MarketplaceOrderStatusConverter.class)
    @Column(name = "status", nullable = false, length = 30)
    MarketplaceOrderStatus status;

    @Enumerated(EnumType.STRING)
    @Column(name = "payment_method", nullable = false, length = 40)
    MarketplacePaymentMethod paymentMethod;

    @Enumerated(EnumType.STRING)
    @Column(name = "payment_verification_status", nullable = false, length = 40)
    MarketplacePaymentVerificationStatus paymentVerificationStatus;

    @Column(name = "payment_proof_file_name", length = 255)
    String paymentProofFileName;

    @Column(name = "payment_proof_content_type", length = 150)
    String paymentProofContentType;

    @Column(name = "payment_proof_storage_path", length = 1000)
    String paymentProofStoragePath;

    @Column(name = "payment_proof_uploaded_at")
    LocalDateTime paymentProofUploadedAt;

    @Column(name = "payment_verified_at")
    LocalDateTime paymentVerifiedAt;

    @Column(name = "payment_verified_by_user_id")
    Long paymentVerifiedByUserId;

    @Column(name = "payment_verification_note", length = 500)
    String paymentVerificationNote;

    @Column(name = "shipping_recipient_name", nullable = false)
    String shippingRecipientName;

    @Column(name = "shipping_phone", nullable = false, length = 30)
    String shippingPhone;

    @Column(name = "shipping_address_line", nullable = false, length = 500)
    String shippingAddressLine;

    @Column(name = "note", columnDefinition = "TEXT")
    String note;

    @Column(name = "subtotal", nullable = false, precision = 19, scale = 2)
    BigDecimal subtotal;

    @Column(name = "shipping_fee", nullable = false, precision = 19, scale = 2)
    BigDecimal shippingFee;

    @Column(name = "shipping_quote_id", length = 36, unique = true)
    String shippingQuoteId;

    @Column(name = "shipping_weight_kg", precision = 10, scale = 3)
    BigDecimal shippingWeightKg;

    @Column(name = "shipping_provider_id")
    Integer shippingProviderId;

    @Column(name = "shipping_origin_province", length = 100)
    String shippingOriginProvince;

    @Column(name = "shipping_destination_province", length = 100)
    String shippingDestinationProvince;

    @Column(name = "total_amount", nullable = false, precision = 19, scale = 2)
    BigDecimal totalAmount;

    // Pre-order fields
    @Column(name = "is_pre_order", nullable = false)
    @Builder.Default
    Boolean isPreOrder = Boolean.FALSE;

    @Column(name = "requested_delivery_date")
    java.time.LocalDate requestedDeliveryDate;

    @Column(name = "harvest_ready_date")
    java.time.LocalDate harvestReadyDate;

    @Column(name = "created_at", nullable = false)
    LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    LocalDateTime updatedAt;

    @OneToMany(mappedBy = "order", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    List<MarketplaceOrderItem> items = new ArrayList<>();

    @PrePersist
    void onCreate() {
        LocalDateTime now = LocalDateTime.now();
        if (createdAt == null) {
            createdAt = now;
        }
        if (updatedAt == null) {
            updatedAt = now;
        }
        if (paymentVerificationStatus == null) {
            paymentVerificationStatus = paymentMethod == MarketplacePaymentMethod.BANK_TRANSFER
                    ? MarketplacePaymentVerificationStatus.AWAITING_PROOF
                    : MarketplacePaymentVerificationStatus.NOT_REQUIRED;
        }
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
