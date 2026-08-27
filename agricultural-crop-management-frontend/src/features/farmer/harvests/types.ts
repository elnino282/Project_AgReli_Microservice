export type HarvestStatus = "stored" | "sold" | "processing" | "PENDING_RECEIPT" | "RECEIVED";
export type HarvestGrade = "A" | "B" | "C" | "Premium";
export type CropResidueHandling =
    | "RETURNED_TO_SOIL"
    | "REMOVED_FROM_FIELD"
    | "BURNED"
    | "USED_AS_FEED_OR_COMPOST"
    | "UNKNOWN";

export interface QCMetrics {
    purity: number;
    foreignMatter: number;
    brokenGrains: number;
}

export type QualityGrade = "PASSED" | "SUBSTANDARD" | "REJECTED";
export type SubStandardDisposition = "SELL_LIVESTOCK_FEED" | "COMPOSTING" | "PROCESSING" | "DISCARDED" | "SELL_DISCOUNT";
export type PackagingType = "NONE" | "BULK_BAG" | "CRATE" | "CARTON_BOX" | "VACUUM_SEALED" | "NET_BAG";
export type ProcessingType = "NONE" | "WASHED" | "TRIMMED" | "GRADED_AND_SORTED" | "DRIED" | "COOLED";

export interface HarvestBatch {
    id: string;
    batchId: string;
    seasonId?: number;
    seasonName?: string;
    date: string;
    createdAt?: string | null;
    quantity: number;
    unitPrice?: number | null;
    revenue?: number | null;
    grade?: HarvestGrade | null;
    moisture?: number | null;
    linkedSale?: string;
    status?: HarvestStatus | null;
    season?: string;
    plot?: string;
    crop?: string;
    notes?: string;
    qcMetrics?: QCMetrics;
    photo?: string;
    postHarvestDelayDays?: number;

    // === Backend fields ===
    qualityGrade?: QualityGrade;
    qualityNotes?: string;
    subStandardQuantity?: number;
    subStandardDisposition?: SubStandardDisposition;
    packagingType?: PackagingType;
    packagingCount?: number;
    processingType?: ProcessingType;
    cropCategory?: string;
    grossWetWeight?: number;
    netDryWeight?: number;
    warehouseReceiptStatus?: string;
}

export interface HarvestFormData {
    batchId: string;
    date: string;
    quantity: string;
    grossWetWeight?: string;
    grade: HarvestGrade;
    moisture: string;
    season: string;
    plot: string;
    plotName: string;
    crop: string;
    warehouseId: string;
    locationId: string;
    productId: string;
    productName: string;
    productVariant: string;
    lotCode: string;
    inventoryUnit: string;
    status: HarvestStatus;
    notes: string;
    purity: string;
    foreignMatter: string;
    brokenGrains: string;
    harvestLoss: string;
    cropResidueHandling: CropResidueHandling | "";

    // === Quality Grading ===
    qualityGrade: QualityGrade;
    qualityNotes?: string;
    subStandardQuantity?: string;
    subStandardDisposition?: SubStandardDisposition | "";

    // === Packaging & Processing ===
    packagingType?: PackagingType | "";
    packagingCount?: string;
    processingType?: ProcessingType | "";
}

export interface ChartDataPoint {
    date?: string;
    name?: string;
    quantity?: number;
    value?: number;
    color?: string;
}

export interface SummaryStats {
    totalStored: number;
    totalSold: number;
    totalProcessing: number;
    premiumGradePercentage: number;
}



