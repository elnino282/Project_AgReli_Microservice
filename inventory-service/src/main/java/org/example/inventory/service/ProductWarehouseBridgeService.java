package org.example.inventory.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.example.inventory.dto.request.ReceiveHarvestRequest;
import org.example.inventory.dto.request.SyncLotRequest;
import org.example.inventory.dto.response.HarvestStockContextDto;
import org.example.inventory.dto.response.ProductWarehouseLotDto;
import org.example.inventory.dto.response.ValidationResultDto;
import org.example.inventory.entity.ProductWarehouseLot;
import org.example.inventory.entity.ProductWarehouseTransaction;
import org.example.inventory.entity.StockLocation;
import org.example.inventory.entity.Warehouse;
import org.example.inventory.enums.ProductWarehouseLotStatus;
import org.example.inventory.enums.ProductWarehouseTransactionType;
import org.example.inventory.event.DomainEventPublisher;
import org.example.inventory.event.ProductWarehouseLotReceivedEvent;
import org.example.inventory.exception.AppException;
import org.example.inventory.exception.ErrorCode;
import org.example.inventory.repository.InventoryBalanceRepository;
import org.example.inventory.repository.ProductWarehouseLotRepository;
import org.example.inventory.repository.ProductWarehouseTransactionRepository;
import org.example.inventory.repository.StockLocationRepository;
import org.example.inventory.repository.StockMovementRepository;
import org.example.inventory.repository.SupplyItemRepository;
import org.example.inventory.repository.SupplyLotRepository;
import org.example.inventory.repository.WarehouseRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional
public class ProductWarehouseBridgeService {

    private static final String OUTPUT_WAREHOUSE_TYPE = "OUTPUT";
    private static final String DEFAULT_HARVEST_UNIT = "kg";

    private final SupplyLotRepository supplyLotRepository;
    private final SupplyItemRepository supplyItemRepository;
    private final InventoryBalanceRepository inventoryBalanceRepository;
    private final StockMovementRepository stockMovementRepository;
    private final ProductWarehouseLotRepository productWarehouseLotRepository;
    private final ProductWarehouseTransactionRepository productWarehouseTransactionRepository;
    private final WarehouseRepository warehouseRepository;
    private final StockLocationRepository stockLocationRepository;
    private final ObjectMapper objectMapper;
    private final DomainEventPublisher domainEventPublisher;

    @Transactional(readOnly = true)
    public ValidationResultDto validateSupplyLot(Integer lotId, Integer itemId, List<Integer> farmIds) {
        var supplyLot = supplyLotRepository.findById(lotId).orElse(null);
        if (supplyLot == null) {
            return invalid("SUPPLY_LOT_NOT_FOUND", "Supply lot not found");
        }

        if (!hasSupplyLotAccess(lotId, farmIds)) {
            return invalid("FORBIDDEN", "Supply lot not accessible for farms");
        }

        Integer lotSupplyItemId = supplyLot.getSupplyItemId();
        if (itemId != null && lotSupplyItemId != null && !itemId.equals(lotSupplyItemId)) {
            return invalid("DISEASE_SUPPLY_ITEM_LOT_MISMATCH", "Supply item lot mismatch");
        }

        return ValidationResultDto.builder()
                .valid(true)
                .resolvedItemId(lotSupplyItemId)
                .build();
    }

    @Transactional(readOnly = true)
    public ValidationResultDto validateSupplyItem(Integer itemId, List<Integer> farmIds) {
        if (!supplyItemRepository.existsById(itemId)) {
            return invalid("SUPPLY_ITEM_NOT_FOUND", "Supply item not found");
        }

        if (!hasSupplyItemAccess(itemId, farmIds)) {
            return invalid("FORBIDDEN", "Supply item not accessible for farms");
        }

        return ValidationResultDto.builder().valid(true).build();
    }

    @Transactional(readOnly = true)
    public String getSupplyItemName(Integer id) {
        return supplyItemRepository.findById(id)
                .map(item -> item.getName())
                .orElse(null);
    }

    @Transactional(readOnly = true)
    public String getSupplyLotBatchCode(Integer id) {
        return supplyLotRepository.findById(id)
                .map(lot -> lot.getBatchCode())
                .orElse(null);
    }

