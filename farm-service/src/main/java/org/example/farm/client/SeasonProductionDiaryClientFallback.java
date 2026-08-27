package org.example.farm.client;

import org.springframework.stereotype.Component;
import java.util.List;

@Component
public class SeasonProductionDiaryClientFallback implements SeasonProductionDiaryClient {

    @Override
    public List<ProductionDiaryEventDto> getProductionDiaryInternal(Integer seasonId) {
        throw new IllegalStateException(
                "season-service is unavailable; production diary for season " + seasonId
                        + " cannot be exported");
    }
}

