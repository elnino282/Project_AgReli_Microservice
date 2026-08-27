package org.example.farm.client;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

@Component
@Slf4j
public class CropCatalogClientFallback implements CropCatalogClient {
    @Override
    public CropDto getCrop(Integer id) {
        log.error("Fallback triggered: Failed to get crop {} via crop-catalog-service", id);
        throw new IllegalStateException("crop-catalog-service is unavailable; certification scope cannot be verified");
    }

    @Override
    public VarietyDto getVariety(Integer id) {
        log.error("Fallback triggered: Failed to get variety {} via crop-catalog-service", id);
        throw new IllegalStateException("crop-catalog-service is unavailable; certification scope cannot be verified");
    }
}
