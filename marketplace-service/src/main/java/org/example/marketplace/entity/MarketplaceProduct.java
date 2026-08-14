package org.example.marketplace.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.experimental.FieldDefaults;
import org.example.marketplace.model.MarketplaceProductStatus;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
@Entity
@Table(name = "marketplace_products")
public class MarketplaceProduct {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    Long id;

    @Version
    @Column(name = "version")
    Long version;

    @Column(name = "slug", nullable = false, length = 191, unique = true)
    String slug;

    @Column(name = "name", nullable = false)
    String name;

    @Column(name = "category", length = 120)
    String category;

    @Column(name = "short_description", length = 500)
    String shortDescription;

    @Column(name = "description", columnDefinition = "TEXT")
    String description;

    @Column(name = "price", nullable = false, precision = 19, scale = 2)
    BigDecimal price;

    @Column(name = "unit", nullable = false, length = 50)
    String unit;

    @Column(name = "stock_quantity", nullable = false, precision = 19, scale = 3)
    BigDecimal stockQuantity;

    @Column(name = "shipping_weight_kg_per_unit", precision = 10, scale = 3)
    BigDecimal shippingWeightKgPerUnit;

    @Column(name = "is_perishable", nullable = false)
    @Builder.Default
    Boolean perishable = Boolean.FALSE;

    @Column(name = "requires_cold_chain", nullable = false)
    @Builder.Default
    Boolean requiresColdChain = Boolean.FALSE;

    @Column(name = "image_url", length = 1024)
    String imageUrl;

    @Column(name = "image_urls_json", columnDefinition = "TEXT")
    String imageUrlsJson;

    @Column(name = "farmer_user_id", nullable = false)
    Long farmerUserId;

    @Column(name = "farmer_display_name", length = 255)
    String farmerDisplayName;

    @Column(name = "farm_id")
    Integer farmId;

    @Column(name = "farm_name", length = 255)
    String farmName;

    @Column(name = "farm_region", length = 255)
    String farmRegion;

    @Column(name = "season_id")
    Integer seasonId;

    @Column(name = "season_name", length = 255)
    String seasonName;

    @Column(name = "lot_id")
    Integer lotId;

    @Column(name = "lot_code", length = 120)
    String lotCode;

    @Column(name = "lot_warehouse_name", length = 255)
    String lotWarehouseName;

    @Column(name = "lot_storage_location", length = 255)
    String lotStorageLocation;

    @Column(name = "lot_harvest_date")
    LocalDateTime lotHarvestDate;

    @Column(name = "lot_received_at")
    LocalDateTime lotReceivedAt;

    @Column(name = "lot_grade", length = 50)
    String lotGrade;

    @Column(name = "lot_initial_quantity", precision = 19, scale = 3)
    BigDecimal lotInitialQuantity;

    @Column(name = "plot_id")
    Integer plotId;

    @Column(name = "plot_name", length = 255)
    String plotName;

    @Column(name = "plot_area", precision = 19, scale = 4)
    BigDecimal plotArea;

    @Column(name = "crop_name", length = 255)
    String cropName;

    @Column(name = "catalog_snapshot", columnDefinition = "JSON")
    String catalogSnapshot;

    @Column(name = "traceable", nullable = false)
    @Builder.Default
    Boolean traceable = Boolean.TRUE;

    @Column(name = "average_rating", nullable = false)
    @Builder.Default
    Double averageRating = 0.0;

    @Column(name = "rating_count", nullable = false)
    @Builder.Default
    Integer ratingCount = 0;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 30)
    @Builder.Default
    MarketplaceProductStatus status = MarketplaceProductStatus.DRAFT;

    @Column(name = "published_at")
    LocalDateTime publishedAt;

    @Column(name = "status_reason", length = 500)
    String statusReason;

    @Column(name = "status_changed_at")
    LocalDateTime statusChangedAt;

    @Column(name = "status_changed_by_user_id")
    Long statusChangedByUserId;

    // Fields for Compliance Gate (Luồng G - BRD)
    @Column(name = "compliance_claim", length = 20)
    String complianceClaim;

    @Column(name = "certification_snapshot_json", columnDefinition = "TEXT")
    String certificationSnapshotJson;

    @Column(name = "harvest_safety_snapshot_json", columnDefinition = "TEXT")
    String harvestSafetySnapshotJson;

    @Column(name = "compliance_checked_at")
    LocalDateTime complianceCheckedAt;

    // Fields for Pre-order (Luồng I)
    @Column(name = "allows_pre_order", nullable = false)
    @Builder.Default
    Boolean allowsPreOrder = Boolean.FALSE;

    @Column(name = "earliest_fulfillment_date")
    java.time.LocalDate earliestFulfillmentDate;

    @Column(name = "created_at", nullable = false)
    LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    LocalDateTime updatedAt;

    @PrePersist
    void onCreate() {
        LocalDateTime now = LocalDateTime.now();
        if (createdAt == null) {
            createdAt = now;
        }
        if (updatedAt == null) {
            updatedAt = now;
        }
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
