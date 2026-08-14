package org.example.cropcatalog.client;

import lombok.extern.slf4j.Slf4j;
import org.example.cropcatalog.exception.AppException;
import org.example.cropcatalog.exception.ErrorCode;
import org.springframework.stereotype.Component;

@Component
@Slf4j
public class SeasonServiceClientFallback implements SeasonServiceClient {

    @Override
    public Boolean existsByVariety(Integer varietyId) {
        log.error("Fallback triggered: Failed to check if variety {} is referenced in seasons via season-service", varietyId);
        throw new AppException(ErrorCode.DOWNSTREAM_GUARD_UNAVAILABLE);
    }
}
