package org.example.inventory.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.example.inventory.config.CurrentUserService;
import org.example.inventory.dto.common.PageResponse;
import org.example.inventory.dto.request.AdjustProductWarehouseLotRequest;
import org.example.inventory.dto.request.CreateProductWarehouseLotRequest;
import org.example.inventory.dto.request.StockOutProductWarehouseLotRequest;
import org.example.inventory.dto.request.UpdateProductWarehouseLotRequest;
import org.example.inventory.dto.response.ProductWarehouseLotResponse;
import org.example.inventory.dto.response.ProductWarehouseOverviewResponse;
import org.example.inventory.dto.response.ProductWarehouseTraceabilityResponse;
import org.example.inventory.dto.response.ProductWarehouseTransactionResponse;
import org.example.inventory.entity.ProductWarehouseLot;
import org.example.inventory.entity.ProductWarehouseTransaction;
import org.example.inventory.entity.StockLocation;
import org.example.inventory.entity.Warehouse;
import org.example.inventory.enums.ProductWarehouseLotStatus;
import org.example.inventory.enums.ProductWarehouseTransactionType;
import org.example.inventory.event.DomainEventPublisher;
import org.example.inventory.event.ProductWarehouseLotChangedEvent;
import org.example.inventory.event.StockAdjustedEvent;
import org.example.inventory.exception.AppException;
import org.example.inventory.exception.ErrorCode;
import org.example.inventory.repository.ProductWarehouseLotRepository;
import org.example.inventory.repository.ProductWarehouseTransactionRepository;
import org.example.inventory.repository.StockLocationRepository;
import org.example.inventory.repository.WarehouseRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
@Transactional
public class ProductWarehousePublicService {

    static final int DEFAULT_PAGE_SIZE = 20;

    ProductWarehouseLotRepository productWarehouseLotRepository;
    ProductWarehouseTransactionRepository productWarehouseTransactionRepository;
    WarehouseRepository warehouseRepository;
    StockLocationRepository stockLocationRepository;
    CurrentUserService currentUserService;
    ObjectMapper objectMapper;
    DomainEventPublisher domainEventPublisher;

    @Transactional(readOnly = true)
    public ProductWarehouseOverviewResponse getOverview() {
        long totalLots = productWarehouseLotRepository.count();
        long inStockLots = productWarehouseLotRepository.countByStatus(ProductWarehouseLotStatus.IN_STOCK);
        long depletedLots = productWarehouseLotRepository.countByStatus(ProductWarehouseLotStatus.DEPLETED);
        BigDecimal totalOnHand = productWarehouseLotRepository.sumOnHandQuantity();

        return ProductWarehouseOverviewResponse.builder()
                .totalLots(totalLots)
                .inStockLots(inStockLots)
                .depletedLots(depletedLots)
                .totalOnHandQuantity(totalOnHand != null ? totalOnHand : BigDecimal.ZERO)
                .build();
    }

    @Transactional(readOnly = true)
    public PageResponse<ProductWarehouseLotResponse> listLots(
            Integer warehouseId,
            Integer locationId,
            Integer seasonId,
            Integer farmId,
            Integer plotId,
            LocalDate harvestedFrom,
            LocalDate harvestedTo,
            String status,
            String q,
            int page,
            int size) {
        Pageable pageable = PageRequest.of(
                Math.max(page, 0),
                normalizePageSize(size),
                Sort.by("receivedAt").descending());
        Page<ProductWarehouseLot> lotsPage = productWarehouseLotRepository.searchLotsPublic(
                warehouseId,
                locationId,
                seasonId,
                farmId,
                plotId,
                harvestedFrom,
                harvestedTo,
                parseLotStatus(status),
                normalizeBlankToNull(q),
                pageable);
        List<ProductWarehouseLotResponse> items = lotsPage.getContent().stream()
                .map(this::toLotResponse)
                .toList();
        return PageResponse.of(lotsPage, items);
    }

    @Transactional(readOnly = true)
    public ProductWarehouseLotResponse getLotDetail(Integer id) {
        return toLotResponse(getLot(id));
    }

