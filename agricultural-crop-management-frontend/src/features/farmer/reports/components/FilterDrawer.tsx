import { Filter } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/shared/ui/sheet";
import { Button } from "@/shared/ui/button";
import { Label } from "@/shared/ui/label";
import { Switch } from "@/shared/ui/switch";
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/shared/ui/select";
import { useI18n } from "@/shared/lib/hooks/useI18n";
import type { FilterState } from "../types";
import {
    PLOT_OPTIONS, CROP_TYPE_OPTIONS, SEASON_OPTIONS, TIME_RANGE_OPTIONS,
} from "../constants";

interface FilterDrawerProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    filters: FilterState;
    onFiltersChange: (filters: FilterState) => void;
    onApplyFilters: () => void;
    onClearFilters: () => void;
}

export function FilterDrawer({
    isOpen, onOpenChange, filters, onFiltersChange, onApplyFilters, onClearFilters,
}: FilterDrawerProps) {
    const { t } = useI18n();

    return (
        <Sheet open={isOpen} onOpenChange={onOpenChange}>
            <SheetContent
                side="right"
                className="w-[320px] sm:max-w-[320px] overflow-y-auto border-l-2 border-primary/20"
            >
                <SheetHeader>
                    <SheetTitle className="flex items-center gap-2 text-foreground">
                        <Filter className="w-5 h-5 text-primary" />
                        {t("reports.filter.title")}
                    </SheetTitle>
                </SheetHeader>

                <div className="mt-6 space-y-6">
                    <div className="space-y-2">
                        <Label htmlFor="plot-filter" className="text-foreground">
                            {t("reports.filter.plotSelector")}
                        </Label>
                        <Select
                            value={filters.plots[0] ?? "all"}
                            onValueChange={(value: string) =>
                                onFiltersChange({ ...filters, plots: value === "all" ? [] : [value] })
                            }
                        >
                            <SelectTrigger id="plot-filter" className="rounded-[14px] border-border">
                                <SelectValue placeholder={t("reports.filter.selectPlots")} />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">{t("reports.filter.allPlots")}</SelectItem>
                                {PLOT_OPTIONS.map((option) => (
                                    <SelectItem key={option.value} value={option.value}>
                                        {option.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="crop-filter" className="text-foreground">
                            {t("reports.filter.cropType")}
                        </Label>
                        <Select
                            value={filters.cropType}
                            onValueChange={(value: string) =>
                                onFiltersChange({ ...filters, cropType: value })
                            }
                        >
                            <SelectTrigger id="crop-filter" className="rounded-[14px] border-border">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {CROP_TYPE_OPTIONS.map((option) => (
                                    <SelectItem key={option.value} value={option.value}>
                                        {option.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="season-filter" className="text-foreground">
                            {t("reports.filter.season")}
                        </Label>
                        <Select
                            value={filters.season}
                            onValueChange={(value: string) =>
                                onFiltersChange({ ...filters, season: value })
                            }
                        >
                            <SelectTrigger id="season-filter" className="rounded-[14px] border-border">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">{t("reports.filter.allSeasons")}</SelectItem>
                                {SEASON_OPTIONS.map((option) => (
                                    <SelectItem key={option.value} value={option.value}>
                                        {option.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="time-filter" className="text-foreground">
                            {t("reports.filter.timeRange")}
                        </Label>
                        <Select
                            value={filters.timeRange}
                            onValueChange={(value: string) =>
                                onFiltersChange({ ...filters, timeRange: value })
                            }
                        >
                            <SelectTrigger id="time-filter" className="rounded-[14px] border-border">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {TIME_RANGE_OPTIONS.map((option) => (
                                    <SelectItem key={option.value} value={option.value}>
                                        {option.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="flex items-center justify-between">
                        <Label htmlFor="closed-seasons" className="text-foreground">
                            {t("reports.filter.includeClosedSeasons")}
                        </Label>
                        <Switch
                            id="closed-seasons"
                            checked={filters.includeClosedSeasons}
                            onCheckedChange={(checked: boolean) =>
                                onFiltersChange({ ...filters, includeClosedSeasons: checked })
                            }
                        />
                    </div>
                </div>

                <div className="mt-8 flex gap-3">
                    <Button variant="outline" className="flex-1 rounded-[14px] border-border" onClick={onClearFilters}>
                        {t("reports.filter.clear")}
                    </Button>
                    <Button className="flex-1 rounded-[14px] bg-primary text-white hover:bg-primary/90" onClick={onApplyFilters}>
                        {t("reports.filter.apply")}
                    </Button>
                </div>
            </SheetContent>
        </Sheet>
    );
}
