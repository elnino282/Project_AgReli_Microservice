package org.example.season.controller;

import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import lombok.RequiredArgsConstructor;
import org.example.season.entity.Season;
import org.example.season.entity.Task;
import org.example.season.entity.PesticideRecord;
import org.example.season.repository.SeasonRepository;
import org.example.season.repository.TaskRepository;
import org.example.season.repository.PesticideRecordRepository;
import org.example.season.repository.FieldLogRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/v1/internal")
@RequiredArgsConstructor
public class InternalSeasonController {

    private final SeasonRepository seasonRepository;
    private final TaskRepository taskRepository;
    private final PesticideRecordRepository pesticideRecordRepository;
    private final FieldLogRepository fieldLogRepository;
    private final org.example.season.service.EmployeeTrainingService employeeTrainingService;
    private final org.example.season.service.SeasonQueryService seasonQueryService;

    @PostMapping("/seasons/batch")
    public ResponseEntity<List<SeasonSummaryDto>> getSeasonsByIds(@RequestBody List<Integer> seasonIds) {
        List<Season> seasons = seasonRepository.findAllById(seasonIds);
        List<SeasonSummaryDto> dtos = seasons.stream()
                .map(season -> SeasonSummaryDto.builder()
                        .id(season.getId())
                        .seasonName(season.getSeasonName())
                        .plotId(season.getPlotId())
                        .cropId(season.getCropId())
                        .status(season.getStatus() != null ? season.getStatus().name() : null)
                        .startDate(season.getStartDate())
                        .plannedHarvestDate(season.getPlannedHarvestDate())
                        .endDate(season.getEndDate())
                        .build())
                .toList();
        return ResponseEntity.ok(dtos);
    }

    @GetMapping("/seasons/{id}")
    public ResponseEntity<SeasonInternalDto> getSeasonInternal(@PathVariable Integer id) {
        Season season = seasonRepository.findById(id).orElse(null);
        if (season == null) {
            return ResponseEntity.notFound().build();
        }

        SeasonInternalDto dto = SeasonInternalDto.builder()
                .id(season.getId())
                .seasonName(season.getSeasonName())
                .plotId(season.getPlotId())
                .cropId(season.getCropId())
                .varietyId(season.getVarietyId())
                .status(season.getStatus() != null ? season.getStatus().name() : null)
                .startDate(season.getStartDate())
                .plannedHarvestDate(season.getPlannedHarvestDate())
                .endDate(season.getEndDate())
                .build();

        return ResponseEntity.ok(dto);
    }

    @GetMapping("/seasons/exists-by-variety/{varietyId}")
    public ResponseEntity<Boolean> existsByVariety(@PathVariable Integer varietyId) {
        return ResponseEntity.ok(seasonQueryService.existsSeasonByVarietyId(varietyId));
    }

    @GetMapping("/plots/{plotId}/dependencies")
    public ResponseEntity<PlotDependencyStatusDto> getPlotDependencies(@PathVariable Integer plotId) {
        return ResponseEntity.ok(PlotDependencyStatusDto.builder()
                .hasActiveSeasons(seasonQueryService.existsActiveSeasonByPlotId(plotId))
                .hasActiveTasks(seasonQueryService.existsActiveTasksByPlotId(plotId))
                .build());
    }

    @GetMapping("/tasks/{id}")
    public ResponseEntity<TaskInternalDto> getTaskInternal(@PathVariable Integer id) {
        Task task = taskRepository.findById(id).orElse(null);
        if (task == null) {
            return ResponseEntity.notFound().build();
        }

        TaskInternalDto dto = TaskInternalDto.builder()
                .id(task.getId())
                .title(task.getTitle())
                .seasonId(task.getSeason() != null ? task.getSeason().getId() : null)
                .userId(task.getUserId())
                .status(task.getStatus() != null ? task.getStatus().name() : null)
                .build();

        return ResponseEntity.ok(dto);
    }

    @GetMapping("/seasons/owner/{ownerId}/ids")
    public ResponseEntity<java.util.List<Integer>> getSeasonIdsByOwnerId(@PathVariable Long ownerId) {
        java.util.List<Integer> ids = new java.util.ArrayList<>();
        seasonRepository.findAllByFarmUserId(ownerId).forEach(s -> ids.add(s.getId()));
        seasonRepository.findAllByPlotUserId(ownerId).forEach(s -> ids.add(s.getId()));
        return ResponseEntity.ok(ids.stream().distinct().toList());
    }