    public ProductWarehouseLotResponse createLot(CreateProductWarehouseLotRequest request) {
        Warehouse warehouse = getWarehouse(request.getWarehouseId());
        if (!warehouse.getFarmId().equals(request.getFarmId())) {
            throw new AppException(ErrorCode.BAD_REQUEST);
        }
        StockLocation location = resolveLocation(request.getLocationId(), warehouse.getId());
        if (request.getHarvestId() != null && productWarehouseLotRepository.existsByHarvestId(request.getHarvestId())) {
            throw new AppException(ErrorCode.DUPLICATE_RESOURCE);
        }

        String lotCode = resolveLotCode(request.getLotCode(), request.getHarvestId());
        ensureUniqueLotCode(lotCode);
        BigDecimal quantity = normalizePositiveQuantity(request.getInitialQuantity());
        LocalDateTime receivedAt = request.getReceivedAt() != null ? request.getReceivedAt() : LocalDateTime.now();
        Long actorUserId = resolveCurrentUserId();

        ProductWarehouseLot lot = ProductWarehouseLot.builder()
                .lotCode(lotCode)
                .productId(request.getProductId())
                .productName(normalizeRequired(request.getProductName()))
                .productVariant(normalizeBlankToNull(request.getProductVariant()))
                .seasonId(request.getSeasonId())
                .farmId(request.getFarmId())
                .plotId(request.getPlotId())
                .harvestId(request.getHarvestId())
                .warehouseId(warehouse.getId())
                .locationId(location != null ? location.getId() : null)
                .harvestedAt(request.getHarvestedAt())
                .receivedAt(receivedAt)
                .unit(normalizeRequired(request.getUnit()))
                .initialQuantity(quantity)
                .onHandQuantity(quantity)
                .grade(normalizeBlankToNull(request.getGrade()))
                .qualityStatus(normalizeBlankToNull(request.getQualityStatus()))
                .traceabilityData(resolveTraceabilityData(request, actorUserId, receivedAt))
                .note(normalizeBlankToNull(request.getNote()))
                .status(parseLotStatusOrDefault(request.getStatus(), ProductWarehouseLotStatus.IN_STOCK))
                .createdBy(actorUserId)
                .build();
        ProductWarehouseLot saved = productWarehouseLotRepository.save(lot);

        createTransaction(
                saved,
                request.getHarvestId() != null
                        ? ProductWarehouseTransactionType.RECEIPT_FROM_HARVEST
                        : ProductWarehouseTransactionType.RETURN,
                quantity,
                request.getHarvestId() != null ? "HARVEST" : "MANUAL_CREATE",
                request.getHarvestId() != null ? String.valueOf(request.getHarvestId()) : String.valueOf(saved.getId()),
                request.getNote(),
                actorUserId);
        publishLotChanged(saved, "CREATED");
        return toLotResponse(saved);
    }

    public ProductWarehouseLotResponse updateLot(Integer id, UpdateProductWarehouseLotRequest request) {
        ProductWarehouseLot lot = getLotForUpdate(id);
        if (request.getProductName() != null && !request.getProductName().isBlank()) {
            lot.setProductName(request.getProductName().trim());
        }
        if (request.getProductVariant() != null) {
            lot.setProductVariant(normalizeBlankToNull(request.getProductVariant()));
        }
        if (request.getLocationId() != null) {
            StockLocation location = resolveLocation(request.getLocationId(), lot.getWarehouseId());
            lot.setLocationId(location != null ? location.getId() : null);
        }
        if (request.getGrade() != null) {
            lot.setGrade(normalizeBlankToNull(request.getGrade()));
        }
        if (request.getQualityStatus() != null) {
            lot.setQualityStatus(normalizeBlankToNull(request.getQualityStatus()));
        }
        if (request.getTraceabilityData() != null) {
            lot.setTraceabilityData(normalizeBlankToNull(request.getTraceabilityData()));
        }
        if (request.getNote() != null) {
            lot.setNote(normalizeBlankToNull(request.getNote()));
        }
        if (request.getStatus() != null) {
            lot.setStatus(parseLotStatusOrDefault(request.getStatus(), lot.getStatus()));
        }
        ProductWarehouseLot saved = productWarehouseLotRepository.save(lot);
        publishLotChanged(saved, "UPDATED");
        return toLotResponse(saved);
    }

    public void archiveLot(Integer id) {
        ProductWarehouseLot lot = getLotForUpdate(id);
        lot.setStatus(ProductWarehouseLotStatus.ARCHIVED);
        ProductWarehouseLot saved = productWarehouseLotRepository.save(lot);
        publishLotChanged(saved, "ARCHIVED");
    }

