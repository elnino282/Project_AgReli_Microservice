package org.example.farm.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "certification_scopes")
public class CertificationScope {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(name = "record_id", nullable = false)
    private Integer recordId;

    @Column(name = "season_id", nullable = false)
    private Integer seasonId;

    @Column(name = "plot_id", nullable = false)
    private Integer plotId;

    @Column(name = "plot_name", nullable = false)
    private String plotName;

    @Column(name = "crop_id", nullable = false)
    private Integer cropId;

    @Column(name = "crop_name", nullable = false)
    private String cropName;

    @Column(name = "variety_id")
    private Integer varietyId;

    @Column(name = "variety_name")
    private String varietyName;

    @Column(name = "registered_area_ha", nullable = false, precision = 12, scale = 4)
    private BigDecimal registeredAreaHa;

    @Column(name = "expected_yield_kg", precision = 19, scale = 3)
    private BigDecimal expectedYieldKg;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    void onCreate() {
        if (createdAt == null) createdAt = LocalDateTime.now();
        if (updatedAt == null) updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
