package org.example.marketplace.client.impl;

import feign.FeignException;
import lombok.extern.slf4j.Slf4j;
import org.example.marketplace.client.FarmClient;
import org.example.marketplace.dto.client.FarmDetailDto;
import org.example.marketplace.dto.client.FarmSummaryDto;
import org.springframework.cloud.openfeign.FallbackFactory;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
@Slf4j
public class FarmClientFallbackFactory implements FallbackFactory<FarmClient> {

    @Override
    public FarmClient create(Throwable cause) {
        return new FarmClient() {
            @Override
            public List<FarmSummaryDto> getFarmsByIds(List<Integer> farmIds) {
                log.error("Fallback getFarmsByIds farmIds={} cause={}", farmIds, cause.toString());
                return List.of();
            }

            @Override
            public FarmDetailDto getFarmDetail(Integer farmId) {
                if (cause instanceof FeignException.NotFound) {
                    log.warn("Farm {} không tồn tại trên farm-service (404 thật)", farmId);
                    return null;
                }
                log.error("farm-service lỗi khi lấy farmId={}: {}", farmId, cause.toString());
                throw new IllegalStateException("Dịch vụ farm-service đang gặp sự cố, vui lòng thử lại sau");
            }

            @Override
            public List<Integer> getFarmIdsByUserId(Long userId) {
                log.error("Fallback getFarmIdsByUserId userId={} cause={}", userId, cause.toString());
                return List.of();
            }

            @Override
            public org.example.marketplace.dto.client.FarmCertificationDto getFarmCertification(
                    Integer farmId, String standardCode, Integer seasonId) {
                log.error("Fallback getFarmCertification farmId={} standardCode={} cause={}", farmId, standardCode, cause.toString());
                return null;
            }
        };
    }
}
