package org.example.season.client;

import lombok.extern.slf4j.Slf4j;
import org.example.season.service.ExternalServiceClient.ValidationResultDto;
import org.example.season.service.ExternalServiceClient.CreateNotificationRequest;
import org.springframework.stereotype.Component;
import org.example.season.exception.AppException;
import org.example.season.exception.ErrorCode;

@Component
@Slf4j
public class MonolithServiceClientFallback implements MonolithServiceClient {

    @Override
    public Boolean existsExpenseBySeasonId(Integer seasonId) {
        log.error("Fallback triggered: Failed to check expenses for season {} from monolith-service", seasonId);
        throw new AppException(ErrorCode.DOWNSTREAM_GUARD_UNAVAILABLE);
    }

    @Override
    public ValidationResultDto validateIncidentSeason(Integer incidentId, Integer seasonId) {
        log.error("Fallback triggered: Failed to validate incident {} for season {}", incidentId, seasonId);
        return ValidationResultDto.builder().valid(false).errorCode("INTERNAL_SERVER_ERROR").build();
    }

    @Override
    public ValidationResultDto validateExpenseSeason(Integer expenseId, Integer seasonId) {
        log.error("Fallback triggered: Failed to validate expense {} for season {}", expenseId, seasonId);
        return ValidationResultDto.builder().valid(false).errorCode("INTERNAL_SERVER_ERROR").build();
    }

    @Override
    public void createNotification(CreateNotificationRequest request) {
        log.error("Fallback triggered: Failed to create notification for user {}", request != null ? request.getUserId() : null);
    }
}
