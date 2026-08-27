import type { Plot as ApiPlot, PlotRequest } from "@/entities/plot";
import type { SoilTestResponse } from "@/entities/soil-test";
import type { Plot, PlotStatus } from "./types";

/**
 * Map backend status string to PlotStatus type.
 */
export const mapStatusToPlotStatus = (status?: string | null): PlotStatus => {
  if (!status) return "planned";
  const normalized = status.toLowerCase();

  if (
    normalized === "active"
    || normalized === "in_use"
    || normalized === "in use"
  ) {
    return "active";
  }

  if (
    normalized === "dormant"
    || normalized === "idle"
    || normalized === "fallow"
  ) {
    return "dormant";
  }

  if (normalized === "maintenance" || normalized === "at-risk") {
    return "at-risk";
  }

  return "planned";
};

/**
 * Map feature status to backend PlotRequest status enum.
 */
export const mapPlotStatusToApiStatus = (status: PlotStatus): PlotRequest["status"] => {
  const statusMap: Record<PlotStatus, PlotRequest["status"]> = {
    active: "IN_USE",
    dormant: "FALLOW",
    planned: "AVAILABLE",
    "at-risk": "MAINTENANCE",
  };
  return statusMap[status];
};

/**
 * Transform API plot response to feature-local Plot type.
 */
export const transformApiToFeature = (apiPlot: ApiPlot, soilTest?: SoilTestResponse): Plot => ({
  id: String(apiPlot.id),
  farmId: apiPlot.farmId ?? undefined,
  name: apiPlot.plotName,
  area: apiPlot.area ?? 0,
  soilType: apiPlot.soilType ?? "Unknown",
  pH: soilTest?.soilPh ?? undefined,
  status: mapStatusToPlotStatus(apiPlot.status),
  statusCode: apiPlot.status ?? undefined,
  createdDate: apiPlot.createdAt?.split("T")[0] ?? new Date().toISOString().split("T")[0],
  organicMatter: soilTest?.soilOrganicMatterPct ?? undefined,
  electricalConductivity: soilTest?.electricalConductivityDsM ?? undefined,
  soilTestDate: soilTest?.sampleDate,
  soilTestSourceType: soilTest?.sourceType ?? undefined,
  soilTestSourceDocument: soilTest?.sourceDocument ?? undefined,
  soilTestLabReference: soilTest?.labReference ?? undefined,
  soilTestNote: soilTest?.note ?? undefined,
  mineralNKgPerHa: soilTest?.mineralNKgPerHa,
  nitrateMgPerKg: soilTest?.nitrateMgPerKg ?? undefined,
  ammoniumMgPerKg: soilTest?.ammoniumMgPerKg ?? undefined,
  seasons: [],
});

/**
 * Get polygon border color based on plot status.
 */
export function getPolygonColor(status: PlotStatus): string {
  switch (status) {
    case "active":
      return "var(--primary)";
    case "dormant":
      return "var(--accent)";
    case "planned":
      return "var(--secondary)";
    case "at-risk":
      return "var(--destructive)";
  }
}
