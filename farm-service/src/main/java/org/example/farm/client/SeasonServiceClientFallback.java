package org.example.farm.client;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

@Component
@Slf4j
public class SeasonServiceClientFallback implements SeasonServiceClient {

    @Override
    public PlotDependencyStatusDto getPlotDependencies(Integer plotId) {
        log.error("Fallback triggered: Failed to check dependencies for plot {} via season-service", plotId);
        throw new IllegalStateException(
                "season-service is unavailable; plot dependencies cannot be verified");
    }

    @Override
    public java.util.List<SeasonServiceClient.PesticideRecordInternalDto> getActivePHIInternal(Integer seasonId) {
        log.error("Fallback triggered: Failed to get active PHI for season {} via season-service", seasonId);
        throw new IllegalStateException(
                "season-service is unavailable; PHI evidence cannot be verified");
    }

    @Override
    public Long countFieldLogsByTypeInternal(Integer seasonId, String logType) {
        log.error("Fallback triggered: Failed to count field logs of type {} for season {} via season-service", logType, seasonId);
        return 0L;
    }

    @Override
    public java.util.List<SeasonServiceClient.SeasonSummaryDto> getSeasonsByPlotId(Integer plotId) {
        log.error("Fallback triggered: Failed to get seasons for plot {} via season-service", plotId);
        throw new IllegalStateException(
                "season-service is unavailable; season evidence cannot be verified");
    }

    @Override
    public java.util.Map<Long, java.util.List<SeasonServiceClient.EmployeeTrainingRecordDto>> getTrainingStatsInternal(Integer seasonId) {
        log.error("Fallback triggered: Failed to get training stats for season {} via season-service", seasonId);
        return java.util.Collections.emptyMap();
    }

    @Override
    public SeasonServiceClient.SeasonInternalDto getSeasonInternal(Integer seasonId) {
        log.error("Fallback triggered: Failed to get season {} via season-service", seasonId);
        throw new IllegalStateException(
                "season-service is unavailable; certification scope cannot be verified");
    }

    @Override
    public SeasonServiceClient.TrainingComplianceSnapshotDto getTrainingComplianceInternal(Integer seasonId) {
        log.error("Fallback triggered: Failed to verify training compliance for season {} via season-service", seasonId);
        throw new IllegalStateException(
                "season-service is unavailable; training compliance cannot be verified");
    }
}
