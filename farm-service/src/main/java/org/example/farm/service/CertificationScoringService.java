package org.example.farm.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.example.farm.entity.CertificationChecklistItem;
import org.example.farm.entity.CertificationItemStatus;
import org.example.farm.entity.Plot;
import org.example.farm.repository.PlotRepository;
import org.example.farm.client.SeasonServiceClient;
import org.example.farm.client.SustainabilityServiceClient;
import org.example.farm.exception.AppException;
import org.example.farm.exception.ErrorCode;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class CertificationScoringService {

    private final PlotRepository plotRepository;
    private final SeasonServiceClient seasonServiceClient;
    private final SustainabilityServiceClient sustainabilityServiceClient;

    /**
     * Tính compliance score dựa trên checklist items.
     * Score = Σ(passed_items.weight) / Σ(all_mandatory_items.weight) × 100
     */
    public BigDecimal calculateScore(List<CertificationItemStatus> statuses,
                                    List<CertificationChecklistItem> items) {
        BigDecimal totalMandatoryWeight = BigDecimal.ZERO;
        BigDecimal passedWeight = BigDecimal.ZERO;

        for (CertificationChecklistItem item : items) {
            if (!Boolean.TRUE.equals(item.getIsMandatory())) continue;
            totalMandatoryWeight = totalMandatoryWeight.add(
                item.getWeightPct() != null ? item.getWeightPct() : BigDecimal.ONE);

            CertificationItemStatus status = findStatus(statuses, item.getId());
            if (status != null && "PASS".equalsIgnoreCase(status.getStatus())) {
                passedWeight = passedWeight.add(
                    item.getWeightPct() != null ? item.getWeightPct() : BigDecimal.ONE);
            }
        }

        if (totalMandatoryWeight.compareTo(BigDecimal.ZERO) == 0) {
            return BigDecimal.ZERO;
        }

        return passedWeight
            .divide(totalMandatoryWeight, 4, RoundingMode.HALF_UP)
            .multiply(BigDecimal.valueOf(100))
            .setScale(2, RoundingMode.HALF_UP);
    }

    /**
     * Auto-fill PENDING items dựa trên dữ liệu hiện có cho farmId.
     */
    public void autoPopulateFromFieldLogs(Integer farmId, List<CertificationItemStatus> pendingStatuses, List<CertificationChecklistItem> items) {
        // Lấy danh sách plots thuộc farm
        List<Plot> plots = plotRepository.findAllByFarm_Id(farmId);
        List<Integer> seasonIds = new ArrayList<>();
        for (Plot plot : plots) {
            try {
                var seasons = seasonServiceClient.getSeasonsByPlotId(plot.getId());
                if (seasons != null) {
                    for (var s : seasons) {
                        seasonIds.add(s.getId());
                    }
                }
            } catch (Exception e) {
                log.error("Error fetching seasons for plot {}", plot.getId(), e);
                throw new AppException(ErrorCode.CERTIFICATION_EVIDENCE_UNAVAILABLE);
            }
        }

        if (seasonIds.isEmpty()) {
            log.info("No seasons found for farm {}, skipping auto-populate", farmId);
            return;
        }

        for (CertificationItemStatus status : pendingStatuses) {
            CertificationChecklistItem item = findItem(items, status.getChecklistItemId());
            if (item == null || item.getDataSourceType() == null) continue;

            boolean isPhiCheck = "PHI_CHECK".equalsIgnoreCase(item.getDataSourceType());
            // PHI là evidence an toàn hiện thời nên luôn phải revalidate; nguồn khác chỉ auto-fill PENDING.
            if (!isPhiCheck && !"PENDING".equalsIgnoreCase(status.getStatus())) continue;

            switch (item.getDataSourceType().toUpperCase()) {
                case "SOIL_TEST" -> {
                    boolean hasSoilTest = false;
                    for (Integer seasonId : seasonIds) {
                        try {
                            var tests = sustainabilityServiceClient.getSoilTestsInternal(seasonId);
                            if (tests != null && !tests.isEmpty()) {
                                hasSoilTest = true;
                                break;
                            }
                        } catch (Exception e) {
                            log.error("Error fetching soil tests for season {}", seasonId, e);
                        }
                    }
                    if (hasSoilTest) {
                        status.setStatus("PASS");
                        status.setCheckedAt(LocalDateTime.now());
                    }
                }
                case "WATER_TEST" -> {
                    boolean hasWaterTest = false;
                    for (Integer seasonId : seasonIds) {
                        try {
                            var tests = sustainabilityServiceClient.getWaterAnalysesInternal(seasonId);
                            if (tests != null && !tests.isEmpty()) {
                                hasWaterTest = true;
                                break;
                            }
                        } catch (Exception e) {
                            log.error("Error fetching water tests for season {}", seasonId, e);
                        }
                    }
                    if (hasWaterTest) {
                        status.setStatus("PASS");
                        status.setCheckedAt(LocalDateTime.now());
                    }
                }
                case "PHI_CHECK" -> {
                    boolean hasViolations = false;
                    int violationsCount = 0;
                    for (Integer seasonId : seasonIds) {
                        try {
                            var activePHI = seasonServiceClient.getActivePHIInternal(seasonId);
                            if (activePHI != null && !activePHI.isEmpty()) {
                                hasViolations = true;
                                violationsCount += activePHI.size();
                            }
                        } catch (Exception e) {
                            log.error("Error checking PHI for season {}", seasonId, e);
                            throw new AppException(ErrorCode.CERTIFICATION_EVIDENCE_UNAVAILABLE);
                        }
                    }
                    if (hasViolations) {
                        status.setStatus("FAIL");
                        status.setNotes("Có " + violationsCount + " vi phạm PHI chưa hết thời gian cách ly");
                        status.setCheckedAt(LocalDateTime.now());
                    } else {
                        status.setStatus("PASS");
                        status.setNotes("Đã xác minh không có vi phạm PHI đang hoạt động");
                        status.setCheckedAt(LocalDateTime.now());
                    }
                }
                case "FIELD_LOG" -> {
                    String query = item.getDataSourceQuery();
                    String logType = query;
                    if (query != null && query.contains("\"logType\"")) {
                        int start = query.indexOf("\"logType\":");
                        if (start != -1) {
                            int valStart = query.indexOf("\"", start + 10);
                            int valEnd = query.indexOf("\"", valStart + 1);
                            if (valStart != -1 && valEnd != -1) {
                                logType = query.substring(valStart + 1, valEnd);
                            }
                        }
                    }

                    boolean hasLogs = false;
                    for (Integer seasonId : seasonIds) {
                        try {
                            Long count = seasonServiceClient.countFieldLogsByTypeInternal(seasonId, logType);
                            if (count != null && count > 0) {
                                hasLogs = true;
                                break;
                            }
                        } catch (Exception e) {
                            log.error("Error counting field logs for season {}", seasonId, e);
                        }
                    }
                    if (hasLogs) {
                        status.setStatus("PASS");
                        status.setCheckedAt(LocalDateTime.now());
                    }
                }
                case "TRAINING_RECORD" -> {
                    boolean hasTraining = false;
                    for (Integer seasonId : seasonIds) {
                        try {
                            var stats = seasonServiceClient.getTrainingStatsInternal(seasonId);
                            if (stats != null && !stats.isEmpty()) {
                                hasTraining = true;
                                break;
                            }
                        } catch (Exception e) {
                            log.error("Error fetching training stats for season {}", seasonId, e);
                        }
                    }
                    if (hasTraining) {
                        status.setStatus("PASS");
                        status.setCheckedAt(LocalDateTime.now());
                    }
                }
            }
        }
    }

    private CertificationItemStatus findStatus(List<CertificationItemStatus> statuses, Integer itemId) {
        return statuses.stream()
            .filter(s -> s.getChecklistItemId().equals(itemId))
            .findFirst().orElse(null);
    }

    private CertificationChecklistItem findItem(List<CertificationChecklistItem> items, Integer itemId) {
        return items.stream()
            .filter(i -> i.getId().equals(itemId))
            .findFirst().orElse(null);
    }
}
