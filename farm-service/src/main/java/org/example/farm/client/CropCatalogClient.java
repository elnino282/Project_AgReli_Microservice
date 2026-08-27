package org.example.farm.client;

import lombok.*;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;

@FeignClient(
        name = "crop-catalog-service",
        contextId = "certificationCropCatalogClient",
        url = "${app.crop-catalog-service-url:http://localhost:8082}",
        fallback = CropCatalogClientFallback.class)
public interface CropCatalogClient {
    @GetMapping("/api/v1/internal/crops/{id}")
    CropDto getCrop(@PathVariable("id") Integer id);

    @GetMapping("/api/v1/internal/varieties/{id}")
    VarietyDto getVariety(@PathVariable("id") Integer id);

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    class CropDto {
        private Integer id;
        private String cropName;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    class VarietyDto {
        private Integer id;
        private String name;
        private Integer cropId;
    }
}
