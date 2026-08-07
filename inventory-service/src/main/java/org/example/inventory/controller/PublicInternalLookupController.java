package org.example.inventory.controller;

import java.util.List;
import lombok.RequiredArgsConstructor;
import org.example.inventory.dto.request.ReceiveHarvestRequest;
import org.example.inventory.dto.request.SyncLotRequest;
import org.example.inventory.dto.response.HarvestStockContextDto;
import org.example.inventory.dto.response.ProductWarehouseLotDto;
import org.example.inventory.dto.response.ValidationResultDto;
import org.example.inventory.service.ProductWarehouseBridgeService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/public/lookup")
@RequiredArgsConstructor
public class PublicInternalLookupController {

    private final ProductWarehouseBridgeService productWarehouseBridgeService;

    @GetMapping("/supplies/validate-lot")
    public ValidationResultDto validateSupplyLot(
            @RequestParam Integer lotId,
            @RequestParam(required = false) Integer itemId,
            @RequestParam List<Integer> farmIds) {
        return productWarehouseBridgeService.validateSupplyLot(lotId, itemId, farmIds);
    }

    @GetMapping("/supplies/validate-item")
    public ValidationResultDto validateSupplyItem(
            @RequestParam Integer itemId,
            @RequestParam List<Integer> farmIds) {
        return productWarehouseBridgeService.validateSupplyItem(itemId, farmIds);
    }

    @GetMapping("/supplies/items/{id}/name")
    public String getSupplyItemName(@PathVariable Integer id) {
        return productWarehouseBridgeService.getSupplyItemName(id);
    }

    @GetMapping("/supplies/available-names")
    public List<String> getAvailableSupplyNames(@RequestParam List<Integer> farmIds) {
        return productWarehouseBridgeService.getAvailableSupplyNames(farmIds);
    }

    @GetMapping("/supplies/lots/{id}/batch-code")
    public String getSupplyLotBatchCode(@PathVariable Integer id) {
        return productWarehouseBridgeService.getSupplyLotBatchCode(id);
    }

    @PostMapping("/inventory/receive-harvest")
    public ProductWarehouseLotDto receiveFromHarvest(
            @RequestParam Integer harvestId,
            @RequestParam Long actorUserId,
            @RequestBody ReceiveHarvestRequest request) {
        return productWarehouseBridgeService.receiveFromHarvest(harvestId, actorUserId, request);
    }

    @GetMapping("/inventory/lots/by-seasons")
    public List<ProductWarehouseLotDto> findLotsBySeasonIds(@RequestParam List<Integer> seasonIds) {
        return productWarehouseBridgeService.findLotsBySeasonIds(seasonIds);
    }

    @GetMapping("/inventory/lots/by-harvest/{harvestId}")
    public ProductWarehouseLotDto findLotByHarvestId(@PathVariable Integer harvestId) {
        return productWarehouseBridgeService.findLotByHarvestId(harvestId);
    }

    @GetMapping("/inventory/lots/by-harvests")
    public List<ProductWarehouseLotDto> findLotsByHarvestIds(@RequestParam List<Integer> harvestIds) {
        return productWarehouseBridgeService.findLotsByHarvestIds(harvestIds);
    }

    @PostMapping("/inventory/lots/{lotId}/sync")
    public ProductWarehouseLotDto syncLinkedLotFromHarvest(
            @PathVariable Integer lotId,
            @RequestBody SyncLotRequest request) {
        return productWarehouseBridgeService.syncLinkedLotFromHarvest(lotId, request);
    }

    @GetMapping("/inventory/exists-by-harvest/{harvestId}")
    public Boolean existsProductWarehouseLotByHarvestId(@PathVariable Integer harvestId) {
        return productWarehouseBridgeService.existsProductWarehouseLotByHarvestId(harvestId);
    }

    @GetMapping("/inventory/stock-context")
    public HarvestStockContextDto findHarvestStockContext(
            @RequestParam Integer farmId,
            @RequestParam Integer warehouseId,
            @RequestParam String productName,
            @RequestParam String lotCode) {
        return productWarehouseBridgeService.findHarvestStockContext(farmId, warehouseId, productName, lotCode);
    }
}
