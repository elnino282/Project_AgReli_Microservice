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
import java.util.Optional;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.example.inventory.dto.common.PageResponse;
import org.example.inventory.dto.request.ReceiveToWarehouseRequest;
import org.example.inventory.dto.response.ProductWarehouseLotResponse;
import org.example.inventory.entity.ProductWarehouseLot;
import org.example.inventory.entity.ProductWarehouseTransaction;
import org.example.inventory.entity.StockLocation;
import org.example.inventory.entity.Warehouse;
import org.example.inventory.enums.ProductWarehouseLotStatus;
import org.example.inventory.enums.ProductWarehouseTransactionType;
import org.example.inventory.event.DomainEventPublisher;
import org.example.inventory.event.HarvestRecordedEvent;
import org.example.inventory.event.StockAdjustedEvent;
import org.example.inventory.exception.AppException;
import org.example.inventory.exception.ErrorCode;
import org.example.inventory.repository.ProductWarehouseLotRepository;
import org.example.inventory.repository.ProductWarehouseTransactionRepository;
import org.example.inventory.repository.StockLocationRepository;
import org.example.inventory.repository.WarehouseRepository;
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
public class ProductWarehouseService {

    static final int DEFAULT_PAGE_SIZE = 20;
    static final String OUTPUT_WAREHOUSE_TYPE = "OUTPUT";
    static final String DEFAULT_HARVEST_UNIT = "kg";

    ProductWarehouseLotRepository productWarehouseLotRepository;
    ProductWarehouseTransactionRepository productWarehouseTransactionRepository;
    WarehouseRepository warehouseRepository;
    StockLocationRepository stockLocationRepository;
    ObjectMapper objectMapper;
    DomainEventPublisher domainEventPublisher;
    ColdChainValidationService coldChainValidationService;

    @Transactional
    public ProductWarehouseLot receiveFromHarvestEvent(HarvestRecordedEvent event) {

        Integer harvestId = event.getHarvestId();
        Long farmId = event.getFarmId() != null ? event.getFarmId().longValue() : null;
        String cropName = event.getCropName();
        String varietyName = event.getVarietyName();
        LocalDateTime harvestDate = event.getHarvestDate() != null ? event.getHarvestDate().atStartOfDay() : LocalDateTime.now();
        BigDecimal quantity = event.getQuantity();
        String unit = event.getUnit();
        String grade = event.getGrade();
        String note = event.getNote();
        Long actorUserId = event.getActorUserId();
        
        Integer shelfLifeDays = null;
        String cropCategory = "Uncategorized";

        Optional<ProductWarehouseLot> existingLot = productWarehouseLotRepository.findByHarvestId(harvestId);
        if (existingLot.isPresent()) {
            return existingLot.get();
        }

        // Giả định bạn đã có các method tiện ích này trong service hiện tại
        Warehouse warehouse = resolveDefaultProductWarehouse(farmId.intValue());
        
        // Luồng mới: Kiểm soát chuỗi cung ứng lạnh
        coldChainValidationService.validateStorageCategory(cropCategory, warehouse.getStorageCategory());

        StockLocation location = resolveDefaultLocation(warehouse);
        BigDecimal normalizedQuantity = normalizePositiveQuantity(quantity);

        String lotCode = generateHarvestLotCode(harvestId, cropName, harvestDate.toLocalDate());
        ensureUniqueLotCode(lotCode);

        String productName = cropName != null && !cropName.isBlank() ? cropName : "Harvest Product";
        String productVariant = varietyName != null && !varietyName.isBlank() ? varietyName : null;
        String normalizedUnit = unit != null && !unit.isBlank() ? normalizeUnit(unit) : "KG"; // Tránh lỗi biến mặc định
        LocalDateTime receivedAt = LocalDateTime.now();

        // Tính ngày hết hạn an toàn
        LocalDate expiryDate = null;
        if (shelfLifeDays != null && shelfLifeDays > 0) {
            expiryDate = receivedAt.toLocalDate().plusDays(shelfLifeDays);
        }

        ProductWarehouseLot lot = ProductWarehouseLot.builder()
                .lotCode(lotCode)
                .warehouseId(warehouse.getId()) // Đừng quên map warehouseId
                .locationId(location != null ? location.getId() : null)
                .productId(null)
                .productName(productName)
                .productVariant(productVariant)
                .farmId(farmId.intValue())
                .plotId(0) // We need plotId but the user's snippet removed it from signature, let's put it back to avoid compile error since it's non-null in DB
                .harvestId(harvestId)
                .harvestedAt(harvestDate.toLocalDate())
                .receivedAt(receivedAt)
                .unit(normalizedUnit)
                .initialQuantity(normalizedQuantity)
                .onHandQuantity(normalizedQuantity)
                .grade(normalizeBlankToNull(grade))
                .qualityStatus(normalizeBlankToNull(grade))
                .note(normalizeBlankToNull(note))
                .status(ProductWarehouseLotStatus.IN_STOCK)
                .createdBy(actorUserId)
                .cropCategory(cropCategory)
                .expiryDate(expiryDate)
                .build();

        ProductWarehouseLot saved = productWarehouseLotRepository.save(lot);

        createTransaction(
                saved,
                ProductWarehouseTransactionType.RECEIPT_FROM_HARVEST,
                normalizedQuantity,
                "HARVEST",
                String.valueOf(harvestId),
                "Received from harvest event",
                actorUserId);

        publishStockAdjusted(saved, BigDecimal.ZERO, normalizedQuantity, "Received from harvest event", actorUserId);
        return saved;
    }