    public ProductWarehouseLotResponse adjustLot(Integer id, AdjustProductWarehouseLotRequest request) {
        ProductWarehouseLot lot = getLotForUpdate(id);
        BigDecimal delta = request.getQuantityDelta();
        if (delta == null || delta.compareTo(BigDecimal.ZERO) == 0) {
            throw new AppException(ErrorCode.BAD_REQUEST);
        }
        if (request.getNote() == null || request.getNote().isBlank()) {
            throw new AppException(ErrorCode.BAD_REQUEST);
        }

        BigDecimal current = lot.getOnHandQuantity() != null ? lot.getOnHandQuantity() : BigDecimal.ZERO;
        BigDecimal newOnHand = current.add(delta);
        if (newOnHand.compareTo(BigDecimal.ZERO) < 0) {
            throw new AppException(ErrorCode.BAD_REQUEST);
        }

        lot.setOnHandQuantity(newOnHand);
        applyAutoStatus(lot);
        ProductWarehouseLot saved = productWarehouseLotRepository.save(lot);
        Long actorUserId = resolveCurrentUserId();
        createTransaction(
                saved,
                ProductWarehouseTransactionType.ADJUSTMENT,
                delta,
                "LOT",
                String.valueOf(saved.getId()),
                request.getNote(),
                actorUserId);
        publishStockAdjusted(saved, delta, request.getNote());
        return toLotResponse(saved);
    }

    public ProductWarehouseLotResponse stockOutLot(Integer id, StockOutProductWarehouseLotRequest request) {
        ProductWarehouseLot lot = getLotForUpdate(id);
        BigDecimal quantity = normalizePositiveQuantity(request.getQuantity());
        BigDecimal current = lot.getOnHandQuantity() != null ? lot.getOnHandQuantity() : BigDecimal.ZERO;
        if (current.compareTo(quantity) < 0) {
            throw new AppException(ErrorCode.BAD_REQUEST);
        }

        lot.setOnHandQuantity(current.subtract(quantity));
        applyAutoStatus(lot);
        ProductWarehouseLot saved = productWarehouseLotRepository.save(lot);
        Long actorUserId = resolveCurrentUserId();
        createTransaction(
                saved,
                ProductWarehouseTransactionType.STOCK_OUT,
                quantity,
                "LOT",
                String.valueOf(saved.getId()),
                request.getNote(),
                actorUserId);
        publishStockAdjusted(saved, quantity.negate(), request.getNote());
        return toLotResponse(saved);
    }

    @Transactional
    public ProductWarehouseLotResponse disposeSubStandardLot(Integer id, org.example.inventory.dto.request.SubStandardDispositionRequest request) {
        ProductWarehouseLot lot = getLotForUpdate(id);
        
        // Validate must be SUBSTANDARD
        if (!"SUBSTANDARD".equalsIgnoreCase(lot.getQualityStatus())) {
            throw new IllegalStateException("Chỉ được xuất kho thanh lý đối với lô hàng Không đạt chuẩn (SUBSTANDARD).");
        }

        BigDecimal quantity = normalizePositiveQuantity(request.getQuantity());
        BigDecimal current = lot.getOnHandQuantity() != null ? lot.getOnHandQuantity() : BigDecimal.ZERO;
        if (current.compareTo(quantity) < 0) {
            throw new AppException(ErrorCode.BAD_REQUEST); // Không đủ tồn kho
        }

        lot.setOnHandQuantity(current.subtract(quantity));
        applyAutoStatus(lot);
        ProductWarehouseLot saved = productWarehouseLotRepository.save(lot);

        Long actorUserId = resolveCurrentUserId();

        // Determine exact transaction type based on disposition
        ProductWarehouseTransactionType txType = ProductWarehouseTransactionType.STOCK_OUT_SUBSTANDARD;
        if (request.getDisposition() != null) {
            switch (request.getDisposition().toUpperCase()) {
                case "SELL_LIVESTOCK_FEED":
                    txType = ProductWarehouseTransactionType.SOLD_LIVESTOCK_FEED;
                    break;
                case "COMPOSTING":
                    txType = ProductWarehouseTransactionType.COMPOSTED;
                    break;
                case "DISCARDED":
                    txType = ProductWarehouseTransactionType.DISCARDED;
                    break;
                case "SELL_DISCOUNT":
                    txType = ProductWarehouseTransactionType.STOCK_OUT_SUBSTANDARD; // Hoặc thêm SOLD_DISCOUNT
                    break;
                default:
                    txType = ProductWarehouseTransactionType.STOCK_OUT_SUBSTANDARD;
            }
        }

        String note = request.getNote() != null ? request.getNote() : "";
        if (request.getBuyerName() != null && !request.getBuyerName().isBlank()) {
            note = "Bán cho: " + request.getBuyerName() + (request.getBuyerContact() != null ? " (" + request.getBuyerContact() + ")" : "") + ". " + note;
        }

        createTransaction(
                saved,
                txType,
                quantity,
                "DISPOSITION",
                request.getDisposition(),
                note,
                actorUserId);

        publishStockAdjusted(saved, quantity.negate(), "Xuất kho hàng lỗi: " + request.getDisposition());
        return toLotResponse(saved);
    }

