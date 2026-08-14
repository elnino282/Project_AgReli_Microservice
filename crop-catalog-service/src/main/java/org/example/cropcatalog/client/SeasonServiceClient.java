package org.example.cropcatalog.client;

import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;

@FeignClient(name = "season-service", url = "${app.season-service-url:http://localhost:8085}", fallback = SeasonServiceClientFallback.class)
public interface SeasonServiceClient {

    @GetMapping("/api/v1/internal/seasons/exists-by-variety/{varietyId}")
    Boolean existsByVariety(@PathVariable("varietyId") Integer varietyId);
}