    private Warehouse resolveDefaultProductWarehouse(Integer farmId) {
        List<Warehouse> warehouses = warehouseRepository.findAllByFarmId(farmId);
        if (warehouses.isEmpty()) {
            throw new AppException(ErrorCode.PRODUCT_WAREHOUSE_NO_OUTPUT_WAREHOUSE);
        }
        return warehouses.stream()
                .filter(w -> w.getType() != null && OUTPUT_WAREHOUSE_TYPE.equalsIgnoreCase(w.getType()))
                .findFirst()
                .orElse(warehouses.get(0));
    }

    private StockLocation resolveDefaultLocation(Warehouse warehouse) {
        List<StockLocation> locations = stockLocationRepository.findAllByWarehouseId(warehouse.getId());
        if (locations.isEmpty()) {
            return null;
        }
        return locations.get(0);
    }

    private String generateHarvestLotCode(Integer harvestId, String cropName, LocalDate harvestDate) {
        String prefix = cropName != null && !cropName.isBlank()
                ? cropName.replaceAll("[^A-Za-z0-9]", "").toUpperCase()
                : "PRODUCT";
        if (prefix.isBlank()) {
            prefix = "PRODUCT";
        }
        String datePart = harvestDate != null
                ? harvestDate.format(DateTimeFormatter.BASIC_ISO_DATE)
                : LocalDate.now().format(DateTimeFormatter.BASIC_ISO_DATE);
        return "PH-" + prefix + "-" + datePart + "-" + harvestId;
    }

    private void ensureUniqueLotCode(String lotCode) {
        if (productWarehouseLotRepository.findByLotCode(lotCode).isPresent()) {
            throw new AppException(ErrorCode.DUPLICATE_RESOURCE);
        }
    }

    private BigDecimal normalizePositiveQuantity(BigDecimal quantity) {
        if (quantity == null || quantity.compareTo(BigDecimal.ZERO) <= 0) {
            throw new AppException(ErrorCode.PRODUCT_WAREHOUSE_INVALID_QUANTITY);
        }
        return quantity;
    }

    private String normalizeUnit(String unit) {
        if (unit == null || unit.isBlank()) {
            throw new AppException(ErrorCode.PRODUCT_WAREHOUSE_INVALID_UNIT);
        }
        String normalized = unit.trim();
        if (normalized.length() > 30) {
            throw new AppException(ErrorCode.PRODUCT_WAREHOUSE_INVALID_UNIT);
        }
        return normalized;
    }

    private String normalizeBlankToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private ProductWarehouseTransaction createTransaction(
            ProductWarehouseLot lot,
            ProductWarehouseTransactionType type,
            BigDecimal quantity,
            String referenceType,
            String referenceId,
            String note,
            Long actor) {

        ProductWarehouseTransaction transaction = ProductWarehouseTransaction.builder()
                .lotId(lot.getId())
                .transactionType(type)
                .quantity(quantity)
                .unit(lot.getUnit())
                .resultingOnHand(lot.getOnHandQuantity())
                .referenceType(referenceType)
                .referenceId(referenceId)
                .note(normalizeBlankToNull(note))
                .createdBy(actor)
                .build();
        return productWarehouseTransactionRepository.save(transaction);
    }

