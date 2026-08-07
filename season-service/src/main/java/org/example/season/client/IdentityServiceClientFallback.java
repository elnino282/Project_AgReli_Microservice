package org.example.season.client;

import lombok.extern.slf4j.Slf4j;
import org.example.season.service.ExternalServiceClient.UserInternalDto;
import org.example.season.service.ExternalServiceClient.EmployeePageResponse;
import org.springframework.stereotype.Component;

import java.util.Collections;

@Component
@Slf4j
public class IdentityServiceClientFallback implements IdentityServiceClient {

    @Override
    public UserInternalDto getUser(Long userId) {
        log.error("Fallback triggered: Failed to fetch user {} from identity-service", userId);
        return null;
    }

    @Override
    public EmployeePageResponse searchEmployees(int page, int size, String keyword) {
        log.error("Fallback triggered: Failed to search employees");
        return EmployeePageResponse.builder().items(Collections.emptyList()).build();
    }

    @Override
    public Boolean validateEmployee(Long userId) {
        log.error("Fallback triggered: Failed to validate employee {}", userId);
        return false;
    }

    @Override
    public java.util.List<UserInternalDto> validateEmployeesBatch(java.util.List<Long> userIds) {
        log.error("Fallback triggered: Failed to validate employees batch {}", userIds);
        return java.util.Collections.emptyList();
    }
}
