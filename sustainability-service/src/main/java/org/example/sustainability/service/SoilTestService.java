package org.example.sustainability.service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.example.sustainability.config.CurrentUserService;
import org.example.sustainability.dto.request.CreateSoilTestRequest;
import org.example.sustainability.dto.response.SoilTestResponse;
import org.example.sustainability.entity.SoilTest;
import org.example.sustainability.enums.NutrientInputSourceType;
import org.example.sustainability.exception.AppException;
import org.example.sustainability.exception.ErrorCode;
import org.example.sustainability.repository.SoilTestRepository;
import org.example.sustainability.snapshot.model.PlotContext;
import org.example.sustainability.snapshot.model.SeasonContext;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
@Transactional
public class SoilTestService {

    static final String MINERAL_N_UNIT = "kg_n_per_ha";
    static final String CONCENTRATION_UNIT = "mg_per_kg";
    static final String CONTRIBUTION_UNIT = "kg_n";

    SoilTestRepository soilTestRepository;
    FarmerOwnershipService ownershipService;
    CurrentUserService currentUserService;
    SnapshotQueryService snapshotQueryService;

    public SoilTestResponse create(Integer seasonId, CreateSoilTestRequest request) {
        SeasonContext season = ownershipService.requireOwnedSeason(seasonId);
        ensureSeasonOpenForSustainabilityWrite(season);
        PlotContext plot = ownershipService.requireOwnedPlot(request.getPlotId());
        validatePlotBelongsToSeason(season, plot);

        NutrientInputSourceType sourceType = request.getSourceType();
        boolean measured = sourceType != null && sourceType.isMeasured();

        SoilTest saved = soilTestRepository.save(
                SoilTest.builder()
                        .seasonId(season.id())
                        .plotId(plot.id())
                        .sampleDate(request.getSampleDate())
                        .soilPh(scale2(request.getSoilPh()))
                        .electricalConductivityDsM(scale4(request.getElectricalConductivityDsM()))
                        .soilOrganicMatterPct(scale4(request.getSoilOrganicMatterPct()))
                        .mineralNKgPerHa(scale4(request.getMineralNKgPerHa()))
                        .nitrateMgPerKg(scale4(request.getNitrateMgPerKg()))
                        .ammoniumMgPerKg(scale4(request.getAmmoniumMgPerKg()))
                        .measured(measured)
                        .sourceType(sourceType)
                        .sourceDocument(trimToNull(request.getSourceDocument()))
                        .labReference(trimToNull(request.getLabReference()))
                        .note(trimToNull(request.getNote()))
                        .legacyDerived(Boolean.FALSE)
                        .legacyEventId(null)
                        .legacyNContributionKg(null)
                        .createdByUserId(currentUserService.getCurrentUserId())
                        .build()
        );

        return toResponse(saved, plot);
    }

    @Transactional(readOnly = true)
    public List<SoilTestResponse> list(Integer seasonId, Integer plotId) {
        SeasonContext season = ownershipService.requireOwnedSeason(seasonId);

        List<SoilTest> items;
        final PlotContext resolvedPlotContext;
        if (plotId != null) {
            resolvedPlotContext = ownershipService.requireOwnedPlot(plotId);
            validatePlotBelongsToSeason(season, resolvedPlotContext);
            items = soilTestRepository.findAllBySeasonIdAndPlotIdOrderBySampleDateDescCreatedAtDesc(seasonId, plotId);
        } else {
            resolvedPlotContext = null;
            items = soilTestRepository.findAllBySeasonIdOrderBySampleDateDescCreatedAtDesc(seasonId);
        }

        return items.stream()
                .sorted(Comparator
                        .comparing(SoilTest::getSampleDate, Comparator.nullsLast(Comparator.reverseOrder()))
                        .thenComparing(SoilTest::getCreatedAt, Comparator.nullsLast(Comparator.reverseOrder()))
                        .thenComparing(SoilTest::getId, Comparator.nullsLast(Comparator.reverseOrder())))
                .map(item -> {
                    PlotContext plot = resolvedPlotContext != null
                            ? resolvedPlotContext
                            : snapshotQueryService.findPlot(item.getPlotId()).orElse(null);
                    return toResponse(item, plot);
                })
                .toList();
    }

