package org.example.farm.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.example.farm.dto.request.IssueCertificateRequest;
import org.example.farm.dto.request.VerifyDocumentRequest;
import org.example.farm.entity.CertificationRecord;
import org.example.farm.entity.FarmDocument;
import org.example.farm.exception.AppException;
import org.example.farm.exception.ErrorCode;
import org.example.farm.repository.CertificationAuditRepository;
import org.example.farm.repository.CertificationCorrectiveActionRepository;
import org.example.farm.repository.CertificationNonconformityRepository;
import org.example.farm.repository.CertificationRecordRepository;
import org.example.farm.repository.FarmDocumentRepository;
import org.example.farm.repository.OutboxEventRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
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

    @InjectMocks
    private CertificationAuditService service;

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
