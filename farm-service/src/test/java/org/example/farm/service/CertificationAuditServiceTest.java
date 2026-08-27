package org.example.farm.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.example.farm.dto.request.IssueCertificateRequest;
import org.example.farm.dto.request.VerifyDocumentRequest;
import org.example.farm.entity.CertificationRecord;
import org.example.farm.entity.CertificationAudit;
import org.example.farm.entity.CertificationNonconformity;
import org.example.farm.entity.CertificationStandard;
import org.example.farm.entity.Farm;
import org.example.farm.entity.FarmDocument;
import org.example.farm.exception.AppException;
import org.example.farm.exception.ErrorCode;
import org.example.farm.repository.CertificationAuditRepository;
import org.example.farm.repository.CertificationCorrectiveActionRepository;
import org.example.farm.repository.CertificationNonconformityRepository;
import org.example.farm.repository.CertificationRecordRepository;
import org.example.farm.repository.FarmDocumentRepository;
import org.example.farm.repository.FarmRepository;
import org.example.farm.repository.OutboxEventRepository;
import org.example.farm.repository.CertificationStandardRepository;
import org.example.farm.repository.CertificationScopeRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CertificationAuditServiceTest {

    @Mock
    private CertificationRecordRepository recordRepository;
    @Mock
    private CertificationAuditRepository auditRepository;
    @Mock
    private CertificationNonconformityRepository nonconformityRepository;
    @Mock
    private CertificationCorrectiveActionRepository correctiveActionRepository;
    @Mock
    private FarmDocumentRepository farmDocumentRepository;
    @Mock
    private OutboxEventRepository outboxEventRepository;
    @Mock
    private ObjectMapper objectMapper;
    @Mock
    private CertificationService certificationService;
    @Mock
    private FarmRepository farmRepository;
    @Mock
    private CertificationStandardRepository standardRepository;
    @Mock
    private CertificationScopeRepository scopeRepository;

    @InjectMocks
    private CertificationAuditService service;

    @Test
    void adminAuditListContainsPersistedLifecycleContextWithoutMockData() {
        CertificationAudit audit = CertificationAudit.builder()
                .id(11L).recordId(7).status("PASSED").auditType("INITIAL").build();
        CertificationRecord record = CertificationRecord.builder()
                .id(7).farmId(3).standardId(5).status("AUDIT_PASSED")
                .complianceScore(new java.math.BigDecimal("92.50")).build();
        CertificationNonconformity nonconformity = CertificationNonconformity.builder()
                .id(21L).auditId(11L).severity("MINOR").description("Thiếu nhãn")
                .status("OPEN").build();
        when(auditRepository.findAll()).thenReturn(List.of(audit));
        when(recordRepository.findById(7)).thenReturn(Optional.of(record));
        when(farmRepository.findById(3)).thenReturn(Optional.of(Farm.builder().id(3).name("Farm A").build()));
        when(standardRepository.findById(5)).thenReturn(Optional.of(
                CertificationStandard.builder().id(5).code("VIETGAP").build()));
        when(nonconformityRepository.findByAuditId(11L)).thenReturn(List.of(nonconformity));

        var result = service.getAllAuditsForAdmin();

        assertThat(result).singleElement().satisfies(response -> {
            assertThat(response.getFarmId()).isEqualTo(3);
            assertThat(response.getFarmName()).isEqualTo("Farm A");
            assertThat(response.getStandardCode()).isEqualTo("VIETGAP");
            assertThat(response.getRecordStatus()).isEqualTo("AUDIT_PASSED");
            assertThat(response.getComplianceScore()).isEqualByComparingTo("92.50");
            assertThat(response.getNonconformities()).hasSize(1);
        });
    }

    @Test
    void applicationQueueContainsAppliedFarmContext() {
        CertificationRecord record = CertificationRecord.builder()
                .id(8).farmId(4).standardId(5).status("APPLIED")
                .complianceScore(new java.math.BigDecimal("88.00")).build();
        when(recordRepository.findAll()).thenReturn(List.of(record));
        when(farmRepository.findById(4)).thenReturn(Optional.of(Farm.builder().id(4).name("Farm chờ đánh giá").build()));
        when(standardRepository.findById(5)).thenReturn(Optional.of(
                CertificationStandard.builder().id(5).code("VIETGAP-PLANTING-2026").name("VietGAP 2026").build()));
        when(scopeRepository.findByRecordIdOrderById(8)).thenReturn(List.of());

        var result = service.getApplicationsForAdmin();

        assertThat(result).singleElement().satisfies(application -> {
            assertThat(application.getFarmId()).isEqualTo(4);
            assertThat(application.getFarmName()).isEqualTo("Farm chờ đánh giá");
            assertThat(application.getStatus()).isEqualTo("APPLIED");
            assertThat(application.getComplianceScore()).isEqualByComparingTo("88.00");
        });
    }

    @Test
    void issueCertificate_doesNotMutateWhenEvidenceIsUnavailable() {
        CertificationRecord record = CertificationRecord.builder()
                .id(3)
                .farmId(1)
                .status("AUDIT_PASSED")
                .build();
        when(recordRepository.findByFarmId(1)).thenReturn(List.of(record));
        doThrow(new AppException(ErrorCode.CERTIFICATION_EVIDENCE_UNAVAILABLE))
                .when(certificationService).requireVerifiedEvidence(1);
        IssueCertificateRequest request = IssueCertificateRequest.builder()
                .certificateNumber("CERT-1")
                .issuedDate(LocalDate.of(2026, 8, 14))
                .expiryDate(LocalDate.of(2027, 8, 14))
                .build();

        assertThatThrownBy(() -> service.issueCertificate(1, request))
                .isInstanceOf(AppException.class);

        verify(recordRepository, never()).save(any());
        verify(auditRepository, never()).findByRecordId(any());
    }

    @Test
    void publishCertificateDocument_doesNotMutateWhenEvidenceIsUnavailable() {
        FarmDocument document = FarmDocument.builder()
                .id(8)
                .farmId(1)
                .documentType("CERTIFICATE")
                .build();
        when(farmDocumentRepository.findById(8)).thenReturn(Optional.of(document));
        doThrow(new AppException(ErrorCode.CERTIFICATION_EVIDENCE_UNAVAILABLE))
                .when(certificationService).requireVerifiedEvidence(1);
        VerifyDocumentRequest request = VerifyDocumentRequest.builder().status("VERIFIED").build();

        assertThatThrownBy(() -> service.verifyDocument(1, 8, request, 99L))
                .isInstanceOf(AppException.class);

        verify(farmDocumentRepository, never()).save(any());
        verify(recordRepository, never()).save(any());
    }
}
