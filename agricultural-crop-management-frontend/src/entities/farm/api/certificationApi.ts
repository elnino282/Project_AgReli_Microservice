import httpClient from '@/shared/api/http';

export interface CertificationItemDetail {
  id: number;
  itemCode: string;
  category: string;
  description: string;
  isMandatory: boolean;
  weightPct: number;
  dataSourceType: string;
  dataSourceQuery: string;
  status: string; // PASS, FAIL, PENDING, NOT_APPLICABLE
  evidenceUrl?: string;
  notes?: string;
  checkedAt?: string;
}

export interface CertificationDetails {
  recordId: number;
  farmId: number;
  standardCode: string;
  standardName: string;
  complianceScore: number;
  status: string; // IN_PROGRESS, READY_TO_APPLY, APPLIED, CERTIFIED, REJECTED, EXPIRED
  appliedAt?: string;
  certifiedAt?: string;
  expiryDate?: string;
  auditorNotes?: string;
  items: CertificationItemDetail[];
  isEligible: boolean;
}

export interface ApiResponse<T> {
  code: string;
  result: T;
  message?: string;
}

export interface CertificationNonconformity {
  id: number;
  auditId: number;
  checklistItemId?: number;
  severity: 'MINOR' | 'MAJOR' | 'CRITICAL';
  description: string;
  status: string;
  createdAt: string;
}

export interface CertificationAudit {
  id: number;
  recordId: number;
  farmId?: number;
  farmName?: string;
  standardCode?: string;
  complianceScore?: number;
  recordStatus?: string;
  auditType: string;
  scheduledDate?: string;
  auditorUserId?: number;
  auditorOrgName?: string;
  status: 'SCHEDULED' | 'IN_PROGRESS' | 'PASSED' | 'FAILED' | string;
  interviewNotes?: string;
  sampleCollectionNotes?: string;
  conductedAt?: string;
  createdAt: string;
  nonconformities: CertificationNonconformity[];
}

export interface FarmDocumentResponse {
  id: number;
  farmId: number;
  documentType: string;
  documentTypeLabel: string;
  title: string;
  description?: string;
  fileUrl?: string;
  issuedDate?: string;
  expiryDate?: string;
  isExpired: boolean;
  isExpiringSoon: boolean;
  verificationStatus: string;
  verifiedByName?: string;
  createdAt: string;
  updatedAt: string;
}

export const certificationApi = {
  async getCertificationDetails(farmId: number): Promise<CertificationDetails> {
    const response = await httpClient.get<ApiResponse<CertificationDetails>>(`/api/v1/farms/${farmId}/certification`);
    return response.data.result;
  },

  async updateItemStatus(
    farmId: number,
    itemId: number,
    data: { status: string; evidenceUrl?: string; notes?: string }
  ): Promise<string> {
    const response = await httpClient.put<ApiResponse<string>>(`/api/v1/farms/${farmId}/certification/items/${itemId}`, data);
    return response.data.result;
  },

  async applyCertification(farmId: number): Promise<string> {
    const response = await httpClient.post<ApiResponse<string>>(`/api/v1/farms/${farmId}/certification/apply`);
    return response.data.result;
  },

  async exportDossier(farmId: number, seasonIds?: number[]): Promise<FarmDocumentResponse> {
    const response = await httpClient.post<ApiResponse<FarmDocumentResponse>>(`/api/v1/farms/${farmId}/certification/export-dossier`, {
      seasonIds: seasonIds || []
    });
    return response.data.result;
  },

  async getAllAudits(): Promise<CertificationAudit[]> {
    const response = await httpClient.get<ApiResponse<CertificationAudit[]>>(`/api/v1/admin/certification-audits`);
    return response.data.result || [];
  },

  async startAudit(auditId: number): Promise<CertificationAudit> {
    const response = await httpClient.put<ApiResponse<CertificationAudit>>(`/api/v1/certification-audits/${auditId}/start`);
    return response.data.result;
  },

  async completeAudit(auditId: number, data: {
    result: 'PASSED' | 'FAILED';
    interviewNotes?: string;
    sampleCollectionNotes?: string;
  }): Promise<CertificationAudit> {
    const response = await httpClient.put<ApiResponse<CertificationAudit>>(`/api/v1/certification-audits/${auditId}/complete`, data);
    return response.data.result;
  },

  async createNonconformity(auditId: number, data: {
    checklistItemId?: number;
    severity: 'MINOR' | 'MAJOR' | 'CRITICAL';
    description: string;
  }): Promise<CertificationNonconformity> {
    const response = await httpClient.post<ApiResponse<CertificationNonconformity>>(
      `/api/v1/certification-audits/${auditId}/nonconformities`,
      data,
    );
    return response.data.result;
  },

  async issueCertificate(farmId: number, data: {
    certificateNumber: string;
    issuedDate: string;
    expiryDate: string;
    certificateDocumentId?: number;
  }): Promise<string> {
    const response = await httpClient.post<ApiResponse<string>>(`/api/v1/farms/${farmId}/certification/issue`, data);
    return response.data.result;
  }
};
