package org.example.season.service;

import org.example.season.dto.request.CreateFieldLogRequest;
import org.example.season.entity.Season;
import org.example.season.enums.SeasonStatus;
import org.example.season.exception.AppException;
import org.example.season.exception.ErrorCode;
import org.example.season.repository.FieldLogRepository;
import org.example.season.repository.PesticideRecordRepository;
import org.example.season.repository.SeasonRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@DataJpaTest(properties = {
        "spring.jpa.properties.hibernate.dialect=org.hibernate.dialect.H2Dialect",
        "spring.jpa.hibernate.ddl-auto=create-drop"
})
@ActiveProfiles("test")
@Import({FieldLogService.class, PesticideRecordService.class})
@Transactional(propagation = Propagation.NOT_SUPPORTED)
class FieldLogPhiRollbackIntegrationTest {

    @Autowired
    private FieldLogService fieldLogService;
    @Autowired
    private SeasonRepository seasonRepository;
    @Autowired
    private FieldLogRepository fieldLogRepository;
    @Autowired
    private PesticideRecordRepository pesticideRecordRepository;

    @MockBean
    private ExternalServiceClient externalServiceClient;
    @MockBean
    private SeasonWorkspaceAccessService seasonWorkspaceAccessService;

    @Test
    void unknownSprayRollsBackFieldLogAndDerivedPesticideRecord() {
        Season season = seasonRepository.save(Season.builder()
                .seasonName("Rollback season")
                .plotId(10)
                .cropId(20)
                .startDate(LocalDate.of(2026, 8, 1))
                .plannedHarvestDate(LocalDate.of(2026, 10, 1))
                .status(SeasonStatus.ACTIVE)
                .initialPlantCount(100)
                .expectedYieldKg(BigDecimal.TEN)
                .build());
        CreateFieldLogRequest request = CreateFieldLogRequest.builder()
                .logDate(LocalDate.of(2026, 8, 14))
                .logType("SPRAY")
                .notes("Mystery pesticide applied")
                .build();

        assertThatThrownBy(() -> fieldLogService.createFieldLog(season.getId(), request))
                .isInstanceOfSatisfying(AppException.class, exception ->
                        assertThat(exception.getErrorCode()).isEqualTo(ErrorCode.PESTICIDE_PHI_NOT_FOUND));

        assertThat(fieldLogRepository.count()).isZero();
        assertThat(pesticideRecordRepository.count()).isZero();
    }
}
