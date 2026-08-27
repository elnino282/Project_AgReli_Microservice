/**
 * View mode options for plot display
 */
export type ViewMode = "list" | "map";

/**
 * Plot status options
 */
export type PlotStatus = "active" | "dormant" | "planned" | "at-risk";

/**
 * Sortable column names
 */
export type SortColumn = "name" | "area" | "pH" | "status";

/**
 * Sort direction
 */
export type SortDirection = "asc" | "desc";

/**
 * Sort state interface
 */
export interface SortState {
  column: SortColumn | null;
  direction: SortDirection;
}

/**
 * Plot interface with all required properties
 */
export interface Plot {
  id: string;
  farmId?: number;
  name: string;
  area: number;
  soilType: string;
  pH?: number;
  status: PlotStatus;
  statusCode?: string;
  crop?: string;
  cropVariety?: string;
  coordinates?: { lat: number; lng: number }[];
  createdDate: string;
  organicMatter?: number;
  electricalConductivity?: number;
  soilTestDate?: string;
  soilTestSourceType?: string;
  soilTestSourceDocument?: string;
  soilTestLabReference?: string;
  soilTestNote?: string;
  mineralNKgPerHa?: number;
  nitrateMgPerKg?: number;
  ammoniumMgPerKg?: number;
  seasons?: LinkedSeason[];
}

/**
 * Linked season information for a plot
 */
export interface LinkedSeason {
  id: string;
  name: string;
  crop: string;
  status: string;
  startDate: string;
  endDate?: string;
}

/**
 * Data required to split one plot into two new plots.
 */
export interface SplitPlotRequest {
  sourcePlot: Plot;
  firstPlotName: string;
  firstArea: number;
  secondPlotName: string;
  secondArea: number;
}




