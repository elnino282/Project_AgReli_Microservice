import { z } from 'zod';
import { DateSchema } from '@/shared/api/types';

// ═══════════════════════════════════════════════════════════════
// HARVEST LIST PARAMS
// ═══════════════════════════════════════════════════════════════

export const HarvestListParamsSchema = z.object({
    seasonId: z.number().int().positive().optional(),
    from: DateSchema.optional(),
    to: DateSchema.optional(),
    page: z.number().int().min(0).default(0),
    size: z.number().int().min(1).default(20),
});

export type HarvestListParams = z.infer<typeof HarvestListParamsSchema>;

// ═══════════════════════════════════════════════════════════════
// HARVEST RESPONSE
// ═══════════════════════════════════════════════════════════════

export const HarvestSchema = z.object({
    id: z.number().int().positive(),
    seasonId: z.number().int().positive().nullable().optional(),
    seasonName: z.string().nullable().optional(),
    harvestDate: DateSchema,
    quantity: z.number().positive(),
    unit: z.number().positive().optional(),
    grade: z.string().nullable().optional(),
    revenue: z.number().nullable().optional(),
    note: z.string().nullable().optional(),
    status: z.enum(['stored', 'sold', 'processing', 'PENDING_RECEIPT', 'RECEIVED']).nullable().optional(),
    createdAt: z.string().nullable().optional(),
    qualityGrade: z.enum(['PASSED', 'SUBSTANDARD', 'REJECTED']).nullable().optional(),
    qualityNotes: z.string().nullable().optional(),
    subStandardQuantity: z.number().nonnegative().nullable().optional(),
    subStandardDisposition: z.enum(['SELL_LIVESTOCK_FEED', 'COMPOSTING', 'PROCESSING', 'DISCARDED', 'SELL_DISCOUNT']).nullable().optional(),
    packagingType: z.enum(['NONE', 'BULK_BAG', 'CRATE', 'CARTON_BOX', 'VACUUM_SEALED', 'NET_BAG']).nullable().optional(),
    packagingCount: z.number().int().nonnegative().nullable().optional(),
    processingType: z.enum(['NONE', 'WASHED', 'TRIMMED', 'GRADED_AND_SORTED', 'DRIED', 'COOLED']).nullable().optional(),
    cropCategory: z.string().nullable().optional(),
    grossWetWeight: z.number().nonnegative().nullable().optional(),
    netDryWeight: z.number().nonnegative().nullable().optional(),
    warehouseReceiptStatus: z.string().nullable().optional(),
    postHarvestDelayDays: z.number().int().nonnegative().nullable().optional(),
});

export type Harvest = z.infer<typeof HarvestSchema>;

// ═══════════════════════════════════════════════════════════════
// HARVEST SUMMARY (KPI)
// ═══════════════════════════════════════════════════════════════

export const HarvestSummarySchema = z.object({
    totalHarvestedKg: z.number(),
    lotsCount: z.number().int(),
    totalRevenue: z.number(),
    yieldVsPlanPercent: z.number().nullable(),
    expectedYieldKg: z.number().nullable(),
    actualYieldKg: z.number().nullable(),
    totalStoredKg: z.number().nullable().optional(),
    totalSoldKg: z.number().nullable().optional(),
    totalProcessingKg: z.number().nullable().optional(),
    premiumGradePercentage: z.number().nullable().optional(),
});

export type HarvestSummary = z.infer<typeof HarvestSummarySchema>;

// ═══════════════════════════════════════════════════════════════
// HARVEST CREATE REQUEST
// ═══════════════════════════════════════════════════════════════

export const HarvestCreateRequestSchema = z.object({
    harvestDate: DateSchema,
    quantity: z.number().positive('Quantity must be positive'),
    unit: z.number().positive('Unit/price must be positive'),
    warehouseId: z.number().int().positive('Warehouse is required'),
    locationId: z.number().int().positive().optional(),
    productId: z.number().int().positive().optional(),
    productName: z.string().trim().min(1, 'Product is required'),
    productVariant: z.string().optional(),
    lotCode: z.string().trim().min(1, 'Lot number is required'),
    inventoryUnit: z.string().trim().min(1).optional(),
    grade: z.string().optional(),
    note: z.string().optional(),
    qualityGrade: z.enum(['PASSED', 'SUBSTANDARD', 'REJECTED']).optional(),
    qualityNotes: z.string().optional(),
    subStandardQuantity: z.number().nonnegative().optional(),
    subStandardDisposition: z.enum(['SELL_LIVESTOCK_FEED', 'COMPOSTING', 'PROCESSING', 'DISCARDED', 'SELL_DISCOUNT']).optional(),
    packagingType: z.enum(['NONE', 'BULK_BAG', 'CRATE', 'CARTON_BOX', 'VACUUM_SEALED', 'NET_BAG']).optional(),
    packagingCount: z.number().int().nonnegative().optional(),
    processingType: z.enum(['NONE', 'WASHED', 'TRIMMED', 'GRADED_AND_SORTED', 'DRIED', 'COOLED']).optional(),
    grossWetWeight: z.number().positive().optional(),
});

export type HarvestCreateRequest = z.infer<typeof HarvestCreateRequestSchema>;

// ═══════════════════════════════════════════════════════════════
// HARVEST UPDATE REQUEST
// ═══════════════════════════════════════════════════════════════

export const HarvestUpdateRequestSchema = z.object({
    harvestDate: DateSchema,
    quantity: z.number().positive('Quantity must be positive'),
    unit: z.number().positive('Unit/price must be positive'),
    grade: z.string().optional(),
    note: z.string().optional(),
    qualityGrade: z.enum(['PASSED', 'SUBSTANDARD', 'REJECTED']).optional(),
    qualityNotes: z.string().optional(),
    subStandardQuantity: z.number().nonnegative().optional(),
    subStandardDisposition: z.enum(['SELL_LIVESTOCK_FEED', 'COMPOSTING', 'PROCESSING', 'DISCARDED', 'SELL_DISCOUNT']).optional(),
    packagingType: z.enum(['NONE', 'BULK_BAG', 'CRATE', 'CARTON_BOX', 'VACUUM_SEALED', 'NET_BAG']).optional(),
    packagingCount: z.number().int().nonnegative().optional(),
    processingType: z.enum(['NONE', 'WASHED', 'TRIMMED', 'GRADED_AND_SORTED', 'DRIED', 'COOLED']).optional(),
    grossWetWeight: z.number().positive().optional(),
});

export type HarvestUpdateRequest = z.infer<typeof HarvestUpdateRequestSchema>;

export const HarvestStockContextSchema = z.object({
    warehouseId: z.number().int().positive(),
    warehouseName: z.string().nullable().optional(),
    productName: z.string().nullable().optional(),
    lotCode: z.string().nullable().optional(),
    matchingLots: z.number().int().nonnegative(),
    onHandQuantity: z.number().nonnegative(),
    unit: z.string().nullable().optional(),
});

export type HarvestStockContext = z.infer<typeof HarvestStockContextSchema>;
