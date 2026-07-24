package org.example.ai.controller;

import java.util.HashMap;
import java.util.Map;
import java.util.Base64;
import org.example.ai.dto.response.ApiResponse;
import org.example.ai.dto.request.InternalAgriExpertRequest;
import org.example.ai.dto.request.InternalBuyerExpertRequest;
import org.example.ai.dto.request.InternalImageAnalysisRequest;
import org.example.ai.service.GeminiService;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1")
public class AiController {

    private final GeminiService geminiService;

    public AiController(GeminiService geminiService) {
        this.geminiService = geminiService;
    }

    @PreAuthorize("hasRole('BUYER')")
    @GetMapping("/ai/qa")
    public ApiResponse<Map<String, Object>> qa(@RequestParam String question,
                                               @RequestParam(required = false) String context) {
        String answer = geminiService.chatAsBuyerProcurementExpert(question, context);

        Map<String, Object> payload = new HashMap<>();
        payload.put("question", question);
        payload.put("answer", answer);
        if (context != null && !context.isBlank()) {
            payload.put("context", context);
        }
        return ApiResponse.success(payload);
    }

    @PostMapping("/internal/ai/agricultural-expert")
    public ApiResponse<String> chatAsAgriculturalExpert(@RequestBody InternalAgriExpertRequest request) {
        String answer = geminiService.chatAsAgriculturalExpert(request.getUserMessage(), request.getCropContext());
        return ApiResponse.success(answer);
    }

    @PostMapping("/internal/ai/buyer-expert")
    public ApiResponse<String> chatAsBuyerProcurementExpert(@RequestBody InternalBuyerExpertRequest request) {
        String answer = geminiService.chatAsBuyerProcurementExpert(request.getUserMessage(), request.getBuyerContext());
        return ApiResponse.success(answer);
    }

    @PostMapping("/internal/ai/analyze-image")
    public ApiResponse<String> analyzeMarketplaceImage(@RequestBody InternalImageAnalysisRequest request) {
        byte[] imageBytes = Base64.getDecoder().decode(request.getImageBytesBase64());
        String result = geminiService.analyzeMarketplaceImage(imageBytes, request.getMimeType());
        return ApiResponse.success(result);
    }

    @PreAuthorize("hasRole('FARMER')")
    @PostMapping("/farmer/ai/diagnose-disease")
    public ApiResponse<String> diagnoseDisease(@RequestBody InternalImageAnalysisRequest request) {
        byte[] imageBytes = Base64.getDecoder().decode(request.getImageBytesBase64());
        String result = geminiService.diagnoseDisease(imageBytes, request.getMimeType());
        return ApiResponse.success(result);
    }
    @PreAuthorize("hasRole('FARMER')")
    @PostMapping("/farmer/ai/predict-harvest")
    public ApiResponse<String> predictHarvest(@RequestBody org.example.ai.dto.request.PredictHarvestRequest request) {
        String result = geminiService.predictHarvestDate(request);
        return ApiResponse.success(result);
    }
}