    @GetMapping("/plots/{plotId}/seasons")
    public ResponseEntity<List<SeasonSummaryDto>> getSeasonsByPlotId(@PathVariable Integer plotId) {
        List<Season> seasons = seasonRepository.findAllByPlotIdOrderByStartDateDesc(plotId);
        List<SeasonSummaryDto> dtos = seasons.stream()
                .map(season -> SeasonSummaryDto.builder()
                        .id(season.getId())
                        .seasonName(season.getSeasonName())
                        .plotId(season.getPlotId())
                        .cropId(season.getCropId())
                        .status(season.getStatus() != null ? season.getStatus().name() : null)
                        .startDate(season.getStartDate())
                        .plannedHarvestDate(season.getPlannedHarvestDate())
                        .endDate(season.getEndDate())
                        .build())
                .toList();
        return ResponseEntity.ok(dtos);
    }

    @GetMapping("/seasons/{seasonId}/phi/active")
    public ResponseEntity<List<PesticideRecordInternalDto>> getActivePHIInternal(@PathVariable Integer seasonId) {
        List<PesticideRecord> records = pesticideRecordRepository.findActivePHIBySeason(seasonId, LocalDate.now());
        List<PesticideRecordInternalDto> dtos = records.stream()
                .map(r -> PesticideRecordInternalDto.builder()
                        .id(r.getId())
                        .seasonId(r.getSeasonId())
                        .pesticideName(r.getPesticideName())
                        .activeIngredient(r.getActiveIngredient())
                        .phiDays(r.getPhiDays())
                        .harvestAllowedDate(r.getHarvestAllowedDate() != null ? r.getHarvestAllowedDate() : (r.getApplicationDate() != null ? r.getApplicationDate().plusDays(r.getPhiDays()) : null))
                        .applicationDate(r.getApplicationDate())
                        .build())
                .toList();
        return ResponseEntity.ok(dtos);
    }

    @GetMapping("/seasons/{seasonId}/phi/all")
    public ResponseEntity<List<PesticideRecordInternalDto>> getAllPHIInternal(@PathVariable Integer seasonId) {
        List<PesticideRecord> records = pesticideRecordRepository.findBySeasonId(seasonId);
        List<PesticideRecordInternalDto> dtos = records.stream()
                .map(r -> PesticideRecordInternalDto.builder()
                        .id(r.getId())
                        .seasonId(r.getSeasonId())
                        .pesticideName(r.getPesticideName())
                        .activeIngredient(r.getActiveIngredient())
                        .phiDays(r.getPhiDays())
                        .harvestAllowedDate(r.getHarvestAllowedDate() != null ? r.getHarvestAllowedDate() : (r.getApplicationDate() != null ? r.getApplicationDate().plusDays(r.getPhiDays()) : null))
                        .applicationDate(r.getApplicationDate())
                        .build())
                .toList();
        return ResponseEntity.ok(dtos);
    }


    @GetMapping("/seasons/{seasonId}/logs/count")
    public ResponseEntity<Long> countFieldLogsByTypeInternal(
            @PathVariable Integer seasonId,
            @RequestParam String logType) {
        long count = fieldLogRepository.countBySeasonIdAndLogTypeIgnoreCase(seasonId, logType);
        return ResponseEntity.ok(count);
    }

    @GetMapping("/seasons/{seasonId}/training-stats")
    public ResponseEntity<java.util.Map<Long, List<org.example.season.dto.response.EmployeeTrainingRecordDto>>> getTrainingStatsInternal(@PathVariable Integer seasonId) {
        return ResponseEntity.ok(employeeTrainingService.getTrainingStatusForSeason(seasonId));
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class PesticideRecordInternalDto {
        private Integer id;
        private Integer seasonId;
        private String pesticideName;
        private String activeIngredient;
        private Integer phiDays;
        private java.time.LocalDate harvestAllowedDate;
        private java.time.LocalDate applicationDate;
    }

    @Data
    @Builder
    public static class SeasonInternalDto {
        private Integer id;
        private String seasonName;
        private Integer plotId;
        private Integer cropId;
        private Integer varietyId;
        private String status;
        private java.time.LocalDate startDate;
        private java.time.LocalDate plannedHarvestDate;
        private java.time.LocalDate endDate;
    }

    @Data
    @Builder
    public static class TaskInternalDto {
        private Integer id;
        private String title;
        private Integer seasonId;
        private Long userId;
        private String status;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class PlotDependencyStatusDto {
        private boolean hasActiveSeasons;
        private boolean hasActiveTasks;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SeasonSummaryDto {
        private Integer id;
        private String seasonName;
        private Integer plotId;
        private Integer cropId;
        private String status;
        private java.time.LocalDate startDate;
        private java.time.LocalDate plannedHarvestDate;
        private java.time.LocalDate endDate;
    }
}
