import { z } from "zod";
import { DateSchema } from "@/shared/api/types";

export const DiseaseSeverityEnum = z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]);
export const DiseaseStatusEnum = z.enum(["OPEN", "UNDER_TREATMENT", "MONITORING", "RESOLVED", "CLOSED", "TREATED"]);
export const TreatmentEffectivenessEnum = z.enum(["UNKNOWN", "POOR", "FAIR", "GOOD", "EXCELLENT"]);
export const DiseaseActorTypeEnum = z.enum(["FARMER", "EMPLOYEE", "UNKNOWN"]);

export const DiseaseRecordListParamsSchema = z.object({
  status: DiseaseStatusEnum.optional(),
  severity: DiseaseSeverityEnum.optional(),
  q: z.string().optional(),
  fromDetectedAt: DateSchema.optional(),
  toDetectedAt: DateSchema.optional(),
  page: z.number().int().min(0).default(0),
  size: z.number().int().min(1).default(20),
});

export const DiseaseRecordSchema = z.object({
  id: z.number().int().positive(),
  seasonId: z.number().int().positive().nullable().optional(),
  seasonName: z.string().nullable().optional(),
  plotId: z.number().int().positive().nullable().optional(),
  plotName: z.string().nullable().optional(),
  cropId: z.number().int().positive().nullable().optional(),
  cropName: z.string().nullable().optional(),
  varietyId: z.number().int().positive().nullable().optional(),
  varietyName: z.string().nullable().optional(),
  reportedByUserId: z.number().int().nullable().optional(),
  reportedByUsername: z.string().nullable().optional(),
  reportedByDisplayName: z.string().nullable().optional(),
  reportedByType: DiseaseActorTypeEnum.nullable().optional(),
  canEdit: z.boolean().nullable().optional(),
  canDelete: z.boolean().nullable().optional(),
  incidentId: z.number().int().nullable().optional(),
  diseaseName: z.string(),
  symptomSummary: z.string().nullable().optional(),
  severity: DiseaseSeverityEnum,
  status: DiseaseStatusEnum,
  detectedAt: z.string(),
  affectedPlantCount: z.number().int().nullable().optional(),
  affectedAreaValue: z.number().nullable().optional(),
  affectedAreaUnit: z.string().nullable().optional(),
  evidenceUrl: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  createdAt: z.string().nullable().optional(),
  updatedAt: z.string().nullable().optional(),
  treatmentCount: z.number().int().nullable().optional(),
  latestTreatmentAt: z.string().nullable().optional(),
});

export const DiseaseTreatmentSchema = z.object({
  id: z.number().int().positive(),
  diseaseRecordId: z.number().int().positive().nullable().optional(),
  treatedAt: z.string(),
  method: z.string(),
  supplyItemId: z.number().int().nullable().optional(),
  supplyItemName: z.string().nullable().optional(),
  supplyLotId: z.number().int().nullable().optional(),
  batchCode: z.string().nullable().optional(),
  materialName: z.string().nullable().optional(),
  quantityUsed: z.number().nullable().optional(),
  unit: z.string().nullable().optional(),
  costAmount: z.number().nullable().optional(),
  expenseId: z.number().int().nullable().optional(),
  effectiveness: TreatmentEffectivenessEnum.nullable().optional(),
  resultSummary: z.string().nullable().optional(),
  nextReviewAt: DateSchema.nullable().optional(),
  notes: z.string().nullable().optional(),
  createdByUserId: z.number().int().nullable().optional(),
  createdByUsername: z.string().nullable().optional(),
  createdByDisplayName: z.string().nullable().optional(),
  createdByType: DiseaseActorTypeEnum.nullable().optional(),
  canEdit: z.boolean().nullable().optional(),
  canDelete: z.boolean().nullable().optional(),
  createdAt: z.string().nullable().optional(),
  updatedAt: z.string().nullable().optional(),
});

export const DiseaseRecordDetailSchema = z.object({
  record: DiseaseRecordSchema,
  treatments: z.array(DiseaseTreatmentSchema),
  treatmentCount: z.number().int().nullable().optional(),
  latestTreatmentAt: z.string().nullable().optional(),
  totalTreatmentCost: z.number().nullable().optional(),
});

export const DiseaseSuggestionRequestSchema = z.object({
  question: z.string().max(2000).optional(),
  includeInventory: z.boolean().optional(),
  additionalNote: z.string().max(4000).optional(),
});

export const DiseaseSuggestionResponseSchema = z.object({
  diseaseRecordId: z.number().int().positive(),
  suggestionText: z.string(),
  usedContextSummary: z.record(z.unknown()).optional(),
  generatedAt: z.string(),
  warning: z.string().optional(),
});

