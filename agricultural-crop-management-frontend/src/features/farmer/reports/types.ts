export type ReportSection = "yield" | "performance" | "pesticide";

export type YieldViewMode = "season" | "crop" | "plot";

export type ExportFormat = "excel" | "pdf" | "csv";

export type PesticideStatus = "safe" | "approaching" | "violated" | "review";

export interface PesticideRecord {
    id: string | number;
    lotId: string;
    chemical: string | null;
    quantity: number | null;
    unit?: string | null;
    phi: number | null;
    daysRemaining: number | null;
    status: PesticideStatus;
    appliedAt?: string | null;
    harvestAllowedDate?: string | null;
    activeIngredient?: string | null;
    dosage?: string | null;
    applicationMethod?: string | null;
    targetPest?: string | null;
    notes?: string | null;
}

export interface YieldBySeason {
    season: string;
    yield: number;
    avgYield: number;
}

export interface YieldByCrop {
    crop: string;
    yield: number;
    target: number;
}

export interface YieldByPlot {
    plot: string;
    yield: number;
    area: number;
}

export interface TaskPerformance {
    month: string;
    onTime: number;
    late: number;
    overdue: number;
}

export interface FilterState {
    plots: string[];
    cropType: string;
    season: string;
    timeRange: string;
    includeClosedSeasons: boolean;
}

export interface SidebarItem {
    id: ReportSection;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
}
