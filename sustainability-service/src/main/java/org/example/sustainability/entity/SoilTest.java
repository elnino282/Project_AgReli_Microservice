package org.example.sustainability.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.experimental.FieldDefaults;
import org.example.sustainability.enums.NutrientInputSourceType;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
@Entity
@Table(name = "soil_tests")
public class SoilTest {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    Integer id;

    @Column(name = "season_id", nullable = false)
    Integer seasonId;

    @Column(name = "plot_id", nullable = false)
    Integer plotId;

    @Column(name = "sample_date", nullable = false)
    LocalDate sampleDate;

    @Column(name = "soil_ph", precision = 5, scale = 2)
    BigDecimal soilPh;

    @Column(name = "electrical_conductivity_ds_m", precision = 12, scale = 4)
    BigDecimal electricalConductivityDsM;

    @Column(name = "soil_organic_matter_pct", precision = 12, scale = 4)
    BigDecimal soilOrganicMatterPct;

    @Column(name = "mineral_n_kg_per_ha", nullable = false, precision = 19, scale = 4)
    BigDecimal mineralNKgPerHa;

    @Column(name = "nitrate_mg_per_kg", precision = 19, scale = 4)
    BigDecimal nitrateMgPerKg;

    @Column(name = "ammonium_mg_per_kg", precision = 19, scale = 4)
    BigDecimal ammoniumMgPerKg;

    @Column(name = "legacy_n_contribution_kg", precision = 19, scale = 4)
    BigDecimal legacyNContributionKg;

    @Column(name = "legacy_event_id")
    Integer legacyEventId;

    @Column(name = "legacy_derived", nullable = false)
    @Builder.Default
    Boolean legacyDerived = Boolean.FALSE;

    @Column(name = "measured", nullable = false)
    @Builder.Default
    Boolean measured = Boolean.TRUE;

    @Enumerated(EnumType.STRING)
    @Column(name = "source_type", length = 40)
    NutrientInputSourceType sourceType;

    @Column(name = "source_document", length = 255)
    String sourceDocument;

    @Column(name = "lab_reference", length = 255)
    String labReference;

    @Column(name = "note", columnDefinition = "TEXT")
    String note;

    @Column(name = "created_by_user_id")
    Long createdByUserId;

    @Column(name = "created_at", columnDefinition = "TIMESTAMP DEFAULT CURRENT_TIMESTAMP")
    LocalDateTime createdAt;

    @PrePersist
    void onCreate() {
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
    }
}
