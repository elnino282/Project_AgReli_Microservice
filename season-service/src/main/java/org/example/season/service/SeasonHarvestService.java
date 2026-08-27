package org.example.season.service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.HashMap;
import java.util.stream.Collectors;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.example.season.enums.ProductWarehouseLotStatus;
import org.example.season.event.DomainEventPublisher;
import org.example.season.event.HarvestRecordedEvent;
import org.example.season.dto.common.PageResponse;
import org.example.season.enums.SeasonStatus;
import org.example.season.exception.AppException;
import org.example.season.exception.ErrorCode;
import org.example.season.dto.request.CreateHarvestDetailRequest;
import org.example.season.dto.request.UpdateHarvestDetailRequest;
import org.example.season.dto.request.ReceiveHarvestRequest;
import org.example.season.dto.request.SyncLotRequest;
import org.example.season.dto.response.HarvestResponse;
import org.example.season.dto.response.HarvestStockContextResponse;
import org.example.season.dto.response.HarvestSummaryResponse;
import org.example.season.dto.response.ProductWarehouseLotDto;
import org.example.season.dto.response.HarvestStockContextDto;
import org.example.season.entity.Harvest;
import org.example.season.entity.Season;
import org.example.season.repository.HarvestRepository;
import org.example.season.repository.SeasonRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
@Transactional
public class SeasonHarvestService {

    HarvestRepository harvestRepository;
    SeasonRepository seasonRepository;
    ExternalServiceClient externalServiceClient;
    SeasonWorkspaceAccessService seasonWorkspaceAccessService;
    DomainEventPublisher domainEventPublisher;
    org.example.season.client.CropCatalogClient cropCatalogClient;
    org.example.season.client.InventoryServiceClient inventoryServiceClient;
    PHIHarvestValidationService phiValidationService;

    /**
     * List all harvests for the current farmer's seasons (supports "All Seasons"
     * filter).
     * If seasonId is provided, filters to that season only.
     */
    public PageResponse<HarvestResponse> listAllFarmerHarvests(
            Integer seasonId,
            LocalDate from,
            LocalDate to,
            int page,
            int size) {

        List<Harvest> all;

        if (seasonId != null) {
            // Filter by specific season
            Season season = getSeasonForCurrentFarmer(seasonId);
            all = harvestRepository.findAllBySeasonId(season.getId());
        } else {
            // List all harvests for farmer's seasons
            Long currentUserId = seasonWorkspaceAccessService.getCurrentUser().getId();
            List<Season> farmerSeasons = seasonRepository.findAllByFarmUserId(currentUserId);
            List<Integer> seasonIds = farmerSeasons.stream()
                    .map(Season::getId)
                    .filter(id -> id != null)
                    .toList();

            if (seasonIds.isEmpty()) {
                Pageable pageable = PageRequest.of(page, size, Sort.by("id").descending());
                Page<HarvestResponse> emptyPage = new PageImpl<>(List.of(), pageable, 0);
                return PageResponse.of(emptyPage, List.of());
            }

            all = harvestRepository.findAllBySeasonIdIn(seasonIds);
        }

        List<Harvest> filteredHarvests = all.stream()
                .filter(h -> {
                    if (from == null && to == null) {
                        return true;
                    }
                    LocalDate date = h.getHarvestDate();
                    boolean afterFrom = from == null || !date.isBefore(from);
                    boolean beforeTo = to == null || !date.isAfter(to);
                    return afterFrom && beforeTo;
                })
                .sorted((h1, h2) -> Integer.compare(
                        h2.getId() != null ? h2.getId() : 0,
                        h1.getId() != null ? h1.getId() : 0))
                .toList();

        int fromIndex = page * size;
        int toIndex = Math.min(fromIndex + size, filteredHarvests.size());
        List<Harvest> pageHarvests = fromIndex >= filteredHarvests.size() ? List.of() : filteredHarvests.subList(fromIndex, toIndex);
        List<HarvestResponse> pageItems = toResponsesWithStatuses(pageHarvests);

        Pageable pageable = PageRequest.of(page, size, Sort.by("id").descending());
        Page<HarvestResponse> pageData = new PageImpl<>(pageItems, pageable, filteredHarvests.size());

        return PageResponse.of(pageData, pageItems);
    }

