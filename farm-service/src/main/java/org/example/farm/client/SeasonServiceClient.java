package org.example.farm.client;

import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestParam;

@FeignClient(name = "season-service", contextId = "seasonServiceClient", url = "${app.season-service-url:http://localhost:8085}", fallback = SeasonServiceClientFallback.class)
public interface SeasonServiceClient {

    @GetMapping("/api/v1/internal/plots/{plotId}/dependencies")
    PlotDependencyStatusDto getPlotDependencies(@PathVariable("plotId") Integer plotId);

    @GetMapping("/api/v1/internal/seasons/{seasonId}/phi/active")
    java.util.List<PesticideRecordInternalDto> getActivePHIInternal(@PathVariable("seasonId") Integer seasonId);

    @GetMapping("/api/v1/internal/seasons/{seasonId}/logs/count")
    Long countFieldLogsByTypeInternal(@PathVariable("seasonId") Integer seasonId, @RequestParam("logType") String logType);

    @GetMapping("/api/v1/internal/plots/{plotId}/seasons")
    java.util.List<SeasonSummaryDto> getSeasonsByPlotId(@PathVariable("plotId") Integer plotId);

    @GetMapping("/api/v1/internal/seasons/{seasonId}")
    SeasonInternalDto getSeasonInternal(@PathVariable("seasonId") Integer seasonId);

    @lombok.Data
    @lombok.Builder
    @lombok.NoArgsConstructor
    @lombok.AllArgsConstructor
    class SeasonInternalDto {
        private Integer id;
        private String seasonName;
        private Integer plotId;
        private Integer cropId;
        private Integer varietyId;
        private String status;
        private java.time.LocalDate startDate;
        private java.time.LocalDate plannedHarvestDate;
        private java.time.LocalDate endDate;
        private java.math.BigDecimal expectedYieldKg;
    }

    @lombok.Data
    @lombok.Builder
    @lombok.NoArgsConstructor
    @lombok.AllArgsConstructor
    class SeasonSummaryDto {
        private Integer id;
        private String seasonName;
        private Integer plotId;
        private Integer cropId;
        private String status;
        private java.time.LocalDate startDate;
        private java.time.LocalDate plannedHarvestDate;
        private java.time.LocalDate endDate;
    }

    @lombok.Data
    @lombok.Builder
    @lombok.NoArgsConstructor
    @lombok.AllArgsConstructor
    class PesticideRecordInternalDto {
        private Integer id;
        private Integer seasonId;
        private String pesticideName;
        private String activeIngredient;
        private Integer phiDays;
        private java.time.LocalDate harvestAllowedDate;
        private java.time.LocalDate applicationDate;
    }

    @lombok.Data
    @lombok.Builder
    @lombok.NoArgsConstructor
    @lombok.AllArgsConstructor
    class PlotDependencyStatusDto {
        private boolean hasActiveSeasons;
        private boolean hasActiveTasks;
    }
    @GetMapping("/api/v1/internal/seasons/{seasonId}/training-stats")
    java.util.Map<Long, java.util.List<EmployeeTrainingRecordDto>> getTrainingStatsInternal(@PathVariable("seasonId") Integer seasonId);

    @GetMapping("/api/v1/internal/seasons/{seasonId}/training-compliance")
    TrainingComplianceSnapshotDto getTrainingComplianceInternal(@PathVariable("seasonId") Integer seasonId);

    @lombok.Data
    @lombok.Builder
    @lombok.NoArgsConstructor
    @lombok.AllArgsConstructor
    class EmployeeTrainingRecordDto {
        private Integer id;
        private Long userId;
        private Integer workTeamId;
        private java.time.LocalDate trainedAt;
        private String trainerName;
        private java.time.LocalDate certifiedUntil;
        private String status;
    }

    @lombok.Data
    @lombok.Builder
    @lombok.NoArgsConstructor
    @lombok.AllArgsConstructor
    class TrainingComplianceSnapshotDto {
        private Integer seasonId;
        private Integer totalMembers;
        private Integer compliantMembers;
        private java.util.List<Integer> requiredProgramIds;
        private java.util.List<String> requiredCategories;
        private java.util.Map<Long, Boolean> memberCompliance;
        private Boolean compliant;
    }
}
