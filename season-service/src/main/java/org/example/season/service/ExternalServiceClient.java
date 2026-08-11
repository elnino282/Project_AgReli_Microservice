package org.example.season.service;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.example.season.dto.request.ReceiveHarvestRequest;
import org.example.season.dto.request.SyncLotRequest;
import org.example.season.dto.response.ProductWarehouseLotDto;
import org.example.season.dto.response.HarvestStockContextDto;
import org.springframework.stereotype.Service;
import java.util.List;
import java.util.Arrays;
import java.util.stream.Collectors;

import org.example.season.client.FarmServiceClient;
import org.example.season.client.CropCatalogClient;
import org.example.season.client.IdentityServiceClient;
import org.example.season.client.MonolithServiceClient;
import org.example.season.client.InventoryServiceClient;


@Service
@RequiredArgsConstructor
@Slf4j
public class ExternalServiceClient {

    private final MonolithServiceClient monolithServiceClient;
    private final InventoryServiceClient inventoryServiceClient;
    private final FarmServiceClient farmServiceClient;
    private final CropCatalogClient cropCatalogClient;
    private final IdentityServiceClient identityServiceClient;

    public Boolean existsExpenseBySeasonId(Integer seasonId) {
        return monolithServiceClient.existsExpenseBySeasonId(seasonId);
    }

    public ValidationResultDto validateIncidentSeason(Integer incidentId, Integer seasonId) {
        return monolithServiceClient.validateIncidentSeason(incidentId, seasonId);
    }

    public ValidationResultDto validateExpenseSeason(Integer expenseId, Integer seasonId) {
        return monolithServiceClient.validateExpenseSeason(expenseId, seasonId);
    }

    public ValidationResultDto validateSupplyLot(Integer lotId, Integer itemId, String farmIdsCsv) {
        return inventoryServiceClient.validateSupplyLot(lotId, itemId, farmIdsCsv);
    }

    public ValidationResultDto validateSupplyItem(Integer itemId, String farmIdsCsv) {
        return inventoryServiceClient.validateSupplyItem(itemId, farmIdsCsv);
    }

    public String getSupplyItemName(Integer itemId) {
        return inventoryServiceClient.getSupplyItemName(itemId);
    }

    public List<String> getAvailableSupplyNames(String farmIdsCsv) {
        return inventoryServiceClient.getAvailableSupplyNames(farmIdsCsv);
    }

    public List<org.example.season.client.InventoryServiceClient.SupplyContextDto> getAvailableSupplyDetails(String farmIdsCsv) {
        return inventoryServiceClient.getAvailableSupplyDetails(farmIdsCsv);
    }

    public String getSupplyLotBatchCode(Integer lotId) {
        return inventoryServiceClient.getSupplyLotBatchCode(lotId);
    }

    public PlotInternalDto getPlot(Integer plotId) {
        FarmServiceClient.PlotInternalDto plot = farmServiceClient.getPlot(plotId);
        if (plot == null) return null;
        return PlotInternalDto.builder()
                .id(plot.getId())
                .plotName(plot.getPlotName())
                .plotArea(plot.getPlotArea())
                .farmId(plot.getFarmId())
                .farmName(plot.getFarmName())
                .ownerUserId(plot.getOwnerUserId())
                .farmActive(plot.getFarmActive())
                .build();
    }

    public CropInternalDto getCrop(Integer cropId) {
        return cropCatalogClient.getInternalCrop(cropId);
    }

    public VarietyInternalDto getVariety(Integer varietyId) {
        return cropCatalogClient.getVariety(varietyId);
    }

    public UserInternalDto getUser(Long userId) {
        return identityServiceClient.getUser(userId);
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class PlotInternalDto {
        private Integer id;
        private String plotName;
        private java.math.BigDecimal plotArea;
        private Integer farmId;
        private String farmName;
        private Long ownerUserId;
        private Boolean farmActive;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CropInternalDto {
        private Integer id;
        private String cropName;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class VarietyInternalDto {
        private Integer id;
        private String name;
        private Integer cropId;
    }

    public void createNotification(Long userId, String title, String message, String link) {
        CreateNotificationRequest request = CreateNotificationRequest.builder()
                .userId(userId)
                .title(title)
                .message(message)
                .link(link)
                .build();
        monolithServiceClient.createNotification(request);
    }

    public EmployeePageResponse searchEmployees(String keyword, int page, int size) {
        return identityServiceClient.searchEmployees(page, size, keyword);
    }

    public Boolean validateEmployee(Long userId) {
        return identityServiceClient.validateEmployee(userId);
    }

    public List<UserInternalDto> validateEmployeesBatch(List<Long> userIds) {
        return identityServiceClient.validateEmployeesBatch(userIds);
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class UserInternalDto {
        private Long id;
        private String username;
        private String email;
        private String fullName;
        private String phone;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ValidationResultDto {
        private boolean valid;
        private String errorCode;
        private String errorMessage;
        private Integer resolvedItemId;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CreateNotificationRequest {
        private Long userId;
        private String title;
        private String message;
        private String link;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class EmployeePageResponse {
        private java.util.List<UserInternalDto> items;
        private int page;
        private int size;
        private long totalElements;
        private int totalPages;
    }

    public ProductWarehouseLotDto receiveFromHarvest(Integer harvestId, Long actorUserId, ReceiveHarvestRequest request) {
        return inventoryServiceClient.receiveFromHarvest(harvestId, actorUserId, request);
    }

    public List<ProductWarehouseLotDto> findLotsBySeasonIds(List<Integer> seasonIds) {
        String idsCsv = seasonIds.stream().map(Object::toString).collect(Collectors.joining(","));
        return inventoryServiceClient.findLotsBySeasonIds(idsCsv);
    }

    public ProductWarehouseLotDto findLotByHarvestId(Integer harvestId) {
        return inventoryServiceClient.findLotByHarvestId(harvestId);
    }

    public List<ProductWarehouseLotDto> findLotsByHarvestIds(List<Integer> harvestIds) {
        String idsCsv = harvestIds.stream().map(Object::toString).collect(Collectors.joining(","));
        return inventoryServiceClient.findLotsByHarvestIds(idsCsv);
    }

    public ProductWarehouseLotDto syncLinkedLotFromHarvest(Integer lotId, SyncLotRequest request) {
        return inventoryServiceClient.syncLinkedLotFromHarvest(lotId, request);
    }

    public Boolean existsProductWarehouseLotByHarvestId(Integer harvestId) {
        return inventoryServiceClient.existsProductWarehouseLotByHarvestId(harvestId);
    }

    public HarvestStockContextDto findHarvestStockContext(
            Integer farmId,
            Integer warehouseId,
            String productName,
            String lotCode) {
        return inventoryServiceClient.findHarvestStockContext(farmId, warehouseId, productName, lotCode);
    }

    public List<Integer> getAccessibleFarmIdsForUser(Long userId) {
        return farmServiceClient.getAccessibleFarmIdsForUser(userId);
    }
}