    public ProductWarehouseLotDto receiveFromHarvest(Integer harvestId, Long actorUserId, ReceiveHarvestRequest request) {
        if (harvestId == null || request == null) {
            throw new AppException(ErrorCode.BAD_REQUEST);
        }

        var existingLot = productWarehouseLotRepository.findByHarvestId(harvestId);
        if (existingLot.isPresent()) {
            return toLotDto(existingLot.get());
        }

        require(request.getFarmId());
        require(request.getPlotId());
        require(request.getSeasonId());
        require(request.getHarvestDate());
        BigDecimal quantity = normalizePositiveQuantity(request.getQuantity());

        Warehouse warehouse = resolveWarehouseForHarvestReceipt(request);
        StockLocation location = resolveLocationForHarvestReceipt(warehouse, request);
        String lotCode = resolveLotCodeForHarvest(request, harvestId);
        ensureUniqueLotCode(lotCode);

        String productName = firstNonBlank(request.getProductName(), request.getCropName(), "Harvest Product");
        String productVariant = normalizeBlankToNull(firstNonBlank(request.getProductVariant(), request.getVarietyName(), null));
        String unit = resolveHarvestUnit(request);
        LocalDateTime receivedAt = LocalDateTime.now();

        ProductWarehouseLot lot = ProductWarehouseLot.builder()
                .lotCode(lotCode)
                .productId(request.getProductId())
                .productName(productName)
                .productVariant(productVariant)
                .seasonId(request.getSeasonId())
                .farmId(request.getFarmId())
                .plotId(request.getPlotId())
                .harvestId(harvestId)
                .warehouseId(warehouse.getId())
                .locationId(location != null ? location.getId() : null)
                .harvestedAt(request.getHarvestDate())
                .receivedAt(receivedAt)
                .unit(unit)
                .initialQuantity(quantity)
                .onHandQuantity(quantity)
                .grade(normalizeBlankToNull(request.getGrade()))
                .qualityStatus(normalizeBlankToNull(request.getGrade()))
                .traceabilityData(buildHarvestTraceabilityData(harvestId, request, actorUserId, receivedAt))
                .note(normalizeBlankToNull(request.getNote()))
                .status(ProductWarehouseLotStatus.IN_STOCK)
                .createdBy(actorUserId)
                // === Crop & Packaging Fields ===
                .cropCategory(normalizeBlankToNull(request.getCropCategory()))
                .expiryDate(request.getExpiryDate())
                .packagingType(normalizeBlankToNull(request.getPackagingType()))
                .packagingCount(request.getPackagingCount())
                .processingType(normalizeBlankToNull(request.getProcessingType()))
                .build();

        ProductWarehouseLot saved = productWarehouseLotRepository.save(lot);
        createTransaction(saved, ProductWarehouseTransactionType.RECEIPT_FROM_HARVEST, quantity, "HARVEST",
                String.valueOf(harvestId), "Received from harvest", actorUserId);
        publishLotReceived(saved);
        return toLotDto(saved);
    }

    @Transactional(readOnly = true)
    public List<ProductWarehouseLotDto> findLotsBySeasonIds(List<Integer> seasonIds) {
        if (seasonIds == null || seasonIds.isEmpty()) {
            return List.of();
        }
        return productWarehouseLotRepository.findAllBySeasonIdIn(seasonIds).stream()
                .map(this::toLotDto)
                .toList();
    }

    @Transactional(readOnly = true)
    public ProductWarehouseLotDto findLotByHarvestId(Integer harvestId) {
        return productWarehouseLotRepository.findByHarvestId(harvestId)
                .map(this::toLotDto)
                .orElse(null);
    }

    @Transactional(readOnly = true)
    public List<ProductWarehouseLotDto> findLotsByHarvestIds(List<Integer> harvestIds) {
        if (harvestIds == null || harvestIds.isEmpty()) {
            return List.of();
        }
        return productWarehouseLotRepository.findAllByHarvestIdIn(harvestIds).stream()
                .map(this::toLotDto)
                .toList();
    }

    public ProductWarehouseLotDto syncLinkedLotFromHarvest(Integer lotId, SyncLotRequest request) {
        ProductWarehouseLot lot = productWarehouseLotRepository.findById(lotId)
                .orElseThrow(() -> new AppException(ErrorCode.RESOURCE_NOT_FOUND));

        lot.setHarvestedAt(request.getHarvestedAt());
        lot.setInitialQuantity(request.getInitialQuantity());
        lot.setOnHandQuantity(request.getOnHandQuantity());
        lot.setGrade(normalizeBlankToNull(request.getGrade()));
        lot.setQualityStatus(normalizeBlankToNull(request.getQualityStatus()));
        lot.setNote(normalizeBlankToNull(request.getNote()));
        if (request.getStatus() != null) {
            lot.setStatus(ProductWarehouseLotStatus.fromCode(request.getStatus()));
        }
        ProductWarehouseLot saved = productWarehouseLotRepository.save(lot);
        return toLotDto(saved);
    }

