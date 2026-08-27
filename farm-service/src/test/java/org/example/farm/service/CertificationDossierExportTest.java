package org.example.farm.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.doReturn;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.math.BigDecimal;
import java.util.List;
import org.example.farm.client.SeasonProductionDiaryClient;
import org.example.farm.dto.request.ExportDossierRequest;
import org.example.farm.dto.response.CertificationDetailsResponse;
import org.example.farm.dto.response.CertificationScopeResponse;
import org.example.farm.client.CropCatalogClient;
import org.example.farm.client.SeasonServiceClient;
import org.example.farm.exception.AppException;
import org.example.farm.exception.ErrorCode;
import org.example.farm.repository.CertificationChecklistItemRepository;
import org.example.farm.repository.CertificationItemStatusRepository;
import org.example.farm.repository.CertificationRecordRepository;
import org.example.farm.repository.CertificationStandardRepository;
import org.example.farm.repository.FarmRepository;
import org.example.farm.repository.CertificationScopeRepository;
import org.example.farm.repository.PlotRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class CertificationDossierExportTest {

    @Mock
    CertificationStandardRepository standardRepository;
    @Mock
    CertificationChecklistItemRepository checklistItemRepository;
    @Mock
    CertificationRecordRepository recordRepository;
    @Mock
    CertificationItemStatusRepository itemStatusRepository;
    @Mock
    CertificationScoringService scoringService;
    @Mock
    FarmRepository farmRepository;
    @Mock
    CertificationScopeRepository scopeRepository;
    @Mock
    PlotRepository plotRepository;
    @Mock
    SeasonServiceClient seasonServiceClient;
    @Mock
    CropCatalogClient cropCatalogClient;
    @Mock
    SeasonProductionDiaryClient diaryClient;
    @Mock
    FarmDocumentService documentService;

    CertificationService certificationService;

    @BeforeEach
    void setUp() {
        certificationService = org.mockito.Mockito.spy(new CertificationService(
                standardRepository,
                checklistItemRepository,
                recordRepository,
                itemStatusRepository,
                scoringService,
                farmRepository,
                scopeRepository,
                plotRepository,
                seasonServiceClient,
                cropCatalogClient));
        doReturn(CertificationDetailsResponse.builder()
                .standardName("VietGAP")
                .complianceScore(BigDecimal.valueOf(90))
                .scopes(List.of(CertificationScopeResponse.builder()
                        .seasonId(10).cropName("Lua").plotName("Lo A1")
                        .registeredAreaHa(BigDecimal.ONE).build()))
                .items(List.of())
                .build())
                .when(certificationService).getCertificationDetails(1);
    }

    @Test
    void diaryFailureAbortsExportBeforeDocumentCreation() {
        ExportDossierRequest request = new ExportDossierRequest();
        request.setSeasonIds(List.of(10));
        when(diaryClient.getProductionDiaryInternal(10))
                .thenThrow(new IllegalStateException("season unavailable"));

        assertThatThrownBy(() -> certificationService.exportDossier(
                1, request, 99L, diaryClient, documentService))
                .isInstanceOfSatisfying(AppException.class, exception ->
                        assertThat(exception.getErrorCode())
                                .isEqualTo(ErrorCode.CERTIFICATION_EVIDENCE_UNAVAILABLE));
        verify(documentService, never()).create(
                org.mockito.ArgumentMatchers.anyInt(),
                org.mockito.ArgumentMatchers.anyLong(),
                org.mockito.ArgumentMatchers.any());
    }
}
