package org.example.season.client;

import org.example.season.dto.request.ReceiveHarvestRequest;
import org.example.season.dto.request.SyncLotRequest;
import org.example.season.dto.response.ProductWarehouseLotDto;
import org.example.season.dto.response.HarvestStockContextDto;
import org.example.season.service.ExternalServiceClient.ValidationResultDto;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;

import java.util.List;

@FeignClient(name = "inventory-service", url = "${app.inventory-service-url}", fallback = InventoryServiceClientFallback.class)
public interface InventoryServiceClient {

    @PostMapping("/api/v1/inventory/sync-harvest")
    void syncHarvestToInventory(@RequestBody HarvestSyncDto harvestSyncDto);

    @GetMapping("/api/v1/public/lookup/supplies/validate-lot")
    ValidationResultDto validateSupplyLot(@RequestParam("lotId") Integer lotId, @RequestParam(value = "itemId", required = false) Integer itemId, @RequestParam("farmIds") String farmIdsCsv);

    @GetMapping("/api/v1/public/lookup/supplies/validate-item")
    ValidationResultDto validateSupplyItem(@RequestParam("itemId") Integer itemId, @RequestParam("farmIds") String farmIdsCsv);

    @GetMapping("/api/v1/public/lookup/supplies/available-names")
    List<String> getAvailableSupplyNames(@RequestParam("farmIds") String farmIdsCsv);

    @GetMapping("/api/v1/public/lookup/supplies/items/{itemId}/name")
    String getSupplyItemName(@PathVariable("itemId") Integer itemId);

    @GetMapping("/api/v1/public/lookup/supplies/lots/{lotId}/batch-code")
    String getSupplyLotBatchCode(@PathVariable("lotId") Integer lotId);

    @PostMapping("/api/v1/public/lookup/inventory/receive-harvest")
    ProductWarehouseLotDto receiveFromHarvest(@RequestParam("harvestId") Integer harvestId, @RequestParam("actorUserId") Long actorUserId, @RequestBody ReceiveHarvestRequest request);

    @GetMapping("/api/v1/public/lookup/inventory/lots/by-seasons")
    List<ProductWarehouseLotDto> findLotsBySeasonIds(@RequestParam("seasonIds") String seasonIdsCsv);

    @GetMapping("/api/v1/public/lookup/inventory/lots/by-harvest/{harvestId}")
    ProductWarehouseLotDto findLotByHarvestId(@PathVariable("harvestId") Integer harvestId);

    @GetMapping("/api/v1/public/lookup/inventory/lots/by-harvests")
    List<ProductWarehouseLotDto> findLotsByHarvestIds(@RequestParam("harvestIds") String harvestIdsCsv);

    @PostMapping("/api/v1/public/lookup/inventory/lots/{lotId}/sync")
    ProductWarehouseLotDto syncLinkedLotFromHarvest(@PathVariable("lotId") Integer lotId, @RequestBody SyncLotRequest request);

    @GetMapping("/api/v1/public/lookup/inventory/exists-by-harvest/{harvestId}")
    Boolean existsProductWarehouseLotByHarvestId(@PathVariable("harvestId") Integer harvestId);

    @GetMapping("/api/v1/public/lookup/inventory/stock-context")
    HarvestStockContextDto findHarvestStockContext(@RequestParam("farmId") Integer farmId, @RequestParam("warehouseId") Integer warehouseId, @RequestParam("productName") String productName, @RequestParam("lotCode") String lotCode);

    // DTO for syncing
    @lombok.Data
    @lombok.NoArgsConstructor
    class HarvestSyncDto {
        private Integer harvestId;
        private Integer seasonId;
        private java.math.BigDecimal netDryWeight;
        
        public HarvestSyncDto(Integer harvestId, Integer seasonId, java.math.BigDecimal netDryWeight) {
            this.harvestId = harvestId;
            this.seasonId = seasonId;
            this.netDryWeight = netDryWeight;
        }
        
        // getters and setters omitted for brevity
    }
}
