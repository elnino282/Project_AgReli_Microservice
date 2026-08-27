package org.example.sustainability.controller;

import jakarta.validation.Valid;
import java.util.List;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.example.sustainability.dto.common.ApiResponse;
import org.example.sustainability.dto.request.CreateSoilTestRequest;
import org.example.sustainability.dto.response.SoilTestResponse;
import org.example.sustainability.service.SoilTestService;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
@PreAuthorize("hasRole('FARMER')")
public class SoilTestController {

    SoilTestService soilTestService;

    @PostMapping("/seasons/{seasonId}/soil-tests")
    public ApiResponse<SoilTestResponse> create(
            @PathVariable Integer seasonId,
            @Valid @RequestBody CreateSoilTestRequest request
    ) {
        return ApiResponse.success(soilTestService.create(seasonId, request));
    }

    @GetMapping("/seasons/{seasonId}/soil-tests")
    public ApiResponse<List<SoilTestResponse>> list(
            @PathVariable Integer seasonId,
            @RequestParam(required = false) Integer plotId
    ) {
        return ApiResponse.success(soilTestService.list(seasonId, plotId));
    }

    @GetMapping("/soil-tests/latest")
    public ApiResponse<List<SoilTestResponse>> latestByPlots(
            @RequestParam List<Integer> plotIds
    ) {
        return ApiResponse.success(soilTestService.latestByPlots(plotIds));
    }
}
