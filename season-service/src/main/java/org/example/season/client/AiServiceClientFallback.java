package org.example.season.client;

import org.example.season.dto.common.ApiResponse;
import org.springframework.stereotype.Component;

@Component
public class AiServiceClientFallback implements AiServiceClient {

    @Override
    public ApiResponse<String> generateDiseaseTreatmentSuggestion(InternalDiseaseSuggestionRequest request) {
        return ApiResponse.success("Dịch vụ AI hiện không khả dụng. Vui lòng thử lại sau.");
    }
}