export const DiseaseRecordCreateRequestSchema = z.object({
  diseaseName: z.string().min(1).max(150),
  symptomSummary: z.string().max(4000).optional(),
  severity: DiseaseSeverityEnum,
  status: DiseaseStatusEnum.optional(),
  detectedAt: z.string().min(1),
  affectedPlantCount: z.number().int().min(0).optional(),
  affectedAreaValue: z.number().min(0).optional(),
  affectedAreaUnit: z.string().max(20).optional(),
  evidenceUrl: z.string().max(1000).optional(),
  notes: z.string().max(4000).optional(),
  incidentId: z.number().int().positive().optional(),
});

export const DiseaseRecordUpdateRequestSchema = z.object({
  diseaseName: z.string().min(1).max(150).optional(),
  symptomSummary: z.string().max(4000).optional(),
  severity: DiseaseSeverityEnum.optional(),
  status: DiseaseStatusEnum.optional(),
  detectedAt: z.string().min(1).optional(),
  affectedPlantCount: z.number().int().min(0).optional(),
  affectedAreaValue: z.number().min(0).optional(),
  affectedAreaUnit: z.string().max(20).optional(),
  evidenceUrl: z.string().max(1000).optional(),
  notes: z.string().max(4000).optional(),
  incidentId: z.number().int().positive().optional(),
});

export const DiseaseTreatmentListParamsSchema = z.object({
  page: z.number().int().min(0).default(0),
  size: z.number().int().min(1).default(20),
});

export const DiseaseTreatmentCreateRequestSchema = z.object({
  treatedAt: z.string().min(1),
  method: z.string().min(1).max(100),
  supplyItemId: z.number().int().positive().optional(),
  supplyLotId: z.number().int().positive().optional(),
  materialName: z.string().max(150).optional(),
  quantityUsed: z.number().min(0).optional(),
  unit: z.string().max(20).optional(),
  costAmount: z.number().min(0).optional(),
  expenseId: z.number().int().positive().optional(),
  effectiveness: TreatmentEffectivenessEnum.optional(),
  resultSummary: z.string().max(4000).optional(),
  nextReviewAt: DateSchema.optional(),
  notes: z.string().max(4000).optional(),
});

export const DiseaseTreatmentUpdateRequestSchema = z.object({
  treatedAt: z.string().min(1).optional(),
  method: z.string().min(1).max(100).optional(),
  supplyItemId: z.number().int().positive().optional(),
  supplyLotId: z.number().int().positive().optional(),
  materialName: z.string().max(150).optional(),
  quantityUsed: z.number().min(0).optional(),
  unit: z.string().max(20).optional(),
  costAmount: z.number().min(0).optional(),
  expenseId: z.number().int().positive().optional(),
  effectiveness: TreatmentEffectivenessEnum.optional(),
  resultSummary: z.string().max(4000).optional(),
  nextReviewAt: DateSchema.optional(),
  notes: z.string().max(4000).optional(),
});

export type DiseaseSeverity = z.infer<typeof DiseaseSeverityEnum>;
export type DiseaseStatus = z.infer<typeof DiseaseStatusEnum>;
export type TreatmentEffectiveness = z.infer<typeof TreatmentEffectivenessEnum>;
export type DiseaseActorType = z.infer<typeof DiseaseActorTypeEnum>;
export type DiseaseRecordListParams = z.infer<typeof DiseaseRecordListParamsSchema>;
export type DiseaseRecord = z.infer<typeof DiseaseRecordSchema>;
export type DiseaseTreatment = z.infer<typeof DiseaseTreatmentSchema>;
export type DiseaseRecordDetail = z.infer<typeof DiseaseRecordDetailSchema>;
export type DiseaseSuggestionRequest = z.infer<typeof DiseaseSuggestionRequestSchema>;
export type DiseaseSuggestionResponse = z.infer<typeof DiseaseSuggestionResponseSchema>;
export type DiseaseRecordCreateRequest = z.infer<typeof DiseaseRecordCreateRequestSchema>;
export type DiseaseRecordUpdateRequest = z.infer<typeof DiseaseRecordUpdateRequestSchema>;
export type DiseaseTreatmentListParams = z.infer<typeof DiseaseTreatmentListParamsSchema>;
export type DiseaseTreatmentCreateRequest = z.infer<typeof DiseaseTreatmentCreateRequestSchema>;
export type DiseaseTreatmentUpdateRequest = z.infer<typeof DiseaseTreatmentUpdateRequestSchema>;