    @Transactional(readOnly = true)
    public List<SoilTestResponse> latestByPlots(List<Integer> plotIds) {
        if (plotIds == null || plotIds.isEmpty()) {
            return List.of();
        }

        List<Integer> distinctPlotIds = plotIds.stream()
                .filter(Objects::nonNull)
                .distinct()
                .toList();
        if (distinctPlotIds.isEmpty() || distinctPlotIds.size() > 200) {
            throw new AppException(ErrorCode.BAD_REQUEST);
        }

        Long currentUserId = currentUserService.getCurrentUserId();
        Map<Integer, PlotContext> ownedPlots = new LinkedHashMap<>();
        ownershipService.findPlotsByOwnerId(currentUserId).stream()
                .filter(plot -> distinctPlotIds.contains(plot.id()))
                .forEach(plot -> ownedPlots.put(plot.id(), plot));

        if (ownedPlots.isEmpty()) {
            return List.of();
        }

        Map<Integer, SoilTest> latestByPlot = new LinkedHashMap<>();
        soilTestRepository
                .findAllByPlotIdInOrderByPlotIdAscSampleDateDescCreatedAtDescIdDesc(
                        List.copyOf(ownedPlots.keySet())
                )
                .forEach(item -> latestByPlot.putIfAbsent(item.getPlotId(), item));

        return ownedPlots.keySet().stream()
                .map(plotId -> {
                    SoilTest item = latestByPlot.get(plotId);
                    return item == null ? null : toResponse(item, ownedPlots.get(plotId));
                })
                .filter(Objects::nonNull)
                .toList();
    }

    private void validatePlotBelongsToSeason(SeasonContext season, PlotContext plot) {
        if (season == null || plot == null || !Objects.equals(season.plotId(), plot.id())) {
            throw new AppException(ErrorCode.BAD_REQUEST);
        }
    }

    private void ensureSeasonOpenForSustainabilityWrite(SeasonContext season) {
        if (season == null || season.status() == null) {
            throw new AppException(ErrorCode.SEASON_NOT_FOUND);
        }
        String status = season.status().toUpperCase();
        if ("COMPLETED".equals(status) || "CANCELLED".equals(status) || "ARCHIVED".equals(status)) {
            throw new AppException(ErrorCode.BAD_REQUEST);
        }
    }

    private SoilTestResponse toResponse(SoilTest item, PlotContext plot) {
        NutrientInputSourceType sourceType = item.getSourceType();
        boolean measured = Boolean.TRUE.equals(item.getMeasured())
                || (sourceType != null && sourceType.isMeasured());

        return SoilTestResponse.builder()
                .id(item.getId())
                .seasonId(item.getSeasonId())
                .plotId(item.getPlotId())
                .plotName(plot != null ? plot.plotName() : null)
                .sampleDate(item.getSampleDate())
                .soilPh(scale2(item.getSoilPh()))
                .electricalConductivityDsM(scale4(item.getElectricalConductivityDsM()))
                .soilOrganicMatterPct(scale4(item.getSoilOrganicMatterPct()))
                .mineralNKgPerHa(scale4(item.getMineralNKgPerHa()))
                .nitrateMgPerKg(scale4(item.getNitrateMgPerKg()))
                .ammoniumMgPerKg(scale4(item.getAmmoniumMgPerKg()))
                .mineralNUnit(MINERAL_N_UNIT)
                .concentrationUnit(CONCENTRATION_UNIT)
                .estimatedNContributionKg(scale4(item.getLegacyNContributionKg() != null
                        ? item.getLegacyNContributionKg()
                        : calculateContribution(item.getMineralNKgPerHa(), plot)))
                .contributionUnit(CONTRIBUTION_UNIT)
                .measured(measured)
                .status(measured ? "measured" : "estimated")
                .sourceType(sourceType)
                .sourceDocument(item.getSourceDocument())
                .labReference(item.getLabReference())
                .note(item.getNote())
                .legacyDerived(Boolean.TRUE.equals(item.getLegacyDerived()))
                .migratedFromLegacyEventId(item.getLegacyEventId())
                .createdByUserId(item.getCreatedByUserId())
                .createdAt(item.getCreatedAt())
                .build();
    }

    private BigDecimal calculateContribution(BigDecimal mineralNKgPerHa, PlotContext plot) {
        if (mineralNKgPerHa == null || plot == null || plot.area() == null || plot.area().compareTo(BigDecimal.ZERO) <= 0) {
            return null;
        }
        return mineralNKgPerHa.multiply(plot.area());
    }

    private BigDecimal scale4(BigDecimal value) {
        return value == null ? null : value.setScale(4, RoundingMode.HALF_UP);
    }

    private BigDecimal scale2(BigDecimal value) {
        return value == null ? null : value.setScale(2, RoundingMode.HALF_UP);
    }

    private String trimToNull(String value) {
        if (!StringUtils.hasText(value)) {
            return null;
        }
        return value.trim();
    }
}
