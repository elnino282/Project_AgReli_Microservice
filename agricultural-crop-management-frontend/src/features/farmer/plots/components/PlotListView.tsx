import { useState, useMemo } from "react";
import { ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { Checkbox } from "@/shared/ui/checkbox";
import { useTranslation } from "react-i18next";
import { PlotStatusChip } from "./PlotStatusChip";
import { PlotActionsMenu } from "./PlotActionsMenu";
import { PlotBulkActionBar } from "./PlotBulkActionBar";
import { getSoilTypeLabel } from "@/features/farmer/shared/plotOptions";
import type { Plot, PlotStatus } from "../types";

type SortColumn = "name" | "area" | "pH" | "status" | null;
type SortDirection = "asc" | "desc";

interface PlotListViewProps {
    plots: Plot[];
    selectedPlots: string[];
    onToggleSelection: (id: string) => void;
    onToggleAllSelection: () => void;
    onViewDetails: (plot: Plot) => void;
    onDelete: (id: string) => void;
    onBulkDelete: () => void;
    onBulkStatusChange: (status: PlotStatus) => void;
    onClearSelection: () => void;
    onClearFilters: () => void;
}

/**
 * PlotListView Component
 * 
 * Main table view for plot management with:
 * - Sortable columns
 * - Bulk selection and actions
 * - Responsive design (table on desktop, cards on mobile)
 * - Sticky header
 * - Row hover effects
 */
export function PlotListView({
    plots,
    selectedPlots,
    onToggleSelection,
    onToggleAllSelection,
    onViewDetails,
    onDelete,
    onBulkDelete,
    onBulkStatusChange,
    onClearSelection,
    onClearFilters: _onClearFilters,
}: PlotListViewProps) {
    const { t } = useTranslation();
    const [sortColumn, setSortColumn] = useState<SortColumn>(null);
    const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

    // Tri-state checkbox state
    const isAllSelected = plots.length > 0 && selectedPlots.length === plots.length;
    const isSomeSelected = selectedPlots.length > 0 && selectedPlots.length < plots.length;

    // Sorting logic
    const sortedPlots = useMemo(() => {
        if (!sortColumn) return plots;

        return [...plots].sort((a, b) => {
            let aValue: string | number = "";
            let bValue: string | number = "";

            switch (sortColumn) {
                case "name":
                    aValue = a.name.toLowerCase();
                    bValue = b.name.toLowerCase();
                    break;
                case "area":
                    aValue = a.area;
                    bValue = b.area;
                    break;
                case "pH":
                    if (a.pH === undefined && b.pH === undefined) return 0;
                    if (a.pH === undefined) return 1;
                    if (b.pH === undefined) return -1;
                    aValue = a.pH;
                    bValue = b.pH;
                    break;
                case "status":
                    aValue = a.status;
                    bValue = b.status;
                    break;
            }

            if (aValue < bValue) return sortDirection === "asc" ? -1 : 1;
            if (aValue > bValue) return sortDirection === "asc" ? 1 : -1;
            return 0;
        });
    }, [plots, sortColumn, sortDirection]);

    // Handle column sort
    const handleSort = (column: SortColumn) => {
        if (sortColumn === column) {
            // Toggle direction if same column
            setSortDirection(sortDirection === "asc" ? "desc" : "asc");
        } else {
            // New column, default to ascending
            setSortColumn(column);
            setSortDirection("asc");
        }
    };

    // Render sort icon
    const renderSortIcon = (column: SortColumn) => {
        if (sortColumn !== column) {
            return <ArrowUpDown className="w-4 h-4 ml-1 opacity-40 group-hover:opacity-60 transition-opacity" />;
        }
        return sortDirection === "asc" ? (
            <ArrowUp className="w-4 h-4 ml-1 text-primary" />
        ) : (
            <ArrowDown className="w-4 h-4 ml-1 text-primary" />
        );
    };


    return (
        <>
            {/* Desktop Table View (hidden on mobile) */}
            <div className="hidden md:block bg-card rounded-xl border border-border shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full table-fixed">
                        {/* Define column widths: Checkbox(12px), Plot Name(30%), Area(15%), pH(12%), Soil Type(18%), Status(17%), Actions(12px) */}
                        <colgroup>
                            <col className="w-12" />
                            <col className="w-[30%]" />
                            <col className="w-[15%]" />
                            <col className="w-[12%]" />
                            <col className="w-[18%]" />
                            <col className="w-[17%]" />
                            <col className="w-12" />
                        </colgroup>

                        {/* Table Header - Sticky */}
                        <thead className="bg-muted/50 border-b-2 border-border sticky top-0 z-10">
                            <tr>
                                {/* Checkbox Column */}
                                <th className="px-4 py-3">
                                    <div className="flex items-center justify-center">
                                        <Checkbox
                                            checked={isAllSelected ? true : isSomeSelected ? "indeterminate" : false}
                                            onCheckedChange={onToggleAllSelection}
                                            className="border-border"
                                        />
                                    </div>
                                </th>

                                {/* Plot Name - Sortable */}
                                <th className="px-4 py-3 text-left">
                                    <button
                                        onClick={() => handleSort("name")}
                                        className="group flex items-center text-xs font-medium text-muted-foreground hover:text-foreground transition-colors uppercase tracking-wider"
                                    >
                                        {t("plots.table.plotName")}
                                        {renderSortIcon("name")}
                                    </button>
                                </th>

                                {/* Area - Sortable, Right-aligned */}
                                <th className="px-4 py-3 text-right">
                                    <button
                                        onClick={() => handleSort("area")}
                                        className="group flex items-center justify-end text-xs font-medium text-muted-foreground hover:text-foreground transition-colors ml-auto uppercase tracking-wider"
                                    >
                                        {t("plots.table.areaHa")}
                                        {renderSortIcon("area")}
                                    </button>
                                </th>

                                {/* pH - Sortable, Center-aligned */}
                                <th className="px-4 py-3 text-center">
                                    <button
                                        onClick={() => handleSort("pH")}
                                        className="group flex items-center justify-center text-xs font-medium text-muted-foreground hover:text-foreground transition-colors mx-auto uppercase tracking-wider"
                                    >
                                        {t("plots.table.ph")}
                                        {renderSortIcon("pH")}
                                    </button>
                                </th>

                                {/* Soil Type */}
                                <th className="px-4 py-3 text-left">
                                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                        {t("plots.table.soilType")}
                                    </span>
                                </th>

                                {/* Status - Sortable */}
                                <th className="px-4 py-3 text-left">
                                    <button
                                        onClick={() => handleSort("status")}
                                        className="group flex items-center text-xs font-medium text-muted-foreground hover:text-foreground transition-colors uppercase tracking-wider"
                                    >
                                        {t("plots.table.status")}
                                        {renderSortIcon("status")}
                                    </button>
                                </th>

                                {/* Actions */}
                                <th className="px-4 py-3">
                                    <span className="sr-only">{t("common.actions")}</span>
                                </th>
                            </tr>
                        </thead>

                        {/* Table Body */}
                        <tbody className="divide-y divide-border">
                            {sortedPlots.map((plot) => {
                                const isSelected = selectedPlots.includes(plot.id);

                                return (
                                    <tr
                                        key={plot.id}
                                        tabIndex={0}
                                        onClick={() => onViewDetails(plot)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' || e.key === ' ') {
                                                e.preventDefault();
                                                onViewDetails(plot);
                                            }
                                        }}
                                        className={`
                                            group cursor-pointer transition-all duration-150
                                            ${isSelected
                                                ? "bg-primary/10 hover:bg-primary/15"
                                                : "bg-card hover:bg-muted/50"
                                            }
                                        `}
                                    >
                                        {/* Checkbox */}
                                        <td className="px-4 py-3.5">
                                            <div className="flex items-center justify-center">
                                                <Checkbox
                                                    checked={isSelected}
                                                    onClick={(e) => e.stopPropagation()}
                                                    onCheckedChange={() => onToggleSelection(plot.id)}
                                                    className="border-border"
                                                />
                                            </div>
                                        </td>

                                        {/* Plot Name - Bold, Truncate */}
                                        <td className="px-4 py-3.5">
                                            <div className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors truncate">
                                                {plot.name}
                                            </div>
                                        </td>

                                        {/* Area - Right-aligned, Monospace */}
                                        <td className="px-4 py-3.5 text-right">
                                            <span className="font-mono tabular-nums text-sm text-foreground">
                                                {plot.area.toFixed(2)}
                                            </span>
                                        </td>

                                        {/* pH - Center-aligned, Badge style */}
                                        <td className="px-4 py-3.5">
                                            <div className="flex justify-center">
                                                <span className={`
                                                    inline-flex items-center justify-center px-2.5 py-1 rounded-md font-mono tabular-nums text-xs font-semibold w-14
                                                    ${plot.pH === undefined ? "bg-muted text-muted-foreground border border-border" :
                                                        plot.pH < 6.0 ? "bg-orange-50 text-orange-700 border border-orange-200" :
                                                        plot.pH > 7.5 ? "bg-sky-50 text-sky-700 border border-sky-200" :
                                                            "bg-green-50 text-green-700 border border-green-200"}
                                                `}>
                                                    {plot.pH?.toFixed(1) ?? "—"}
                                                </span>
                                            </div>
                                        </td>

                                        {/* Soil Type */}
                                        <td className="px-4 py-3.5">
                                            <span className="text-sm text-muted-foreground truncate block">
                                                {getSoilTypeLabel(plot.soilType, t)}
                                            </span>
                                        </td>

                                        {/* Status */}
                                        <td className="px-4 py-3.5">
                                            <PlotStatusChip status={plot.status} />
                                        </td>

                                        {/* Actions */}
                                        <td className="px-4 py-3.5">
                                            <div 
                                                onClick={(e) => e.stopPropagation()} 
                                                onKeyDown={(e) => e.stopPropagation()}
                                                className="flex justify-center w-full bg-transparent border-none p-0 cursor-default focus:outline-none"
                                            >
                                                <PlotActionsMenu
                                                    plot={plot}
                                                    onViewDetails={onViewDetails}
                                                    onDelete={onDelete}
                                                />
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                {/* Footer with row count */}
                <div className="px-6 py-3 bg-muted/50 border-t border-border">
                    <p className="text-sm text-muted-foreground">
                        {t("plots.table.showingCount", { count: sortedPlots.length })}
                        {selectedPlots.length > 0 && (
                            <span className="ml-2">
                                - <span className="font-semibold text-primary">{selectedPlots.length}</span> {t("plots.selected")}
                            </span>
                        )}
                    </p>
                </div>
            </div>

            {/* Bulk Action Bar */}
            <PlotBulkActionBar
                selectedCount={selectedPlots.length}
                onClearSelection={onClearSelection}
                onBulkDelete={onBulkDelete}
                onBulkStatusChange={onBulkStatusChange}
            />
        </>
    );
}


