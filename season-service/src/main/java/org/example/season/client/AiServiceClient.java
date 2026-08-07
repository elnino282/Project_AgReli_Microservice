package org.example.season.client;

import org.example.season.dto.common.ApiResponse;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import lombok.Data;
import lombok.Builder;
import lombok.AllArgsConstructor;
import lombok.NoArgsConstructor;
import java.util.List;

@FeignClient(
    name = "ai-service",
    url = "${app.ai-service-url}",
    fallback = AiServiceClientFallback.class
)
public interface AiServiceClient {

    @PostMapping("/api/v1/internal/ai/disease-suggestion")
    ApiResponse<String> generateDiseaseTreatmentSuggestion(@RequestBody InternalDiseaseSuggestionRequest request);

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    class InternalDiseaseSuggestionRequest {
        private String cropName;
        private String diseaseName;
        private String severity;
        private String notes;
        private List<String> availableSupplies;
        private String additionalNote;
        private String question;
    }
}
