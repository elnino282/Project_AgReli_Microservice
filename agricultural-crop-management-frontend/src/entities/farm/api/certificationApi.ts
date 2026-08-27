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

export interface CertificationScope {
  id: number;
  seasonId: number;
  plotId: number;
  plotName: string;
  cropId: number;
  cropName: string;
  varietyId?: number;
  varietyName?: string;
  registeredAreaHa: number;
  expectedYieldKg?: number;
}

export interface CertificationDetails {
  recordId: number;
  farmId: number;
  standardCode: string;
  standardName: string;
  complianceScore: number;
  status: CertificationRecordStatus;
  appliedAt?: string;
  certifiedAt?: string;
  expiryDate?: string;
  auditorNotes?: string;
  scopes: CertificationScope[];
  items: CertificationItemDetail[];
  isEligible: boolean;
  certificateNumber?: string;
  nextPeriodicReviewDate?: string;
  publishedAt?: string;
  missingMandatoryEvidenceCount: number;
  missingEvidenceItems: Array<{
    itemCode: string;
    category: string;
    description: string;
  }>;
}

export type CertificationRecordStatus =
  | 'IN_PROGRESS'
  | 'READY_TO_APPLY'
  | 'APPLIED'
  | 'AUDIT_SCHEDULED'
  | 'AUDIT_IN_PROGRESS'
  | 'NONCONFORMITY_FOUND'
  | 'CORRECTIVE_ACTION_SUBMITTED'
  | 'AUDIT_PASSED'
  | 'CERTIFIED'
  | 'PUBLISHED'
  | 'PERIODIC_REVIEW_DUE'
  | 'EXPIRED'
  | 'REVOKED'
  | 'REJECTED';

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

export interface CertificationApplication {
  recordId: number;
  farmId: number;
  farmName?: string;
  standardCode?: string;
  standardName?: string;
  scopes: CertificationScope[];
  complianceScore?: number;
  status: CertificationRecordStatus;
  appliedAt?: string;
  nextPeriodicReviewDate?: string;
  expiryDate?: string;
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

  async updateScopes(
    farmId: number,
    scopes: Array<{ seasonId: number; registeredAreaHa: number }>,
  ): Promise<CertificationScope[]> {
    const response = await httpClient.put<ApiResponse<CertificationScope[]>>(
      `/api/v1/farms/${farmId}/certification/scope`,
      { scopes },
    );
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

  async getCertificationApplications(): Promise<CertificationApplication[]> {
    const response = await httpClient.get<ApiResponse<CertificationApplication[]>>(
      `/api/v1/admin/certification-applications`,
    );
    return response.data.result || [];
  },

  async scheduleAudit(farmId: number, data: {
    auditType: 'INITIAL' | 'PERIODIC';
    scheduledDate: string;
    auditorUserId?: number;
    auditorOrgName?: string;
  }): Promise<CertificationAudit> {
    const response = await httpClient.post<ApiResponse<CertificationAudit>>(
      `/api/v1/farms/${farmId}/certification/audits`,
      data,
    );
    return response.data.result;
  },

  async getFarmAudits(farmId: number): Promise<CertificationAudit[]> {
    const response = await httpClient.get<ApiResponse<CertificationAudit[]>>(
      `/api/v1/farms/${farmId}/certification/audits`,
    );
    return response.data.result || [];
  },

  async getFarmDocuments(farmId: number): Promise<FarmDocumentResponse[]> {
    const response = await httpClient.get<ApiResponse<FarmDocumentResponse[]>>(
      `/api/v1/farms/${farmId}/documents`,
    );
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