    /**
     * Get harvest summary/KPI for a specific season or all farmer seasons.
     */
    public HarvestSummaryResponse getSummary(Integer seasonId) {
        BigDecimal totalHarvestedKg = BigDecimal.ZERO;
        int lotsCount = 0;
        BigDecimal totalRevenue = BigDecimal.ZERO;
        BigDecimal expectedYieldKg = null;
        BigDecimal actualYieldKg = null;
        BigDecimal yieldVsPlanPercent = null;
        List<Harvest> harvestsForSummary = List.of();
        List<Integer> summarySeasonIds = List.of();

        if (seasonId != null) {
            // Summary for specific season
            Season season = getSeasonForCurrentFarmer(seasonId);
            List<Harvest> harvests = harvestRepository.findAllBySeasonId(season.getId());
            harvestsForSummary = harvests;
            summarySeasonIds = season.getId() != null ? List.of(season.getId()) : List.of();

            lotsCount = harvests.size();
            totalHarvestedKg = harvests.stream()
                    .map(h -> h.getQuantity() != null ? h.getQuantity() : BigDecimal.ZERO)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);
            totalRevenue = harvests.stream()
                    .map(h -> {
                        BigDecimal qty = h.getQuantity() != null ? h.getQuantity() : BigDecimal.ZERO;
                        BigDecimal unit = h.getUnit() != null ? h.getUnit() : BigDecimal.ZERO;
                        return qty.multiply(unit);
                    })
                    .reduce(BigDecimal.ZERO, BigDecimal::add);

            expectedYieldKg = season.getExpectedYieldKg();
            actualYieldKg = season.getActualYieldKg() != null ? season.getActualYieldKg() : totalHarvestedKg;

            if (expectedYieldKg != null && expectedYieldKg.compareTo(BigDecimal.ZERO) > 0) {
                yieldVsPlanPercent = actualYieldKg.divide(expectedYieldKg, 4, RoundingMode.HALF_UP)
                        .multiply(BigDecimal.valueOf(100));
            }
        } else {
            // Summary for all farmer seasons
            Long currentUserId = seasonWorkspaceAccessService.getCurrentUser().getId();
            List<Season> farmerSeasons = seasonRepository.findAllByFarmUserId(currentUserId);
            List<Integer> seasonIds = farmerSeasons.stream()
                    .map(Season::getId)
                    .filter(id -> id != null)
                    .toList();
            summarySeasonIds = seasonIds;

            if (!seasonIds.isEmpty()) {
                List<Harvest> allHarvests = harvestRepository.findAllBySeasonIdIn(seasonIds);
                harvestsForSummary = allHarvests;
                lotsCount = allHarvests.size();
                totalHarvestedKg = allHarvests.stream()
                        .map(h -> h.getQuantity() != null ? h.getQuantity() : BigDecimal.ZERO)
                        .reduce(BigDecimal.ZERO, BigDecimal::add);
                totalRevenue = allHarvests.stream()
                        .map(h -> {
                            BigDecimal qty = h.getQuantity() != null ? h.getQuantity() : BigDecimal.ZERO;
                            BigDecimal unit = h.getUnit() != null ? h.getUnit() : BigDecimal.ZERO;
                            return qty.multiply(unit);
                        })
                        .reduce(BigDecimal.ZERO, BigDecimal::add);

                // Aggregate expected and actual yields from all seasons
                expectedYieldKg = farmerSeasons.stream()
                        .map(s -> s.getExpectedYieldKg() != null ? s.getExpectedYieldKg() : BigDecimal.ZERO)
                        .reduce(BigDecimal.ZERO, BigDecimal::add);
                actualYieldKg = farmerSeasons.stream()
                        .map(s -> s.getActualYieldKg() != null ? s.getActualYieldKg() : BigDecimal.ZERO)
                        .reduce(BigDecimal.ZERO, BigDecimal::add);

                if (expectedYieldKg.compareTo(BigDecimal.ZERO) > 0) {
                    yieldVsPlanPercent = actualYieldKg.divide(expectedYieldKg, 4, RoundingMode.HALF_UP)
                            .multiply(BigDecimal.valueOf(100));
                }
            }
        }

        HarvestWarehouseSummary warehouseSummary = buildWarehouseSummary(summarySeasonIds);
        BigDecimal premiumGradePercentage = calculatePremiumGradePercentage(harvestsForSummary);