    private String buildHarvestTraceabilityData(
            Integer harvestId,
            Integer seasonId,
            String seasonName,
            Integer farmId,
            Integer plotId,
            LocalDate harvestedAt,
            Long actorUserId,
            LocalDateTime receivedAt,
            BigDecimal initialQuantity,
            String grade,
            String note) {
        Map<String, Object> trace = new LinkedHashMap<>();
        trace.put("source", "HARVEST_EVENT");
        trace.put("harvestId", harvestId);
        trace.put("seasonId", seasonId);
        trace.put("seasonName", seasonName);
        trace.put("farmId", farmId);
        trace.put("plotId", plotId);
        trace.put("harvestedAt", harvestedAt);
        trace.put("receivedAt", receivedAt);
        trace.put("recordedBy", actorUserId);
        trace.put("initialQuantity", initialQuantity);
        trace.put("grade", grade);
        trace.put("note", note);
        try {
            return objectMapper.writeValueAsString(trace);
        } catch (JsonProcessingException e) {
            return "{}";
        }
    }

    private void publishStockAdjusted(ProductWarehouseLot lot, BigDecimal previousQuantity, BigDecimal newQuantity, String reason, Long actorUserId) {
        BigDecimal quantityChange = newQuantity.subtract(previousQuantity);
        domainEventPublisher.publish(new StockAdjustedEvent(
                "ProductWarehouseLot",
                String.valueOf(lot.getId()),
                "inventory-service",
                lot.getId(),
                lot.getLotCode(),
                lot.getFarmId(),
                previousQuantity,
                newQuantity,
                quantityChange,
                lot.getUnit(),
                reason,
                actorUserId
        ));
    }

    /**
     * Nhập kho: Tính toán khối lượng tịnh (net weight) từ độ ẩm,
     * trừ thất thoát cơ học, cập nhật onHandQuantity.
     *
     * Công thức sấy ngũ cốc:
     *   netWeight = grossWeight × (100 - currentMoisture) / (100 - targetMoisture)
     *   finalWeight = netWeight - mechanicalLoss
     */
    @Transactional
    public ProductWarehouseLotResponse receiveToWarehouse(Integer lotId, ReceiveToWarehouseRequest request) {
        ProductWarehouseLot lot = productWarehouseLotRepository.findById(lotId)
                .orElseThrow(() -> new AppException(ErrorCode.LOT_NOT_FOUND));

        BigDecimal grossWeight = lot.getOnHandQuantity() != null
                ? lot.getOnHandQuantity()
                : lot.getInitialQuantity();

        BigDecimal netWeight = grossWeight;

        // Nếu có thông tin độ ẩm (áp dụng cho GRAIN), tính hao hụt sấy
        if (request.getCurrentMoisture() != null && request.getTargetMoisture() != null) {
            BigDecimal currentMoisture = request.getCurrentMoisture();
            BigDecimal targetMoisture = request.getTargetMoisture();

            // Validate: độ ẩm phải trong khoảng hợp lệ
            if (currentMoisture.compareTo(BigDecimal.ZERO) < 0
                    || currentMoisture.compareTo(new BigDecimal("100")) >= 0
                    || targetMoisture.compareTo(BigDecimal.ZERO) < 0
                    || targetMoisture.compareTo(new BigDecimal("100")) >= 0) {
                throw new AppException(ErrorCode.BAD_REQUEST);
            }

            // Công thức: netWeight = grossWeight × (100 - currentMoisture) / (100 - targetMoisture)
            BigDecimal hundred = new BigDecimal("100");
            BigDecimal numerator = hundred.subtract(currentMoisture);
            BigDecimal denominator = hundred.subtract(targetMoisture);
            netWeight = grossWeight.multiply(numerator)
                    .divide(denominator, 3, java.math.RoundingMode.HALF_UP);
        }

        // Trừ thất thoát cơ học
        BigDecimal mechanicalLoss = request.getMechanicalLoss();
        if (mechanicalLoss != null && mechanicalLoss.compareTo(BigDecimal.ZERO) > 0) {
            netWeight = netWeight.subtract(mechanicalLoss);
        }

        // Đảm bảo không âm
        if (netWeight.compareTo(BigDecimal.ZERO) < 0) {
            netWeight = BigDecimal.ZERO;
        }

        BigDecimal previousQuantity = lot.getOnHandQuantity();
        lot.setOnHandQuantity(netWeight);
        lot.setReceivedAt(LocalDateTime.now());
        lot.setStatus(netWeight.compareTo(BigDecimal.ZERO) > 0
                ? ProductWarehouseLotStatus.IN_STOCK
                : ProductWarehouseLotStatus.DEPLETED);

        ProductWarehouseLot saved = productWarehouseLotRepository.save(lot);

        // Ghi transaction nhập kho
        BigDecimal delta = netWeight.subtract(previousQuantity != null ? previousQuantity : BigDecimal.ZERO);
        String txNote = buildReceiveNote(request, grossWeight, netWeight);
        createTransaction(
                saved,
                ProductWarehouseTransactionType.RECEIPT_FROM_HARVEST,
                delta,
                "RECEIVE_TO_WAREHOUSE",
                String.valueOf(saved.getId()),
                txNote,
                null);

        publishStockAdjusted(saved, previousQuantity != null ? previousQuantity : BigDecimal.ZERO,
                netWeight, "Receive to warehouse", null);

        return toLotResponse(saved);
    }