    @Transactional(readOnly = true)
    public PageResponse<ProductWarehouseTransactionResponse> listTransactions(
            Integer lotId,
            String type,
            LocalDate from,
            LocalDate to,
            int page,
            int size) {
        if (lotId != null) {
            getLot(lotId);
        }
        Pageable pageable = PageRequest.of(
                Math.max(page, 0),
                normalizePageSize(size),
                Sort.by("createdAt").descending());
        Page<ProductWarehouseTransaction> transactionPage = productWarehouseTransactionRepository.searchTransactions(
                lotId,
                parseTransactionType(type),
                from != null ? from.atStartOfDay() : null,
                to != null ? to.atTime(23, 59, 59) : null,
                pageable);
        List<ProductWarehouseTransactionResponse> items = transactionPage.getContent().stream()
                .map(this::toTransactionResponse)
                .toList();
        return PageResponse.of(transactionPage, items);
    }

    @Transactional(readOnly = true)
    public ProductWarehouseTraceabilityResponse getTraceability(Integer lotId) {
        ProductWarehouseLot lot = getLot(lotId);
        List<ProductWarehouseTransactionResponse> transactions = productWarehouseTransactionRepository
                .findAllByLotIdOrderByCreatedAtDesc(lot.getId())
                .stream()
                .map(this::toTransactionResponse)
                .toList();

        return ProductWarehouseTraceabilityResponse.builder()
                .lotId(lot.getId())
                .lotCode(lot.getLotCode())
                .productName(lot.getProductName())
                .productVariant(lot.getProductVariant())
                .seasonId(lot.getSeasonId())
                .seasonName(traceText(lot, "seasonName"))
                .farmId(lot.getFarmId())
                .farmName(traceText(lot, "farmName"))
                .plotId(lot.getPlotId())
                .plotName(traceText(lot, "plotName"))
                .harvestId(lot.getHarvestId())
                .harvestedAt(lot.getHarvestedAt())
                .receivedAt(lot.getReceivedAt())
                .initialQuantity(lot.getInitialQuantity())
                .onHandQuantity(lot.getOnHandQuantity())
                .unit(lot.getUnit())
                .recordedBy(lot.getCreatedBy())
                .traceabilityData(lot.getTraceabilityData())
                .transactions(transactions)
                .build();
    }

    private ProductWarehouseLot getLot(Integer id) {
        return productWarehouseLotRepository.findById(id)
                .orElseThrow(() -> new AppException(ErrorCode.RESOURCE_NOT_FOUND));
    }

    private ProductWarehouseLot getLotForUpdate(Integer id) {
        return productWarehouseLotRepository.findByIdForUpdate(id)
                .orElseThrow(() -> new AppException(ErrorCode.RESOURCE_NOT_FOUND));
    }

    private Warehouse getWarehouse(Integer id) {
        return warehouseRepository.findById(id)
                .orElseThrow(() -> new AppException(ErrorCode.RESOURCE_NOT_FOUND));
    }

