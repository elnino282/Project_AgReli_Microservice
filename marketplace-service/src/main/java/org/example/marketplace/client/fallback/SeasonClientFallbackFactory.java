package org.example.marketplace.client.fallback;

import feign.FeignException;
import lombok.extern.slf4j.Slf4j;
import org.example.marketplace.client.SeasonClient;
import org.example.marketplace.dto.client.SeasonDetailDto;
import org.springframework.cloud.openfeign.FallbackFactory;
import org.springframework.stereotype.Component;

import java.util.Collections;
import java.util.List;

@Component
@Slf4j
public class SeasonClientFallbackFactory implements FallbackFactory<SeasonClient> {

    @Override
    public SeasonClient create(Throwable cause) {
        return new SeasonClient() {
            @Override
            public List<SeasonDetailDto> getSeasonsByIds(List<Integer> seasonIds) {
                log.error("season-service lỗi khi lấy seasonsByIds: {}", cause.toString());
                return Collections.emptyList();
            }

            @Override
            public SeasonDetailDto getSeasonDetail(Integer seasonId) {
                if (cause instanceof FeignException.NotFound) {
                    return null;
                }
                log.error("season-service lỗi khi lấy seasonId={}: {}", seasonId, cause.toString());
                throw new IllegalStateException("Dịch vụ season-service đang gặp sự cố, vui lòng thử lại sau");
            }

            @Override
            public List<Integer> getSeasonIdsByOwnerId(Long ownerId) {
                log.error("season-service lỗi khi lấy season IDs cho ownerId={}: {}", ownerId, cause.toString());
                return Collections.emptyList();
            }

            @Override
            public List<org.example.marketplace.dto.client.PesticideRecordDto> getSeasonPesticideRecords(Integer seasonId) {
                log.error("season-service lỗi khi lấy PesticideRecords cho seasonId={}: {}", seasonId, cause.toString());
                throw new IllegalStateException(
                        "Dịch vụ season-service đang gặp sự cố, không thể xác minh an toàn thu hoạch",
                        cause);
            }
        };
    }
}