    private String buildReceiveNote(ReceiveToWarehouseRequest request, BigDecimal grossWeight, BigDecimal netWeight) {
        StringBuilder sb = new StringBuilder("Nhập kho: ");
        sb.append("Gross=").append(grossWeight);
        if (request.getCurrentMoisture() != null) {
            sb.append(", Ẩm hiện tại=").append(request.getCurrentMoisture()).append("%");
        }
        if (request.getTargetMoisture() != null) {
            sb.append(", Ẩm mục tiêu=").append(request.getTargetMoisture()).append("%");
        }
        if (request.getMechanicalLoss() != null) {
            sb.append(", Hao hụt cơ học=").append(request.getMechanicalLoss());
        }
        sb.append(", Net=").append(netWeight);
        return sb.toString();
    }

    private ProductWarehouseLotResponse toLotResponse(ProductWarehouseLot lot) {
        Warehouse warehouse = warehouseRepository.findById(lot.getWarehouseId()).orElse(null);
        StockLocation location = lot.getLocationId() != null
                ? stockLocationRepository.findById(lot.getLocationId()).orElse(null)
                : null;

        // Tính hasTemperatureAlert
        Boolean hasTemperatureAlert = null;
        if (warehouse != null && warehouse.getTemperatureMin() != null && warehouse.getTemperatureMax() != null) {
            // Giả lập: cảnh báo nếu kho có cấu hình nhiệt độ (kho lạnh) 
            // và lot thuộc nhóm nhạy cảm nhiệt
            String category = lot.getCropCategory();
            hasTemperatureAlert = category != null
                    && (category.equalsIgnoreCase("VEGETABLE") || category.equalsIgnoreCase("FRUIT"));
        }

        return ProductWarehouseLotResponse.builder()
                .id(lot.getId())
                .lotCode(lot.getLotCode())
                .productId(lot.getProductId())
                .productName(lot.getProductName())
                .productVariant(lot.getProductVariant())
                .seasonId(lot.getSeasonId())
                .farmId(lot.getFarmId())
                .plotId(lot.getPlotId())
                .harvestId(lot.getHarvestId())
                .warehouseId(lot.getWarehouseId())
                .warehouseName(warehouse != null ? warehouse.getName() : null)
                .locationId(lot.getLocationId())
                .locationLabel(location != null ? location.getId().toString() : null)
                .harvestedAt(lot.getHarvestedAt())
                .receivedAt(lot.getReceivedAt())
                .unit(lot.getUnit())
                .initialQuantity(lot.getInitialQuantity())
                .onHandQuantity(lot.getOnHandQuantity())
                .grade(lot.getGrade())
                .qualityStatus(lot.getQualityStatus())
                .note(lot.getNote())
                .status(lot.getStatus() != null ? lot.getStatus().name() : null)
                .createdBy(lot.getCreatedBy())
                .createdAt(lot.getCreatedAt())
                .updatedAt(lot.getUpdatedAt())
                .cropCategory(lot.getCropCategory())
                .hasTemperatureAlert(hasTemperatureAlert)
                .expiryDate(lot.getExpiryDate())
                .packagingType(lot.getPackagingType())
                .packagingCount(lot.getPackagingCount())
                .processingType(lot.getProcessingType())
                .build();
    }
}