    private StockLocation resolveLocation(Integer locationId, Integer warehouseId) {
        if (locationId == null) {
            return null;
        }
        StockLocation location = stockLocationRepository.findById(locationId)
                .orElseThrow(() -> new AppException(ErrorCode.RESOURCE_NOT_FOUND));
        if (!warehouseId.equals(location.getWarehouseId())) {
            throw new AppException(ErrorCode.BAD_REQUEST);
        }
        return location;
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

    private ProductWarehouseLotResponse toLotResponse(ProductWarehouseLot lot) {
        Warehouse warehouse = warehouseRepository.findById(lot.getWarehouseId()).orElse(null);
        StockLocation location = lot.getLocationId() != null
                ? stockLocationRepository.findById(lot.getLocationId()).orElse(null)
                : null;

        // Tính hasTemperatureAlert
        Boolean hasTemperatureAlert = null;
        if (warehouse != null && warehouse.getTemperatureMin() != null && warehouse.getTemperatureMax() != null) {
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
                .seasonName(traceText(lot, "seasonName"))
                .farmId(lot.getFarmId())
                .farmName(traceText(lot, "farmName"))
                .plotId(lot.getPlotId())
                .plotName(traceText(lot, "plotName"))
                .harvestId(lot.getHarvestId())
                .warehouseId(lot.getWarehouseId())
                .warehouseName(warehouse != null ? warehouse.getName() : null)
                .locationId(lot.getLocationId())
                .locationLabel(location != null ? buildLocationLabel(location) : null)
                .harvestedAt(lot.getHarvestedAt())
                .receivedAt(lot.getReceivedAt())
                .unit(lot.getUnit())
                .initialQuantity(lot.getInitialQuantity())
                .onHandQuantity(lot.getOnHandQuantity())
                .grade(lot.getGrade())
                .qualityStatus(lot.getQualityStatus())
                .traceabilityData(lot.getTraceabilityData())
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

    private ProductWarehouseTransactionResponse toTransactionResponse(ProductWarehouseTransaction transaction) {
        ProductWarehouseLot lot = productWarehouseLotRepository.findById(transaction.getLotId()).orElse(null);
        return ProductWarehouseTransactionResponse.builder()
                .id(transaction.getId())
                .lotId(transaction.getLotId())
                .lotCode(lot != null ? lot.getLotCode() : null)
                .transactionType(transaction.getTransactionType() != null
                        ? transaction.getTransactionType().name()
                        : null)
                .quantity(transaction.getQuantity())
                .unit(transaction.getUnit())
                .resultingOnHand(transaction.getResultingOnHand())
                .referenceType(transaction.getReferenceType())
                .referenceId(transaction.getReferenceId())
                .note(transaction.getNote())
                .createdBy(transaction.getCreatedBy())
                .createdAt(transaction.getCreatedAt())
                .build();
    }

    private void ensureUniqueLotCode(String lotCode) {
        if (productWarehouseLotRepository.findByLotCode(lotCode).isPresent()) {
            throw new AppException(ErrorCode.DUPLICATE_RESOURCE);
        }
    }

    private String resolveLotCode(String requestedLotCode, Integer harvestId) {
        if (requestedLotCode != null && !requestedLotCode.isBlank()) {
            return requestedLotCode.trim();
        }
        if (harvestId != null) {
            return "PH-" + harvestId + "-" + LocalDate.now().format(DateTimeFormatter.BASIC_ISO_DATE);
        }
        return "PWL-" + LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMddHHmmss"));
    }

    private String resolveTraceabilityData(
            CreateProductWarehouseLotRequest request,
            Long actorUserId,
            LocalDateTime receivedAt) {
        if (request.getTraceabilityData() != null && !request.getTraceabilityData().isBlank()) {
            return request.getTraceabilityData();
        }
        Map<String, Object> trace = new LinkedHashMap<>();
        trace.put("source", "MANUAL");
        trace.put("farmId", request.getFarmId());
        trace.put("plotId", request.getPlotId());
        trace.put("seasonId", request.getSeasonId());
        trace.put("harvestId", request.getHarvestId());
        trace.put("harvestedAt", request.getHarvestedAt());
        trace.put("receivedAt", receivedAt);
        trace.put("recordedBy", actorUserId);
        try {
            return objectMapper.writeValueAsString(trace);
        } catch (JsonProcessingException e) {
            return "{}";
        }
    }

    private String traceText(ProductWarehouseLot lot, String field) {
        if (lot.getTraceabilityData() == null || lot.getTraceabilityData().isBlank()) {
            return null;
        }
        try {
            JsonNode value = objectMapper.readTree(lot.getTraceabilityData()).get(field);
            return value != null && !value.isNull() ? value.asText() : null;
        } catch (Exception ignored) {
            return null;
        }
    }

    private BigDecimal normalizePositiveQuantity(BigDecimal quantity) {
        if (quantity == null || quantity.compareTo(BigDecimal.ZERO) <= 0) {
            throw new AppException(ErrorCode.BAD_REQUEST);
        }
        return quantity;
    }

    private String normalizeRequired(String value) {
        String normalized = normalizeBlankToNull(value);
        if (normalized == null) {
            throw new AppException(ErrorCode.BAD_REQUEST);
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

    private ProductWarehouseLotStatus parseLotStatus(String status) {
        if (status == null || status.isBlank()) {
            return null;
        }
        try {
            return ProductWarehouseLotStatus.fromCode(status);
        } catch (IllegalArgumentException ex) {
            throw new AppException(ErrorCode.BAD_REQUEST);
        }
    }

    private ProductWarehouseLotStatus parseLotStatusOrDefault(
            String status,
            ProductWarehouseLotStatus defaultStatus) {
        ProductWarehouseLotStatus parsed = parseLotStatus(status);
        return parsed != null ? parsed : defaultStatus;
    }

    private ProductWarehouseTransactionType parseTransactionType(String type) {
        if (type == null || type.isBlank()) {
            return null;
        }
        try {
            return ProductWarehouseTransactionType.fromCode(type);
        } catch (IllegalArgumentException ex) {
            throw new AppException(ErrorCode.BAD_REQUEST);
        }
    }

    private int normalizePageSize(int requestedSize) {
        if (requestedSize <= 0) {
            return DEFAULT_PAGE_SIZE;
        }
        return Math.min(requestedSize, 100);
    }

    private void applyAutoStatus(ProductWarehouseLot lot) {
        if (lot.getStatus() == ProductWarehouseLotStatus.ARCHIVED || lot.getStatus() == ProductWarehouseLotStatus.HOLD) {
            return;
        }
        BigDecimal onHand = lot.getOnHandQuantity() != null ? lot.getOnHandQuantity() : BigDecimal.ZERO;
        lot.setStatus(onHand.compareTo(BigDecimal.ZERO) <= 0
                ? ProductWarehouseLotStatus.DEPLETED
                : ProductWarehouseLotStatus.IN_STOCK);
    }

    private void publishStockAdjusted(ProductWarehouseLot lot, BigDecimal delta, String reason) {
        BigDecimal previousQuantity = lot.getOnHandQuantity().subtract(delta);
        BigDecimal newQuantity = lot.getOnHandQuantity();
        Long actorUserId = resolveCurrentUserId();
        domainEventPublisher.publish(new StockAdjustedEvent(
                "ProductWarehouseLot",
                String.valueOf(lot.getId()),
                "inventory-service",
                lot.getId(),
                lot.getLotCode(),
                lot.getFarmId(),
                previousQuantity,
                newQuantity,
                delta,
                lot.getUnit(),
                reason,
                actorUserId
        ));
    }

    private void publishLotChanged(ProductWarehouseLot lot, String action) {
        domainEventPublisher.publish(new ProductWarehouseLotChangedEvent(
                "ProductWarehouseLot",
                String.valueOf(lot.getId()),
                "inventory-service",
                lot.getId(),
                lot.getLotCode(),
                lot.getFarmId(),
                lot.getWarehouseId(),
                lot.getOnHandQuantity(),
                lot.getStatus() != null ? lot.getStatus().name() : null,
                action
        ));
    }

    private Long resolveCurrentUserId() {
        try {
            return currentUserService.getCurrentUserId();
        } catch (Exception ignored) {
            return null;
        }
    }

    private String buildLocationLabel(StockLocation location) {
        StringBuilder label = new StringBuilder();
        appendLabelPart(label, location.getZone());
        appendLabelPart(label, location.getAisle());
        appendLabelPart(label, location.getShelf());
        appendLabelPart(label, location.getBin());
        return label.length() > 0 ? label.toString() : "Location " + location.getId();
    }

    private void appendLabelPart(StringBuilder label, String value) {
        if (value == null || value.isBlank()) {
            return;
        }
        if (label.length() > 0) {
            label.append("-");
        }
        label.append(value.trim());
    }
}
