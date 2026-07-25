import { MapPin, List, Plus, MapIcon, Search, X, GitMerge } from "lucide-react";
import { Button, Card, CardContent, Input, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui";
import { useTranslation } from "react-i18next";
import type { ViewMode } from "../types";

interface PlotToolbarProps {
  // View mode
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  
  // Actions
  onAddPlot: () => void;
  onMergePlots?: () => void;
  
  // Search
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  
  // Filters
  filterCrop: string;
  setFilterCrop: (crop: string) => void;
  filterStatus: string;
  setFilterStatus: (status: string) => void;
  filterSoilType: string;
  setFilterSoilType: (type: string) => void;
  
  // Filter options
  cropOptions: Array<{ value: string; label: string }>;
  soilTypeOptions: Array<{ value: string; label: string }>;
  statusOptions: Array<{ value: string; label: string }>;
  isLoadingFilterOptions?: boolean;
  
  // Counts
  filteredCount: number;
  totalCount: number;
  selectedCount?: number;
  
  // Handlers
  onClearFilters: () => void;
  
  // Show merge button
  showMergeButton?: boolean;
}

/**
 * PlotToolbar Component
 * 
 * Unified toolbar that combines header, search, filters, and actions.
 * Provides a clean, scannable interface for plot management.
 */
export function PlotToolbar({
  viewMode,
  setViewMode,
  onAddPlot,
  onMergePlots,
  searchQuery,
  setSearchQuery,
  filterCrop,
  setFilterCrop,
  filterStatus,
  setFilterStatus,
  filterSoilType,
  setFilterSoilType,
  cropOptions,
  soilTypeOptions,
  statusOptions,
  isLoadingFilterOptions = false,
  selectedCount = 0,
  onClearFilters,
  showMergeButton = false,
}: PlotToolbarProps) {
  const { t } = useTranslation();
  const hasActiveFilters =
    searchQuery || filterCrop !== "all" || filterStatus !== "all" || filterSoilType !== "all";

    return (
    <div className="space-y-4">
      <div className="mb-6">
        {/* Header Row: Title + Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          {/* Title Section */}
          <div className="flex-shrink-0">
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2 leading-tight">
              <MapPin className="w-6 h-6 text-primary" />
              {t("plots.myPlots")}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {t("plots.pageSubtitle")}
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 flex-shrink-0">
            {/* Merge Plots Button (conditional) */}
            {showMergeButton && onMergePlots && (
              <Button
                variant="outline"
                size="sm"
                onClick={onMergePlots}
                disabled={selectedCount < 2}
                disabledHint={t("plots.mergeDisabledHint")}
              >
                <GitMerge className="w-4 h-4 mr-2" />
                {t("plots.mergePlots")}
              </Button>
            )}

            {/* View Toggle */}
            <div className="inline-flex rounded-lg bg-muted p-1">
              <Button
                variant={viewMode === "list" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("list")}
                className={`h-8 ${
                  viewMode === "list"
                    ? "bg-card shadow-sm text-primary"
                    : "hover:bg-card/50 text-muted-foreground"
                }`}
              >
                <List className="w-4 h-4 mr-1.5" />
                {t("plots.viewMode.list")}
              </Button>
              <Button
                variant={viewMode === "map" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("map")}
                className={`h-8 ${
                  viewMode === "map"
                    ? "bg-card shadow-sm text-primary"
                    : "hover:bg-card/50 text-muted-foreground"
                }`}
              >
                <MapIcon className="w-4 h-4 mr-1.5" />
                {t("plots.viewMode.map")}
              </Button>
            </div>

            {/* Add Plot Button */}
            <Button
              onClick={onAddPlot}
              size="sm"
            >
              <Plus className="w-4 h-4 mr-2" />
              {t("plots.addPlot")}
            </Button>
          </div>
        </div>
      </div>

      <Card variant="filter">
        <CardContent className="px-6 py-4">
          <div className="flex flex-wrap items-center justify-start gap-4">
            {/* Search Bar */}
            <div className="relative w-[320px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder={t("plots.searchPlaceholder")}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-10 pl-10 border-border focus:border-primary focus:ring-primary"
              />
            </div>

            {/* Crop Filter */}
            <Select value={filterCrop} onValueChange={setFilterCrop} disabled={isLoadingFilterOptions}>
              <SelectTrigger className="w-[180px] border-border focus:border-primary">
                <SelectValue placeholder={t("plots.filters.allPlots")} />
              </SelectTrigger>
              <SelectContent>
                {cropOptions.map((crop) => (
                  <SelectItem key={crop.value} value={crop.value}>
                    {crop.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Status Filter */}
            <Select value={filterStatus} onValueChange={setFilterStatus} disabled={isLoadingFilterOptions}>
              <SelectTrigger className="w-[180px] border-border focus:border-primary">
                <SelectValue placeholder={t("plots.filters.allStatuses")} />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Soil Type Filter */}
            <Select value={filterSoilType} onValueChange={setFilterSoilType} disabled={isLoadingFilterOptions}>
              <SelectTrigger className="w-[180px] border-border focus:border-primary">
                <SelectValue placeholder={t("plots.filters.allSoilTypes")} />
              </SelectTrigger>
              <SelectContent>
                {soilTypeOptions.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>

        {/* Active Filters Summary */}
        {hasActiveFilters && (
          <div className="border-t border-border px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-muted-foreground">{t("plots.filters.activeFilters")}</span>
              {filterCrop !== "all" && (
                <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-foreground bg-muted rounded-md">
                  {t("plots.filters.crop")}: {cropOptions.find(c => c.value === filterCrop)?.label}
                  <button
                    onClick={() => setFilterCrop("all")}
                    className="hover:text-foreground"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
              {filterStatus !== "all" && (
                <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-foreground bg-muted rounded-md">
                  {t("plots.filters.status")}: {statusOptions.find(s => s.value === filterStatus)?.label}
                  <button
                    onClick={() => setFilterStatus("all")}
                    className="hover:text-foreground"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
              {filterSoilType !== "all" && (
                <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-foreground bg-muted rounded-md">
                  {t("plots.filters.soil")}: {soilTypeOptions.find(t => t.value === filterSoilType)?.label}
                  <button
                    onClick={() => setFilterSoilType("all")}
                    className="hover:text-foreground"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClearFilters}
              className="text-xs text-primary hover:text-primary/80 hover:bg-primary/10"
            >
              {t("common.clearAll")}
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}











