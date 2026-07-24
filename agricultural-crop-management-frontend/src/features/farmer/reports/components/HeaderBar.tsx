import { Download, Filter, BarChart3 } from "lucide-react";
import {
    Card,
    CardContent,
} from "@/shared/ui/card";
import { Button } from "@/shared/ui/button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/shared/ui/select";
import { SEASON_OPTIONS } from "../constants";
import { useI18n } from "@/shared/lib/hooks/useI18n";

interface HeaderBarProps {
    selectedSeason: string;
    onSeasonChange: (season: string) => void;
    onFilterClick: () => void;
    onExportClick: () => void;
    seasonOptions?: Array<{ value: string; label: string }>;
    disableSeasonSelect?: boolean;
    title?: string;
    subtitle?: string;
    progressPercent?: number;
}

export function HeaderBar({
    selectedSeason,
    onSeasonChange,
    onFilterClick,
    onExportClick,
    seasonOptions,
    disableSeasonSelect = false,
    title,
    subtitle,
    progressPercent,
}: HeaderBarProps) {
    const { t } = useI18n();
    const options = seasonOptions ?? SEASON_OPTIONS;
    const headingTitle = title ?? t("reports.header.defaultTitle");
    const headingSubtitle = subtitle ?? t("reports.header.defaultSubtitle");

    return (
        <Card className="sticky top-0 z-10 mb-6 rounded-[18px] border border-border bg-card shadow-sm">
            <CardContent className="px-6 py-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="flex-shrink-0">
                        <div className="flex flex-wrap items-center gap-2">
                            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2 leading-tight">
                                <BarChart3 className="w-6 h-6 text-emerald-600" />
                                {headingTitle}
                            </h1>
                            {typeof progressPercent === "number" && (
                                <span className="inline-flex items-center rounded-full border border-emerald-300 bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                                    {t("reports.header.progress", { percent: progressPercent })}
                                </span>
                            )}
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                            {headingSubtitle}
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 flex-shrink-0">
                        <Select value={selectedSeason} onValueChange={onSeasonChange} disabled={disableSeasonSelect}>
                            <SelectTrigger className="w-[180px] rounded-[14px] border-border">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {options.map((option) => (
                                    <SelectItem key={option.value} value={option.value}>
                                        {option.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        <Button
                            variant="outline"
                            className="rounded-[14px] border-primary text-primary hover:bg-primary/5"
                            onClick={onFilterClick}
                        >
                            <Filter className="w-4 h-4 mr-2" />
                            {t("reports.header.filterButton")}
                        </Button>

                        <Button
                            className="rounded-[14px] bg-primary text-white shadow-sm hover:bg-primary/90"
                            onClick={onExportClick}
                        >
                            <Download className="w-4 h-4 mr-2" />
                            {t("reports.header.exportButton")}
                        </Button>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
