package org.example.season.client;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

@Component
@Slf4j
public class InventoryServiceClientFallback implements InventoryServiceClient {

    @Override
    public void syncHarvestToInventory(InventoryServiceClient.HarvestSyncDto harvestSyncDto) {
        log.error("Fallback triggered: Failed to sync harvest {} to inventory-service", harvestSyncDto != null ? harvestSyncDto.getHarvestId() : "null");
    }

    @Override
    public org.example.season.service.ExternalServiceClient.ValidationResultDto validateSupplyLot(Integer lotId, Integer itemId, String farmIdsCsv) {
        log.error("Fallback triggered: Failed to validate supply lot {}", lotId);
        return org.example.season.service.ExternalServiceClient.ValidationResultDto.builder().valid(false).errorCode("INTERNAL_SERVER_ERROR").build();
    }

    @Override
    public org.example.season.service.ExternalServiceClient.ValidationResultDto validateSupplyItem(Integer itemId, String farmIdsCsv) {
        log.error("Fallback triggered: Failed to validate supply item {}", itemId);
        return org.example.season.service.ExternalServiceClient.ValidationResultDto.builder().valid(false).errorCode("INTERNAL_SERVER_ERROR").build();
    }

    @Override
    public String getSupplyItemName(Integer itemId) {
        log.error("Fallback triggered: Failed to get supply item name {}", itemId);
        return null;
    }

    @Override
    public java.util.List<String> getAvailableSupplyNames(String farmIdsCsv) {
        log.error("Fallback triggered: Failed to get available supply names for farms {}", farmIdsCsv);
        return java.util.Collections.emptyList();
    }

    @Override
    public java.util.List<InventoryServiceClient.SupplyContextDto> getAvailableSupplyDetails(String farmIdsCsv) {
        log.error("Fallback triggered: Failed to get available supply details for farms {}", farmIdsCsv);
        return java.util.Collections.emptyList();
    }

    @Override
    public String getSupplyLotBatchCode(Integer lotId) {
        log.error("Fallback triggered: Failed to get supply lot batch code {}", lotId);
        return null;
    }

    @Override
    public org.example.season.dto.response.ProductWarehouseLotDto receiveFromHarvest(Integer harvestId, Long actorUserId, org.example.season.dto.request.ReceiveHarvestRequest request) {
        log.error("Fallback triggered: Failed to receive from harvest {}", harvestId);
        throw new RuntimeException("Inventory service connection failed");
    }

    @Override
    public java.util.List<org.example.season.dto.response.ProductWarehouseLotDto> findLotsBySeasonIds(String seasonIdsCsv) {
        log.error("Fallback triggered: Failed to find lots by seasons");
        return java.util.Collections.emptyList();
    }

    @Override
    public org.example.season.dto.response.ProductWarehouseLotDto findLotByHarvestId(Integer harvestId) {
        log.error("Fallback triggered: Failed to find lot by harvest id {}", harvestId);
        return null;
    }

    @Override
    public java.util.List<org.example.season.dto.response.ProductWarehouseLotDto> findLotsByHarvestIds(String harvestIdsCsv) {
        log.error("Fallback triggered: Failed to find lots by harvest ids");
        return java.util.Collections.emptyList();
    }

    @Override
    public org.example.season.dto.response.ProductWarehouseLotDto syncLinkedLotFromHarvest(Integer lotId, org.example.season.dto.request.SyncLotRequest request) {
        log.error("Fallback triggered: Failed to sync lot {}", lotId);
        throw new RuntimeException("Syncing lot failed");
    }

    @Override
    public Boolean existsProductWarehouseLotByHarvestId(Integer harvestId) {
        log.error("Fallback triggered: Failed to check if lot exists for harvest {}", harvestId);
        throw new org.example.season.exception.AppException(
                org.example.season.exception.ErrorCode.DOWNSTREAM_GUARD_UNAVAILABLE);
    }

    @Override
    public org.example.season.dto.response.HarvestStockContextDto findHarvestStockContext(Integer farmId, Integer warehouseId, String productName, String lotCode) {
        log.error("Fallback triggered: Failed to find harvest stock context");
        return null;
    }
}