        return HarvestSummaryResponse.builder()
                .totalHarvestedKg(totalHarvestedKg)
                .lotsCount(lotsCount)
                .totalRevenue(totalRevenue)
                .yieldVsPlanPercent(yieldVsPlanPercent)
                .expectedYieldKg(expectedYieldKg)
                .actualYieldKg(actualYieldKg)
                .totalStoredKg(warehouseSummary.totalStoredKg())
                .totalSoldKg(warehouseSummary.totalSoldKg())
                .totalProcessingKg(warehouseSummary.totalProcessingKg())
                .premiumGradePercentage(premiumGradePercentage)
                .build();
    }

    private HarvestWarehouseSummary buildWarehouseSummary(List<Integer> seasonIds) {
        if (seasonIds == null || seasonIds.isEmpty()) {
            return new HarvestWarehouseSummary(BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO);
        }

        BigDecimal totalStoredKg = BigDecimal.ZERO;
        BigDecimal totalSoldKg = BigDecimal.ZERO;
        BigDecimal totalProcessingKg = BigDecimal.ZERO;

        List<ProductWarehouseLotDto> lots = externalServiceClient.findLotsBySeasonIds(seasonIds);
        for (ProductWarehouseLotDto lot : lots) {
            if (lot == null || lot.getStatus() == ProductWarehouseLotStatus.ARCHIVED) {
                continue;
            }

            BigDecimal onHand = safeQuantity(lot.getOnHandQuantity());
            BigDecimal initial = safeQuantity(lot.getInitialQuantity());
            BigDecimal movedOut = initial.subtract(onHand);
            if (movedOut.compareTo(BigDecimal.ZERO) > 0) {
                totalSoldKg = totalSoldKg.add(movedOut);
            }

            if (lot.getStatus() == ProductWarehouseLotStatus.HOLD) {
                totalProcessingKg = totalProcessingKg.add(onHand);
            } else if (lot.getStatus() == ProductWarehouseLotStatus.IN_STOCK) {
                totalStoredKg = totalStoredKg.add(onHand);
            }
        }

        return new HarvestWarehouseSummary(totalStoredKg, totalSoldKg, totalProcessingKg);
    }

    private BigDecimal calculatePremiumGradePercentage(List<Harvest> harvests) {
        if (harvests == null || harvests.isEmpty()) {
            return BigDecimal.ZERO;
        }

        long premiumCount = harvests.stream()
                .filter(harvest -> harvest.getGrade() != null)
                .filter(harvest -> "PREMIUM".equalsIgnoreCase(harvest.getGrade().trim()))
                .count();

        return BigDecimal.valueOf(premiumCount)
                .divide(BigDecimal.valueOf(harvests.size()), 4, RoundingMode.HALF_UP)
                .multiply(BigDecimal.valueOf(100));
    }

    private BigDecimal safeQuantity(BigDecimal value) {
        return value != null ? value : BigDecimal.ZERO;
    }

    private record HarvestWarehouseSummary(
            BigDecimal totalStoredKg,
            BigDecimal totalSoldKg,
            BigDecimal totalProcessingKg) {
    }

    public PageResponse<HarvestResponse> listHarvestsForSeason(
            Integer seasonId,
            LocalDate from,
            LocalDate to,
            int page,
            int size) {
        Season season = getSeasonForCurrentFarmer(seasonId);

        List<Harvest> all = harvestRepository.findAllBySeasonId(season.getId());

        List<Harvest> filteredHarvests = all.stream()
                .filter(h -> {
                    if (from == null && to == null) {
                        return true;
                    }
                    LocalDate date = h.getHarvestDate();
                    boolean afterFrom = from == null || !date.isBefore(from);
                    boolean beforeTo = to == null || !date.isAfter(to);
                    return afterFrom && beforeTo;
                })
                .sorted((h1, h2) -> Integer.compare(
                        h2.getId() != null ? h2.getId() : 0,
                        h1.getId() != null ? h1.getId() : 0))
                .toList();

        int fromIndex = page * size;
        int toIndex = Math.min(fromIndex + size, filteredHarvests.size());
        List<Harvest> pageHarvests = fromIndex >= filteredHarvests.size() ? List.of() : filteredHarvests.subList(fromIndex, toIndex);
        List<HarvestResponse> pageItems = toResponsesWithStatuses(pageHarvests);

        Pageable pageable = PageRequest.of(page, size, Sort.by("id").descending());
        Page<HarvestResponse> pageData = new PageImpl<>(pageItems, pageable, filteredHarvests.size());

        return PageResponse.of(pageData, pageItems);
    }

    public HarvestResponse createHarvest(Integer seasonId, CreateHarvestDetailRequest request) {
        Season season = getSeasonForCurrentFarmer(seasonId);
        ensureSeasonAllowsHarvest(season);

        // 1. Validate PHI trước
        PHIHarvestValidationService.HarvestValidationResult phiResult =
                phiValidationService.validateHarvest(seasonId, request.getHarvestDate());

        if (phiResult.isBlocked()) {
            String detail = phiResult.violations().stream()
                    .map(v -> v.pesticideName() + " (cách ly đến " + v.harvestAllowedDate() + ")")
                    .collect(Collectors.joining(", "));

            throw new IllegalArgumentException(
                    "THU HOẠCH BỊ CHẶN: Còn " + phiResult.violations().size() +
                    " thuốc BVTV đang trong thời gian cách ly. " +
                    "Danh sách: " + detail + ". " +
                    "Ngày thu hoạch an toàn gần nhất: " + phiResult.nearestSafeDate());
        }

        validateHarvestDateWithinSeason(season, request.getHarvestDate());

        ExternalServiceClient.CropInternalDto crop = resolveCropForHarvestReceipt(season);
        Harvest harvest = Harvest.builder()
                .season(season)
                .harvestDate(request.getHarvestDate())
                .quantity(request.getQuantity())
                .unit(request.getUnit())
                .grade(request.getGrade())
                .note(request.getNote())
                // === Quality ===
                .qualityGrade(parseQualityGrade(request.getQualityGrade()))
                .qualityNotes(request.getQualityNotes())
                .subStandardQuantity(request.getSubStandardQuantity())
                .subStandardDisposition(parseSubStandardDisposition(request.getSubStandardDisposition()))
                // === Packaging ===
                .packagingType(parsePackagingType(request.getPackagingType()))
                .packagingCount(request.getPackagingCount())
                .processingType(parseProcessingType(request.getProcessingType()))
                // === Crop ===
                .cropCategory(null)
                .grossWetWeight(request.getGrossWetWeight())
                .build();

        Harvest saved = harvestRepository.save(harvest);
        ExternalServiceClient.PlotInternalDto plot = resolvePlotForHarvestReceipt(season);
        ExternalServiceClient.VarietyInternalDto variety = resolveVarietyForHarvestReceipt(season);
        ProductWarehouseLotDto receivedLot = externalServiceClient.receiveFromHarvest(
                saved.getId(),
                seasonWorkspaceAccessService.getCurrentUser().getId(),
                ReceiveHarvestRequest.builder()
                        .seasonId(season.getId())
                        .seasonName(season.getSeasonName())
                        .farmId(plot.getFarmId())
                        .farmName(plot.getFarmName())
                        .plotId(plot.getId())
                        .plotName(plot.getPlotName())
                        .cropId(season.getCropId())
                        .cropName(crop != null ? crop.getCropName() : null)
                        .varietyId(season.getVarietyId())
                        .varietyName(variety != null ? variety.getName() : null)
                        .harvestDate(saved.getHarvestDate())
                        .quantity(saved.getQuantity())
                        .grade(saved.getGrade())
                        .warehouseId(request.getWarehouseId())
                        .locationId(request.getLocationId())
                        .productId(request.getProductId())
                        .productName(request.getProductName())
                        .productVariant(request.getProductVariant())
                        .lotCode(request.getLotCode())
                        .unit(request.getInventoryUnit())
                        .note(request.getNote())
                        // === Quality & Crop Info for Inventory ===
                        .cropCategory(saved.getCropCategory())
                        .qualityGrade(request.getQualityGrade())
                        .packagingType(request.getPackagingType())
                        .packagingCount(request.getPackagingCount())
                        .processingType(request.getProcessingType())
                        // Note: expiryDate is normally set by inventory service using shelfLifeDays if needed
                        .build());
        recomputeSeasonActualYield(season);
        domainEventPublisher.publish(new HarvestRecordedEvent(
                saved,
                seasonWorkspaceAccessService.getCurrentUser().getId(),
                plot != null ? plot.getFarmId() : null,
                crop != null ? crop.getCropName() : null,
                variety != null ? variety.getName() : null
        ));
        return toResponseWithStatus(saved, receivedLot);
    }

    private ExternalServiceClient.PlotInternalDto resolvePlotForHarvestReceipt(Season season) {
        if (season == null || season.getPlotId() == null) {
            throw new AppException(ErrorCode.PLOT_NOT_FOUND);
        }
        ExternalServiceClient.PlotInternalDto plot = externalServiceClient.getPlot(season.getPlotId());
        if (plot == null || plot.getId() == null || plot.getFarmId() == null) {
            throw new AppException(ErrorCode.PLOT_NOT_FOUND);
        }
        return plot;
    }

    private ExternalServiceClient.CropInternalDto resolveCropForHarvestReceipt(Season season) {
        if (season == null || season.getCropId() == null) {
            return null;
        }
        return externalServiceClient.getCrop(season.getCropId());
    }

    private ExternalServiceClient.VarietyInternalDto resolveVarietyForHarvestReceipt(Season season) {
        if (season == null || season.getVarietyId() == null) {
            return null;
        }
        return externalServiceClient.getVariety(season.getVarietyId());
    }

    public HarvestStockContextResponse getStockContext(
            Integer seasonId,
            Integer warehouseId,
            String productName,
            String lotCode) {
        Season season = getSeasonForCurrentFarmer(seasonId);
        if (season.getPlotId() == null) {
            throw new AppException(ErrorCode.FARM_NOT_FOUND);
        }
        ExternalServiceClient.PlotInternalDto plot = externalServiceClient.getPlot(season.getPlotId());
        if (plot == null || plot.getFarmId() == null) {
            throw new AppException(ErrorCode.FARM_NOT_FOUND);
        }
        Integer farmId = plot.getFarmId();
        HarvestStockContextDto context = externalServiceClient.findHarvestStockContext(
                farmId,
                warehouseId,
                productName,
                lotCode);

        return HarvestStockContextResponse.builder()
                .warehouseId(warehouseId)
                .warehouseName(context != null ? context.getWarehouseName() : null)
                .productName(productName)
                .lotCode(lotCode)
                .matchingLots(context != null ? context.getMatchingLots() : 0L)
                .onHandQuantity(context != null ? context.getOnHandQuantity() : BigDecimal.ZERO)
                .unit(context != null ? context.getUnit() : null)
                .build();
    }

    public HarvestResponse getHarvest(Integer id) {
        Harvest harvest = getHarvestForCurrentFarmer(id);
        return toResponseWithStatus(harvest);
    }

    public HarvestResponse updateHarvest(Integer id, UpdateHarvestDetailRequest request) {
        Harvest harvest = getHarvestForCurrentFarmer(id);
        ensureSeasonAllowsHarvest(harvest.getSeason());
        ProductWarehouseLotDto linkedLot = harvest.getId() != null
                ? externalServiceClient.findLotByHarvestId(harvest.getId())
                : null;

        // 1. Validate PHI trước
        PHIHarvestValidationService.HarvestValidationResult phiResult =
                phiValidationService.validateHarvest(harvest.getSeason().getId(), request.getHarvestDate());

        if (phiResult.isBlocked()) {
            String detail = phiResult.violations().stream()
                    .map(v -> v.pesticideName() + " (cách ly đến " + v.harvestAllowedDate() + ")")
                    .collect(Collectors.joining(", "));

            throw new IllegalArgumentException(
                    "THU HOẠCH BỊ CHẶN: Còn " + phiResult.violations().size() +
                    " thuốc BVTV đang trong thời gian cách ly. " +
                    "Danh sách: " + detail + ". " +
                    "Ngày thu hoạch an toàn gần nhất: " + phiResult.nearestSafeDate());
        }

        validateHarvestDateWithinSeason(harvest.getSeason(), request.getHarvestDate());
        validateLinkedLotQuantityUpdate(linkedLot, request.getQuantity());

        harvest.setHarvestDate(request.getHarvestDate());
        harvest.setQuantity(request.getQuantity());
        harvest.setUnit(request.getUnit());
        harvest.setGrade(request.getGrade());
        harvest.setNote(request.getNote());
        harvest.setQualityGrade(parseQualityGrade(request.getQualityGrade()));
        harvest.setQualityNotes(request.getQualityNotes());
        harvest.setSubStandardQuantity(request.getSubStandardQuantity());
        harvest.setSubStandardDisposition(parseSubStandardDisposition(request.getSubStandardDisposition()));
        harvest.setPackagingType(parsePackagingType(request.getPackagingType()));
        harvest.setPackagingCount(request.getPackagingCount());
        harvest.setProcessingType(parseProcessingType(request.getProcessingType()));
        harvest.setGrossWetWeight(request.getGrossWetWeight());

        Harvest saved = harvestRepository.save(harvest);
        ProductWarehouseLotDto savedLot = syncLinkedLotFromHarvest(linkedLot, saved);
        recomputeSeasonActualYield(harvest.getSeason());
        return toResponseWithStatus(saved, savedLot);
    }

    private List<HarvestResponse> toResponsesWithStatuses(List<Harvest> harvests) {
        if (harvests == null || harvests.isEmpty()) {
            return List.of();
        }

        Map<Integer, ProductWarehouseLotDto> lotByHarvestId = loadLotByHarvestId(harvests);
        return harvests.stream()
                .map(harvest -> toResponseWithStatus(harvest, lotByHarvestId.get(harvest.getId())))
                .toList();
    }

    private Map<Integer, ProductWarehouseLotDto> loadLotByHarvestId(List<Harvest> harvests) {
        List<Integer> harvestIds = harvests.stream()
                .map(Harvest::getId)
                .filter(id -> id != null)
                .toList();
        if (harvestIds.isEmpty()) {
            return Map.of();
        }

        List<ProductWarehouseLotDto> lots = externalServiceClient.findLotsByHarvestIds(harvestIds);
        Map<Integer, ProductWarehouseLotDto> map = new HashMap<>();
        for (ProductWarehouseLotDto lot : lots) {
            if (lot.getHarvestId() != null) {
                map.putIfAbsent(lot.getHarvestId(), lot);
            }
        }
        return map;
    }

    private HarvestResponse toResponseWithStatus(Harvest harvest) {
        ProductWarehouseLotDto lot = harvest != null && harvest.getId() != null
                ? externalServiceClient.findLotByHarvestId(harvest.getId())
                : null;
        return toResponseWithStatus(harvest, lot);
    }

    private HarvestResponse toResponseWithStatus(Harvest harvest, ProductWarehouseLotDto lot) {
        HarvestResponse response = mapToResponse(harvest);
        if (response != null) {
            response.setStatus(resolveHarvestStatus(lot));
        }
        return response;
    }

    private String resolveHarvestStatus(ProductWarehouseLotDto lot) {
        if (lot == null || lot.getStatus() == ProductWarehouseLotStatus.ARCHIVED) {
            return null;
        }
        if (lot.getStatus() == ProductWarehouseLotStatus.HOLD) {
            return "processing";
        }
        BigDecimal onHand = safeQuantity(lot.getOnHandQuantity());
        if (lot.getStatus() == ProductWarehouseLotStatus.DEPLETED || onHand.compareTo(BigDecimal.ZERO) <= 0) {
            return "sold";
        }
        if (lot.getStatus() == ProductWarehouseLotStatus.IN_STOCK) {
            return "stored";
        }
        return null;
    }

    private void validateLinkedLotQuantityUpdate(ProductWarehouseLotDto lot, BigDecimal nextQuantity) {
        if (lot == null || lot.getStatus() == ProductWarehouseLotStatus.ARCHIVED) {
            return;
        }
        BigDecimal movedOut = calculateMovedOutQuantity(lot);
        if (nextQuantity.compareTo(movedOut) < 0) {
            throw new AppException(ErrorCode.INSUFFICIENT_STOCK);
        }
    }

    private ProductWarehouseLotDto syncLinkedLotFromHarvest(ProductWarehouseLotDto lot, Harvest harvest) {
        if (lot == null || lot.getStatus() == ProductWarehouseLotStatus.ARCHIVED) {
            return lot;
        }

        BigDecimal movedOut = calculateMovedOutQuantity(lot);
        BigDecimal nextOnHand = harvest.getQuantity().subtract(movedOut);

        ProductWarehouseLotStatus targetStatus = lot.getStatus();
        if (targetStatus != ProductWarehouseLotStatus.HOLD) {
            if (nextOnHand.compareTo(BigDecimal.ZERO) <= 0) {
                targetStatus = ProductWarehouseLotStatus.DEPLETED;
            } else {
                targetStatus = ProductWarehouseLotStatus.IN_STOCK;
            }
        }

        SyncLotRequest request = SyncLotRequest.builder()
                .harvestedAt(harvest.getHarvestDate())
                .initialQuantity(harvest.getQuantity())
                .onHandQuantity(nextOnHand)
                .grade(normalizeBlankToNull(harvest.getGrade()))
                .qualityStatus(normalizeBlankToNull(harvest.getGrade()))
                .note(normalizeBlankToNull(harvest.getNote()))
                .status(targetStatus.name())
                .build();

        return externalServiceClient.syncLinkedLotFromHarvest(lot.getId(), request);
    }

    private BigDecimal calculateMovedOutQuantity(ProductWarehouseLotDto lot) {
        BigDecimal initial = safeQuantity(lot.getInitialQuantity());
        BigDecimal onHand = safeQuantity(lot.getOnHandQuantity());
        BigDecimal movedOut = initial.subtract(onHand);
        return movedOut.compareTo(BigDecimal.ZERO) > 0 ? movedOut : BigDecimal.ZERO;
    }

    private String normalizeBlankToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    public void deleteHarvest(Integer id) {
        Harvest harvest = getHarvestForCurrentFarmer(id);
        ensureSeasonAllowsHarvest(harvest.getSeason());
        ensureHarvestNotReceivedToProductWarehouse(harvest);

        Season season = harvest.getSeason();
        harvestRepository.delete(harvest);
        if (season != null) {
            recomputeSeasonActualYield(season);
        }
    }

    private void ensureSeasonAllowsHarvest(Season season) {
        if (season == null) {
            throw new AppException(ErrorCode.SEASON_NOT_FOUND);
        }
        if (season.getStatus() != SeasonStatus.ACTIVE) {
            throw new AppException(ErrorCode.INVALID_SEASON_STATUS_TRANSITION);
        }
    }

    private void validateHarvestDateWithinSeason(Season season, LocalDate date) {
        LocalDate start = season.getStartDate();
        LocalDate end = season.getEndDate() != null ? season.getEndDate() : season.getPlannedHarvestDate();

        if (start == null || date.isBefore(start)) {
            throw new AppException(ErrorCode.HARVEST_DATE_BEFORE_PLANTING);
        }
        if (end != null && date.isAfter(end)) {
            throw new AppException(ErrorCode.INVALID_SEASON_DATES);
        }
    }

    private Harvest getHarvestForCurrentFarmer(Integer id) {
        Harvest harvest = harvestRepository.findById(id)
                .orElseThrow(() -> new AppException(ErrorCode.HARVEST_NOT_FOUND));

        Season season = harvest.getSeason();
        if (season == null) {
            throw new AppException(ErrorCode.SEASON_NOT_FOUND);
        }

        seasonWorkspaceAccessService.assertCurrentUserCanAccessSeason(season);
        return harvest;
    }

    private Season getSeasonForCurrentFarmer(Integer id) {
        Season season = seasonRepository.findById(id)
                .orElseThrow(() -> new AppException(ErrorCode.SEASON_NOT_FOUND));
        seasonWorkspaceAccessService.assertCurrentUserCanAccessSeason(season);
        return season;
    }

    private void recomputeSeasonActualYield(Season season) {
        if (season == null || season.getId() == null) {
            return;
        }
        List<Harvest> harvests = harvestRepository.findAllBySeasonId(season.getId());
        BigDecimal total = harvests.stream()
                .map(h -> h.getQuantity() != null ? h.getQuantity() : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        season.setActualYieldKg(total);
        seasonRepository.save(season);
    }

    private void ensureHarvestNotReceivedToProductWarehouse(Harvest harvest) {
        if (harvest == null || harvest.getId() == null) {
            return;
        }
        if (externalServiceClient.existsProductWarehouseLotByHarvestId(harvest.getId())) {
            throw new AppException(ErrorCode.HARVEST_ALREADY_RECEIVED_TO_PRODUCT_WAREHOUSE);
        }
    }

    private HarvestResponse mapToResponse(Harvest harvest) {
        if (harvest == null) return null;
        BigDecimal qty = harvest.getQuantity() != null ? harvest.getQuantity() : BigDecimal.ZERO;
        BigDecimal unitPrice = harvest.getUnit() != null ? harvest.getUnit() : BigDecimal.ZERO;
        return HarvestResponse.builder()
                .id(harvest.getId())
                .seasonId(harvest.getSeason() != null ? harvest.getSeason().getId() : null)
                .seasonName(harvest.getSeason() != null ? harvest.getSeason().getSeasonName() : null)
                .harvestDate(harvest.getHarvestDate())
                .quantity(harvest.getQuantity())
                .unit(harvest.getUnit())
                .grade(harvest.getGrade())
                .revenue(qty.multiply(unitPrice))
                .note(harvest.getNote())
                .createdAt(harvest.getCreatedAt())
                // === Quality Grading ===
                .qualityGrade(harvest.getQualityGrade() != null ? harvest.getQualityGrade().name() : null)
                .qualityNotes(harvest.getQualityNotes())
                .subStandardQuantity(harvest.getSubStandardQuantity())
                .subStandardDisposition(harvest.getSubStandardDisposition() != null ? harvest.getSubStandardDisposition().name() : null)
                // === Packaging & Processing ===
                .packagingType(harvest.getPackagingType() != null ? harvest.getPackagingType().name() : null)
                .packagingCount(harvest.getPackagingCount())
                .processingType(harvest.getProcessingType() != null ? harvest.getProcessingType().name() : null)
                // === Crop Info ===
                .cropCategory(harvest.getCropCategory())
                .grossWetWeight(harvest.getGrossWetWeight())
                .netDryWeight(harvest.getNetDryWeight())
                .warehouseReceiptStatus(harvest.getWarehouseReceiptStatus() != null ? harvest.getWarehouseReceiptStatus().name() : null)
                .build();
    }

    /**
     * Luồng 1: Farmer báo cáo gặt ngoài đồng
     * Hỗ trợ: phân loại chất lượng, tách lô SUBSTANDARD, phân luồng theo nhóm cây.
     *
     * @param qualityGrade       PASSED / SUBSTANDARD / REJECTED (nullable = mặc định PASSED)
     * @param subStandardQty     Khối lượng phần không đạt (chỉ khi SUBSTANDARD)
     * @param subStandardDisp    Hướng xử lý phần không đạt
     * @param packagingType      Loại đóng gói
     * @param packagingCount     Số kiện
     * @param processingType     Loại sơ chế
     */
    @Transactional
    public List<Harvest> reportFieldHarvest(Integer seasonId,
                                            BigDecimal grossWetWeight,
                                            String qualityGrade,
                                            BigDecimal subStandardQty,
                                            String subStandardDisp,
                                            String packagingType,
                                            Integer packagingCount,
                                            String processingType) {
        if (grossWetWeight == null || grossWetWeight.compareTo(BigDecimal.ZERO) <= 0) {
            throw new AppException(ErrorCode.INVALID_SEASON_DATES);
        }

        Season season = getSeasonForCurrentFarmer(seasonId);
        ensureSeasonAllowsHarvest(season);

        // Lấy thông tin cây trồng từ Crop Catalog
        org.example.season.client.CropCatalogClient.CropDto cropInfo;
        try {
            cropInfo = cropCatalogClient.getCropById(season.getCropId());
        } catch (Exception e) {
            throw new IllegalStateException("Không thể truy xuất dữ liệu Sinh lý Nông sản từ Catalog Service.");
        }

        String cropCategory = cropInfo.getCategory();
        org.example.season.enums.QualityGrade grade = parseQualityGrade(qualityGrade);
        org.example.season.enums.PackagingType pkgType = parsePackagingType(packagingType);
        org.example.season.enums.ProcessingType procType = parseProcessingType(processingType);

        // Xác định khối lượng đạt chuẩn
        BigDecimal passedQty = grossWetWeight;
        if (grade == org.example.season.enums.QualityGrade.SUBSTANDARD
                && subStandardQty != null
                && subStandardQty.compareTo(BigDecimal.ZERO) > 0) {
            passedQty = grossWetWeight.subtract(subStandardQty);
            if (passedQty.compareTo(BigDecimal.ZERO) < 0) {
                passedQty = BigDecimal.ZERO;
            }
        }

        // --- Lô chính (PASSED) ---
        Harvest mainHarvest = Harvest.builder()
                .season(season)
                .harvestDate(LocalDate.now())
                .grossWetWeight(grossWetWeight)
                .quantity(passedQty)
                .unit(BigDecimal.ONE)
                .qualityGrade(grade != org.example.season.enums.QualityGrade.SUBSTANDARD ? grade : org.example.season.enums.QualityGrade.PASSED)
                .subStandardQuantity(subStandardQty)
                .subStandardDisposition(parseSubStandardDisposition(subStandardDisp))
                .packagingType(pkgType)
                .packagingCount(packagingCount)
                .processingType(procType)
                .cropCategory(cropCategory)
                .build();

        // Phân luồng warehouse receipt status theo nhóm cây
        boolean isFreshProduce = "VEGETABLE".equalsIgnoreCase(cropCategory) || "FRUIT".equalsIgnoreCase(cropCategory);
        if (isFreshProduce) {
            // Rau/Quả: không cần phơi sấy, postHarvestDelayDays = 0
            mainHarvest.setWarehouseReceiptStatus(org.example.season.enums.WarehouseReceiptStatus.PENDING_RECEIPT);
            // Frontend sẽ nhận postHarvestDelayDays = 0 -> nút "Nhập kho" sáng ngay
        } else if (cropInfo.getPostHarvestDelayDays() != null && cropInfo.getPostHarvestDelayDays() > 0) {
            // GRAIN/TUBER/HERB: cần phơi sấy -> đếm ngược
            mainHarvest.setWarehouseReceiptStatus(org.example.season.enums.WarehouseReceiptStatus.PENDING_RECEIPT);
        } else {
            mainHarvest.setWarehouseReceiptStatus(org.example.season.enums.WarehouseReceiptStatus.PENDING_RECEIPT);
        }

        Harvest savedMain = harvestRepository.save(mainHarvest);
        List<Harvest> results = new java.util.ArrayList<>();
        results.add(savedMain);

        // --- Lô SUBSTANDARD (nếu có) ---
        if (grade == org.example.season.enums.QualityGrade.SUBSTANDARD
                && subStandardQty != null
                && subStandardQty.compareTo(BigDecimal.ZERO) > 0) {
            Harvest subHarvest = Harvest.builder()
                    .season(season)
                    .harvestDate(LocalDate.now())
                    .grossWetWeight(subStandardQty)
                    .quantity(subStandardQty)
                    .unit(BigDecimal.ONE)
                    .qualityGrade(org.example.season.enums.QualityGrade.SUBSTANDARD)
                    .qualityNotes("Tách từ lô #" + savedMain.getId() + " — không đạt chuẩn")
                    .subStandardDisposition(parseSubStandardDisposition(subStandardDisp))
                    .packagingType(pkgType)
                    .processingType(procType)
                    .cropCategory(cropCategory)
                    .warehouseReceiptStatus(org.example.season.enums.WarehouseReceiptStatus.PENDING_RECEIPT)
                    .build();
            results.add(harvestRepository.save(subHarvest));
        }

        return results;
    }

    // === Enum parsing helpers ===
    private org.example.season.enums.QualityGrade parseQualityGrade(String value) {
        if (value == null || value.isBlank()) return org.example.season.enums.QualityGrade.PASSED;
        try { return org.example.season.enums.QualityGrade.valueOf(value.trim().toUpperCase()); }
        catch (IllegalArgumentException e) { return org.example.season.enums.QualityGrade.PASSED; }
    }

    private org.example.season.enums.SubStandardDisposition parseSubStandardDisposition(String value) {
        if (value == null || value.isBlank()) return null;
        try { return org.example.season.enums.SubStandardDisposition.valueOf(value.trim().toUpperCase()); }
        catch (IllegalArgumentException e) { return null; }
    }

    private org.example.season.enums.PackagingType parsePackagingType(String value) {
        if (value == null || value.isBlank()) return null;
        try { return org.example.season.enums.PackagingType.valueOf(value.trim().toUpperCase()); }
        catch (IllegalArgumentException e) { return null; }
    }

    private org.example.season.enums.ProcessingType parseProcessingType(String value) {
        if (value == null || value.isBlank()) return null;
        try { return org.example.season.enums.ProcessingType.valueOf(value.trim().toUpperCase()); }
        catch (IllegalArgumentException e) { return null; }
    }

    /**
     * Luồng 2: Thủ kho xác nhận nhập kho (đã sấy xong hoặc nhập trực tiếp)
     */
    @Transactional
    public Harvest receiveToWarehouse(Integer harvestId, 
                                      BigDecimal currentMoisture, 
                                      BigDecimal targetMoisture, 
                                      BigDecimal mechanicalLossPercentage) {
        
        Harvest harvest = harvestRepository.findById(harvestId)
                .orElseThrow(() -> new AppException(ErrorCode.HARVEST_NOT_FOUND));

        if (org.example.season.enums.WarehouseReceiptStatus.RECEIVED.equals(harvest.getWarehouseReceiptStatus())) {
            throw new IllegalStateException("Lô thu hoạch này đã được nhập kho trước đó.");
        }

        if (harvest.getGrossWetWeight() == null) {
            throw new IllegalStateException("Thiếu dữ liệu khối lượng gặt thực tế ngoài đồng.");
        }

        // [FIX 3] Nếu không truyền độ ẩm (ví dụ: rau củ), coi độ ẩm bằng 0 để bypass công thức bốc hơi
        BigDecimal netWeight = GrainMoistureCalculator.calculateNetDryWeight(
                harvest.getGrossWetWeight(), 
                currentMoisture != null ? currentMoisture : BigDecimal.ZERO, 
                targetMoisture != null ? targetMoisture : BigDecimal.ZERO, 
                mechanicalLossPercentage != null ? mechanicalLossPercentage : BigDecimal.ZERO
        );

        harvest.setNetDryWeight(netWeight);
        harvest.setWarehouseReceivedDate(LocalDate.now());
        harvest.setWarehouseReceiptStatus(org.example.season.enums.WarehouseReceiptStatus.RECEIVED);
        
        Harvest savedHarvest = harvestRepository.save(harvest);

        // Gọi đồng bộ tồn kho
        org.example.season.client.InventoryServiceClient.HarvestSyncDto syncDto = 
                new org.example.season.client.InventoryServiceClient.HarvestSyncDto(
                savedHarvest.getId(), 
                savedHarvest.getSeason().getId(), 
                netWeight
        );
        try {
            inventoryServiceClient.syncHarvestToInventory(syncDto);
        } catch (Exception e) {
            // Trong thực tế, nên dùng Kafka/RabbitMQ thay vì Feign ở đây để đảm bảo Eventually Consistency
            throw new IllegalStateException("Lỗi đồng bộ dữ liệu sang Kho bãi: " + e.getMessage());
        }

        return savedHarvest;
    }
}
