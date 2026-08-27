package org.example.season.client;

import org.springframework.stereotype.Component;
import java.util.List;

@Component
public class SustainabilityServiceClientFallback implements SustainabilityServiceClient {

    @Override
    public List<SoilTestInternalDto> getSoilTests(Integer seasonId) {
        throw unavailable(seasonId);
    }

    @Override
    public List<IrrigationWaterAnalysisInternalDto> getWaterAnalyses(Integer seasonId) {
        throw unavailable(seasonId);
    }

    @Override
    public List<NutrientInputEventInternalDto> getNutrientInputs(Integer seasonId) {
        throw unavailable(seasonId);
    }

    private IllegalStateException unavailable(Integer seasonId) {
        return new IllegalStateException(
                "sustainability-service is unavailable; production diary for season " + seasonId
                        + " cannot be completed");
    }
}