    @Transactional(readOnly = true)
    public Boolean existsProductWarehouseLotByHarvestId(Integer harvestId) {
        return harvestId != null && productWarehouseLotRepository.existsByHarvestId(harvestId);
    }

    @Transactional(readOnly = true)
    public HarvestStockContextDto findHarvestStockContext(
            Integer farmId,
            Integer warehouseId,
            String productName,
            String lotCode) {
        if (farmId == null || warehouseId == null || productName == null || productName.isBlank()
                || lotCode == null || lotCode.isBlank()) {
            return null;
        }

        List<ProductWarehouseLot> matchingLots = productWarehouseLotRepository.findByFarmWarehouseProductAndLotCode(
                farmId,
                warehouseId,
                productName.trim(),
                lotCode.trim());

        if (matchingLots.isEmpty()) {
            return null;
        }

        BigDecimal onHand = matchingLots.stream()
                .map(lot -> lot.getOnHandQuantity() != null ? lot.getOnHandQuantity() : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        ProductWarehouseLot firstLot = matchingLots.get(0);
        String warehouseName = warehouseRepository.findById(firstLot.getWarehouseId())
                .map(Warehouse::getName)
                .orElse(null);

        return HarvestStockContextDto.builder()
                .matchingLots((long) matchingLots.size())
                .onHandQuantity(onHand)
                .unit(firstLot.getUnit())
                .warehouseName(warehouseName)
                .build();
    }

    private boolean hasSupplyLotAccess(Integer lotId, List<Integer> farmIds) {
        if (farmIds == null || farmIds.isEmpty()) {
            return false;
        }
        List<Integer> warehouseIds = warehouseRepository.findByFarmIdIn(farmIds).stream()
                .map(Warehouse::getId)
                .toList();
        if (warehouseIds.isEmpty()) {
            return false;
        }
        return inventoryBalanceRepository.findAll().stream()
                .anyMatch(balance -> lotId.equals(balance.getSupplyLotId()) && warehouseIds.contains(balance.getWarehouseId()))
                || stockMovementRepository.findAll().stream()
                .anyMatch(movement -> lotId.equals(movement.getSupplyLotId()) && warehouseIds.contains(movement.getWarehouseId()));
    }

    private boolean hasSupplyItemAccess(Integer itemId, List<Integer> farmIds) {
        if (farmIds == null || farmIds.isEmpty()) {
            return false;
        }
        List<Integer> accessibleLotIds = supplyLotRepository.findAllBySupplyItemId(itemId).stream()
                .map(lot -> lot.getId())
                .toList();
        if (accessibleLotIds.isEmpty()) {
            return false;
        }
        List<Integer> warehouseIds = warehouseRepository.findByFarmIdIn(farmIds).stream()
                .map(Warehouse::getId)
                .toList();
        if (warehouseIds.isEmpty()) {
            return false;
        }
        return inventoryBalanceRepository.findAll().stream()
                .anyMatch(balance -> accessibleLotIds.contains(balance.getSupplyLotId())
                        && warehouseIds.contains(balance.getWarehouseId())
                        && balance.getQuantity() != null
                        && balance.getQuantity().compareTo(BigDecimal.ZERO) > 0);
    }

    @Transactional(readOnly = true)
    public List<String> getAvailableSupplyNames(List<Integer> farmIds) {
        return findAvailableItemIds(farmIds).stream()
                .map(id -> supplyItemRepository.findById(id).map(item -> item.getName()).orElse(null))
                .filter(name -> name != null)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<org.example.inventory.dto.response.SupplyItemLookupDto> getAvailableSupplyDetails(List<Integer> farmIds) {
        return findAvailableItemIds(farmIds).stream()
                .map(id -> supplyItemRepository.findById(id).orElse(null))
                .filter(item -> item != null)
                .map(item -> org.example.inventory.dto.response.SupplyItemLookupDto.builder()
                        .id(item.getId())
                        .name(item.getName())
                        .activeIngredient(item.getActiveIngredient())
                        .restrictedFlag(item.getRestrictedFlag())
                        .build())
                .toList();
    }

    private List<Integer> findAvailableItemIds(List<Integer> farmIds) {
        if (farmIds == null || farmIds.isEmpty()) {
            return List.of();
        }
        List<Integer> warehouseIds = warehouseRepository.findByFarmIdIn(farmIds).stream()
                .map(Warehouse::getId)
                .toList();
        if (warehouseIds.isEmpty()) {
            return List.of();
        }
        return inventoryBalanceRepository.findAll().stream()
                .filter(balance -> warehouseIds.contains(balance.getWarehouseId())
                        && balance.getQuantity() != null
                        && balance.getQuantity().compareTo(BigDecimal.ZERO) > 0)
                .map(balance -> {
                    var lot = supplyLotRepository.findById(balance.getSupplyLotId()).orElse(null);
                    return lot != null ? lot.getSupplyItemId() : null;
                })
                .filter(id -> id != null)
                .distinct()
                .toList();
    }

    private Warehouse resolveWarehouseForHarvestReceipt(ReceiveHarvestRequest request) {
        if (request.getWarehouseId() != null) {
            Warehouse warehouse = warehouseRepository.findById(request.getWarehouseId())
                    .orElseThrow(() -> new AppException(ErrorCode.RESOURCE_NOT_FOUND));
            ensureWarehouseBelongsToFarm(warehouse, request.getFarmId());
            return warehouse;
        }

        List<Warehouse> warehouses = warehouseRepository.findAllByFarmId(request.getFarmId());
        if (warehouses.isEmpty()) {
            throw new AppException(ErrorCode.RESOURCE_NOT_FOUND);
        }

        // Ưu tiên theo loại storage (COLD cho Rau/Quả, DRY cho Lúa/Củ)
        String category = request.getCropCategory();
        String preferredStorage = null;
        if (category != null) {
            if (category.equalsIgnoreCase("VEGETABLE") || category.equalsIgnoreCase("FRUIT")) {
                preferredStorage = "COLD";
            } else if (category.equalsIgnoreCase("GRAIN") || category.equalsIgnoreCase("TUBER") || category.equalsIgnoreCase("HERB")) {
                preferredStorage = "DRY";
            }
        }

        // Thử tìm kho theo preferredStorage
        if (preferredStorage != null) {
            final String targetStorage = preferredStorage;
            var matchedStorage = warehouses.stream()
                    .filter(w -> w.getStorageCategory() != null && targetStorage.equalsIgnoreCase(w.getStorageCategory().name()))
                    .findFirst();
            if (matchedStorage.isPresent()) {
                return matchedStorage.get();
            }
        }

        // Fallback về loại PRODUCT (OUTPUT_WAREHOUSE_TYPE)
        return warehouses.stream()
                .filter(warehouse -> warehouse.getType() != null && OUTPUT_WAREHOUSE_TYPE.equalsIgnoreCase(warehouse.getType()))
                .findFirst()
                .orElse(warehouses.get(0));
    }

    private StockLocation resolveLocationForHarvestReceipt(Warehouse warehouse, ReceiveHarvestRequest request) {
        if (request.getLocationId() != null) {
            StockLocation location = stockLocationRepository.findById(request.getLocationId())
                    .orElseThrow(() -> new AppException(ErrorCode.RESOURCE_NOT_FOUND));
            if (!warehouse.getId().equals(location.getWarehouseId())) {
                throw new AppException(ErrorCode.BAD_REQUEST);
            }
            return location;
        }
        List<StockLocation> locations = stockLocationRepository.findAllByWarehouseId(warehouse.getId());
        return locations.isEmpty() ? null : locations.get(0);
    }

    private void ensureWarehouseBelongsToFarm(Warehouse warehouse, Integer farmId) {
        if (warehouse.getFarmId() == null || farmId == null || !warehouse.getFarmId().equals(farmId)) {
            throw new AppException(ErrorCode.BAD_REQUEST);
        }
    }

    private String resolveLotCodeForHarvest(ReceiveHarvestRequest request, Integer harvestId) {
        if (request.getLotCode() != null && !request.getLotCode().isBlank()) {
            return request.getLotCode().trim();
        }
        String prefix = firstNonBlank(request.getCropName(), request.getProductName(), "PRODUCT")
                .replaceAll("[^A-Za-z0-9]", "")
                .toUpperCase();
        if (prefix.isBlank()) {
            prefix = "PRODUCT";
        }
        String datePart = request.getHarvestDate() != null
                ? request.getHarvestDate().format(DateTimeFormatter.BASIC_ISO_DATE)
                : LocalDate.now().format(DateTimeFormatter.BASIC_ISO_DATE);
        return "PH-" + prefix + "-" + datePart + "-" + harvestId;
    }

    private String resolveHarvestUnit(ReceiveHarvestRequest request) {
        String unit = normalizeBlankToNull(request.getUnit());
        return unit != null ? unit : DEFAULT_HARVEST_UNIT;
    }

    private void ensureUniqueLotCode(String lotCode) {
        if (productWarehouseLotRepository.findByLotCode(lotCode).isPresent()) {
            throw new AppException(ErrorCode.DUPLICATE_RESOURCE);
        }
    }

    private BigDecimal normalizePositiveQuantity(BigDecimal quantity) {
        if (quantity == null || quantity.compareTo(BigDecimal.ZERO) <= 0) {
            throw new AppException(ErrorCode.BAD_REQUEST);
        }
        return quantity;
    }

    private ProductWarehouseTransaction createTransaction(
            ProductWarehouseLot lot,
            ProductWarehouseTransactionType type,
            BigDecimal quantity,
            String referenceType,
            String referenceId,
            String note,
            Long actorUserId) {
        ProductWarehouseTransaction transaction = ProductWarehouseTransaction.builder()
                .lotId(lot.getId())
                .transactionType(type)
                .quantity(quantity)
                .unit(lot.getUnit())
                .resultingOnHand(lot.getOnHandQuantity())
                .referenceType(referenceType)
                .referenceId(referenceId)
                .note(normalizeBlankToNull(note))
                .createdBy(actorUserId)
                .build();
        return productWarehouseTransactionRepository.save(transaction);
    }

    private String buildHarvestTraceabilityData(
            Integer harvestId,
            ReceiveHarvestRequest request,
            Long actorUserId,
            LocalDateTime receivedAt) {
        Map<String, Object> trace = new LinkedHashMap<>();
        trace.put("source", "HARVEST");
        trace.put("harvestId", harvestId);
        trace.put("seasonId", request.getSeasonId());
        trace.put("seasonName", request.getSeasonName());
        trace.put("farmId", request.getFarmId());
        trace.put("farmName", request.getFarmName());
        trace.put("plotId", request.getPlotId());
        trace.put("plotName", request.getPlotName());
        trace.put("cropId", request.getCropId());
        trace.put("cropName", request.getCropName());
        trace.put("varietyId", request.getVarietyId());
        trace.put("varietyName", request.getVarietyName());
        trace.put("harvestedAt", request.getHarvestDate());
        trace.put("receivedAt", receivedAt);
        trace.put("recordedBy", actorUserId);
        trace.put("initialQuantity", request.getQuantity());
        trace.put("grade", request.getGrade());
        trace.put("note", request.getNote());
        try {
            return objectMapper.writeValueAsString(trace);
        } catch (JsonProcessingException e) {
            return "{}";
        }
    }

    private void publishLotReceived(ProductWarehouseLot lot) {
        domainEventPublisher.publish(new ProductWarehouseLotReceivedEvent(
                "ProductWarehouseLot",
                String.valueOf(lot.getId()),
                "inventory-service",
                lot.getId(),
                lot.getHarvestId(),
                lot.getSeasonId(),
                lot.getFarmId(),
                lot.getWarehouseId(),
                lot.getInitialQuantity(),
                lot.getUnit()
        ));
    }

    private ProductWarehouseLotDto toLotDto(ProductWarehouseLot lot) {
        if (lot == null) {
            return null;
        }
        return ProductWarehouseLotDto.builder()
                .id(lot.getId())
                .lotCode(lot.getLotCode())
                .productId(lot.getProductId())
                .productName(lot.getProductName())
                .productVariant(lot.getProductVariant())
                .harvestId(lot.getHarvestId())
                .warehouseId(lot.getWarehouseId())
                .locationId(lot.getLocationId())
                .harvestedAt(lot.getHarvestedAt())
                .unit(lot.getUnit())
                .initialQuantity(lot.getInitialQuantity())
                .onHandQuantity(lot.getOnHandQuantity())
                .grade(lot.getGrade())
                .qualityStatus(lot.getQualityStatus())
                .note(lot.getNote())
                .status(lot.getStatus())
                .build();
    }

    private ValidationResultDto invalid(String code, String message) {
        return ValidationResultDto.builder()
                .valid(false)
                .errorCode(code)
                .errorMessage(message)
                .build();
    }

    private void require(Object value) {
        if (value == null) {
            throw new AppException(ErrorCode.BAD_REQUEST);
        }
    }

    private String firstNonBlank(String first, String second, String fallback) {
        String normalizedFirst = normalizeBlankToNull(first);
        if (normalizedFirst != null) {
            return normalizedFirst;
        }
        String normalizedSecond = normalizeBlankToNull(second);
        return normalizedSecond != null ? normalizedSecond : fallback;
    }

    private String normalizeBlankToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}
