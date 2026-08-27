package org.example.marketplace.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import org.example.marketplace.client.FarmClient;
import org.example.marketplace.client.SeasonClient;
import org.example.marketplace.dto.client.FarmCertificationDto;
import org.example.marketplace.dto.client.PesticideRecordDto;
import org.example.marketplace.dto.response.ComplianceCheckResponse;
import org.example.marketplace.dto.response.MarketplaceTraceabilityResponse.PHISafetyInfo;
import org.example.marketplace.entity.MarketplaceProduct;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class MarketplaceComplianceGateServiceTest {

    @Mock
    private FarmClient farmClient;

    @Mock
    private SeasonClient seasonClient;

    private ObjectMapper objectMapper;
    private MarketplaceComplianceGateService service;

    @BeforeEach
    void setUp() {
        objectMapper = new ObjectMapper().registerModule(new JavaTimeModule());
        service = new MarketplaceComplianceGateService(farmClient, seasonClient, objectMapper);
    }

    @Test
    void safePesticideRecords_areStoredUsingPublicTraceSchema() throws Exception {
        MarketplaceProduct product = MarketplaceProduct.builder()
                .seasonId(10)
                .lotHarvestDate(LocalDateTime.of(2026, 8, 14, 8, 0))
                .complianceClaim("TRACE_ONLY")
                .build();
        when(seasonClient.getSeasonPesticideRecords(10)).thenReturn(List.of(
                new PesticideRecordDto(1, 10, "Thuốc A", "A", 7,
                        LocalDate.of(2026, 8, 10), LocalDate.of(2026, 8, 3))));

        ComplianceCheckResponse result = service.checkCompliance(product);
        PHISafetyInfo snapshot = objectMapper.readValue(result.harvestSafetySnapshotJson(), PHISafetyInfo.class);

        assertThat(result.isEligible()).isTrue();
        assertThat(snapshot.isSafe()).isTrue();
        assertThat(snapshot.totalPesticidesUsed()).isEqualTo(1);
        assertThat(snapshot.usage()).singleElement().extracting(item -> item.status()).isEqualTo("SAFE");
    }

    @Test
    void emptyPesticideRecords_areStoredAsVerifiedEmptyPhiSnapshot() throws Exception {
        MarketplaceProduct product = MarketplaceProduct.builder()
                .seasonId(11)
                .complianceClaim("TRACE_ONLY")
                .build();
        when(seasonClient.getSeasonPesticideRecords(11)).thenReturn(List.of());

        ComplianceCheckResponse result = service.checkCompliance(product);
        PHISafetyInfo snapshot = objectMapper.readValue(result.harvestSafetySnapshotJson(), PHISafetyInfo.class);

        assertThat(snapshot.isSafe()).isTrue();
        assertThat(snapshot.totalPesticidesUsed()).isZero();
        assertThat(snapshot.usage()).isEmpty();
    }

    @Test
    void noComplianceClaim_doesNotBypassPhiViolation() {
        MarketplaceProduct product = MarketplaceProduct.builder()
                .seasonId(12)
                .lotHarvestDate(LocalDateTime.of(2026, 8, 14, 8, 0))
                .complianceClaim("NONE")
                .build();
        when(seasonClient.getSeasonPesticideRecords(12)).thenReturn(List.of(
                new PesticideRecordDto(2, 12, "Thuốc B", "B", 14,
                        LocalDate.of(2026, 8, 20), LocalDate.of(2026, 8, 6))));

        ComplianceCheckResponse result = service.checkCompliance(product);

        assertThat(result.isEligible()).isFalse();
        assertThat(result.reasons()).anyMatch(reason -> reason.contains("Vi phạm PHI"));
        verifyNoInteractions(farmClient);
    }

    @Test
    void noComplianceClaim_withVerifiedEmptyRecordsStoresPhiSnapshot() throws Exception {
        MarketplaceProduct product = MarketplaceProduct.builder()
                .seasonId(13)
                .complianceClaim(null)
                .build();
        when(seasonClient.getSeasonPesticideRecords(13)).thenReturn(List.of());

        ComplianceCheckResponse result = service.checkCompliance(product);
        PHISafetyInfo snapshot = objectMapper.readValue(result.harvestSafetySnapshotJson(), PHISafetyInfo.class);

        assertThat(result.isEligible()).isTrue();
        assertThat(snapshot.isSafe()).isTrue();
        assertThat(snapshot.totalPesticidesUsed()).isZero();
        verifyNoInteractions(farmClient);
    }

    @Test
    void vietGapClaim_isAcceptedOnlyWhenTheProductSeasonMatchesCertifiedScope() throws Exception {
        MarketplaceProduct product = MarketplaceProduct.builder()
                .farmId(1).seasonId(20).complianceClaim("VIETGAP").build();
        FarmCertificationDto.ScopeDto scope = new FarmCertificationDto.ScopeDto(
                20, 3, "Lo A1", 4, "Lua", 5, "Dai Thom 8",
                BigDecimal.valueOf(5), BigDecimal.valueOf(34500));
        when(farmClient.getFarmCertification(1, "VIETGAP-PLANTING-2026", 20))
                .thenReturn(new FarmCertificationDto(
                        "TCVN 11892-1:2026", "VIETGAP_PLANTING", "PUBLISHED",
                        LocalDate.of(2026, 8, 20), LocalDate.of(2027, 8, 20),
                        BigDecimal.valueOf(100), "VG-001", true, List.of(scope), 0, List.of()));
        when(seasonClient.getSeasonPesticideRecords(20)).thenReturn(List.of());

        ComplianceCheckResponse result = service.checkCompliance(product);

        assertThat(result.isEligible()).isTrue();
        FarmCertificationDto snapshot = objectMapper.readValue(
                result.certificationSnapshotJson(), FarmCertificationDto.class);
        assertThat(snapshot.scopeMatched()).isTrue();
        assertThat(snapshot.scopes()).singleElement().extracting(FarmCertificationDto.ScopeDto::seasonId)
                .isEqualTo(20);
    }

    @Test
    void vietGapClaim_isRejectedWhenFarmCertificateDoesNotCoverProductSeason() {
        MarketplaceProduct product = MarketplaceProduct.builder()
                .farmId(1).seasonId(21).complianceClaim("VIETGAP").build();
        when(farmClient.getFarmCertification(1, "VIETGAP-PLANTING-2026", 21))
                .thenReturn(new FarmCertificationDto(
                        "TCVN 11892-1:2026", "VIETGAP_PLANTING", "OUT_OF_SCOPE",
                        LocalDate.of(2026, 8, 20), LocalDate.of(2027, 8, 20),
                        BigDecimal.valueOf(100), "VG-001", false, List.of(), 0, List.of()));
        when(seasonClient.getSeasonPesticideRecords(21)).thenReturn(List.of());

        ComplianceCheckResponse result = service.checkCompliance(product);

        assertThat(result.isEligible()).isFalse();
        assertThat(result.certificationSnapshotJson()).isNull();
        assertThat(result.reasons()).hasSize(1);
    }

    @Test
    void seasonServiceUnavailable_rejectsWithoutSafeSnapshot() {
        MarketplaceProduct product = MarketplaceProduct.builder()
                .seasonId(14)
                .complianceClaim("NONE")
                .build();
        when(seasonClient.getSeasonPesticideRecords(14))
                .thenThrow(new IllegalStateException("season-service unavailable"));

        ComplianceCheckResponse result = service.checkCompliance(product);

        assertThat(result.isEligible()).isFalse();
        assertThat(result.harvestSafetySnapshotJson()).isNull();
        assertThat(result.reasons()).contains("Không thể xác minh dữ liệu an toàn thu hoạch với season-service.");
    }
}
