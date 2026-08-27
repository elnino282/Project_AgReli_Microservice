import { Checkbox } from "@/shared/ui/checkbox";
import { Button } from "@/shared/ui/button";
import { useTranslation } from "react-i18next";
import { PlotStatusChip } from "./PlotStatusChip";
import { PlotActionsMenu } from "./PlotActionsMenu";
import { getSoilTypeLabel } from "@/features/farmer/shared/plotOptions";
import type { Plot } from "../types";

interface PlotMobileCardProps {
    plot: Plot;
    isSelected: boolean;
    onToggleSelection: (id: string) => void;
    onViewDetails: (plot: Plot) => void;
    onDelete: (id: string) => void;
}

/**
 * PlotMobileCard Component
 * 
 * Card-based layout for plot display on mobile devices.
 * Shows key information in a compact, touch-friendly format.
 */
export function PlotMobileCard({
    plot,
    isSelected,
    onToggleSelection,
    onViewDetails,
    onDelete,
}: PlotMobileCardProps) {
    const { t } = useTranslation();

    return (
        <div className="bg-card rounded-lg border border-border p-4 shadow-sm">
            {/* Header: Checkbox + Title + Actions */}
            <div className="flex items-start gap-3 mb-3">
                <Checkbox
                    checked={isSelected}
                    onCheckedChange={() => onToggleSelection(plot.id)}
                    className="mt-1"
                />
                <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-foreground truncate">{plot.name}</h3>
                    <p className="text-sm text-muted-foreground mt-0.5">{t("plots.meta.id", { id: plot.id })}</p>
                </div>
                <PlotActionsMenu
                    plot={plot}
                    onViewDetails={onViewDetails}
                    onDelete={onDelete}
                />
            </div>

            {/* Meta Information */}
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
                <span>{plot.area} ha</span>
                <span>•</span>
                <span>{getSoilTypeLabel(plot.soilType, t)}</span>
                <span>•</span>
                <span>pH {plot.pH?.toFixed(1) ?? t("plots.detail.noData")}</span>
            </div>

            {/* Crop Information */}
            {plot.crop ? (
                <div className="text-sm text-foreground mb-3">
                    <span className="font-medium">{plot.crop}</span>
                    {plot.cropVariety && (
                        <span className="text-muted-foreground"> - {plot.cropVariety}</span>
                    )}
                </div>
            ) : (
                <div className="flex items-center gap-2 mb-3">
                    <span className="text-sm text-muted-foreground">{t("plots.noCrop")}</span>
                    <Button variant="link" size="sm" className="h-auto p-0 text-xs">
                        {t("plots.actions.assign")}
                    </Button>
                </div>
            )}

            {/* Status Badge */}
            <div>
                <PlotStatusChip status={plot.status} />
            </div>
        </div>
    );
}



