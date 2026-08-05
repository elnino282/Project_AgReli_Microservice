import { Card, CardContent, PageContainer, Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/ui";
import { Wheat, CheckCircle2, AlertTriangle } from "lucide-react";
import { useReports } from "./hooks/useReports";
import { HeaderBar } from "./components/HeaderBar";
import { KPICards } from "./components/KPICards";
import { YieldTab } from "./components/YieldTab";
import { PerformanceTab } from "./components/PerformanceTab";
import { PesticideTab } from "./components/PesticideTab";
import { FilterDrawer } from "./components/FilterDrawer";
import { ExportModal } from "./components/ExportModal";
import { useI18n } from "@/shared/lib/hooks/useI18n";
import type { ReportSection } from "./types";

export type SeasonReportMode = "interim" | "final";

interface ReportsProps {
    workspaceSeasonId?: number;
    workspaceSeasonName?: string;
    reportMode?: SeasonReportMode;
    harvestProgressPercent?: number;
}

export function Reports({
    workspaceSeasonId,
    workspaceSeasonName,
    reportMode,
    harvestProgressPercent,
}: ReportsProps) {
    const { t } = useI18n();
    const {
        activeSection, selectedSeason, yieldViewMode, isFilterDrawerOpen,
        isExportModalOpen, isExporting, exportFormat, includeCharts,
        includeNotes, filters, setActiveSection, setSelectedSeason,
        setYieldViewMode, setIsFilterDrawerOpen, setIsExportModalOpen,
        setExportFormat, setIncludeCharts, setIncludeNotes, setFilters,
        handleExport, handleApplyFilters, handleClearFilters,
        getYieldChartData, getPesticideStatusBadge, isLoading, hasError, kpiData,
        taskPerformance, pesticideRecords,
    } = useReports({
        seasonId: workspaceSeasonId,
        initialSeasonValue: workspaceSeasonId ? String(workspaceSeasonId) : undefined,
    });

    const seasonOptions = workspaceSeasonId
        ? [{
            value: String(workspaceSeasonId),
            label: workspaceSeasonName ?? `Season #${workspaceSeasonId}`,
        }]
        : undefined;

    const tabConfig = [
        { value: "yield", icon: Wheat, label: t("reports.tabs.yield") },
        { value: "performance", icon: CheckCircle2, label: t("reports.tabs.tasks") },
        { value: "pesticide", icon: AlertTriangle, label: t("reports.tabs.pesticide") },
    ];

    const resolvedMode: SeasonReportMode = reportMode ?? "final";
    const reportTitle = resolvedMode === "final"
        ? t("reports.header.titleFinal")
        : t("reports.header.titleInterim");
    const reportSubtitle = resolvedMode === "final"
        ? t("reports.header.subtitleFinal")
        : t("reports.header.subtitleInterim");

    return (
        <PageContainer variant="default">
            <div className="w-full">
                <main className="min-w-0 w-full">
                    <HeaderBar
                        selectedSeason={selectedSeason}
                        onSeasonChange={setSelectedSeason}
                        onFilterClick={() => setIsFilterDrawerOpen(true)}
                        onExportClick={() => setIsExportModalOpen(true)}
                        seasonOptions={seasonOptions}
                        disableSeasonSelect={Boolean(workspaceSeasonId)}
                        title={reportTitle}
                        subtitle={reportSubtitle}
                        progressPercent={harvestProgressPercent}
                    />
                    {hasError && (
                        <Card className="mb-4 rounded-[18px] border-destructive/20 bg-destructive/5 shadow-sm">
                            <CardContent className="py-3 text-sm text-destructive">
                                {t("reports.error.loadFailed")}
                            </CardContent>
                        </Card>
                    )}
                    <KPICards
                        totalCost={kpiData.totalCost}
                        netProfit={kpiData.netProfit}
                        totalYieldKg={kpiData.totalYieldKg}
                        onTimeTasksPercent={kpiData.onTimeTasksPercent}
                    />

                    <Card variant="content" className="rounded-[18px]">
                        <CardContent className="px-6 py-4">
                            <Tabs value={activeSection} onValueChange={(v: string) => setActiveSection(v as ReportSection)}>
                                <TabsList className="mb-6 w-full overflow-x-auto">
                                    {tabConfig.map(({ value, icon: Icon, label }) => (
                                        <TabsTrigger key={value} value={value} className="rounded-[14px] data-[state=active]:text-primary">
                                            <Icon className="mr-2 h-4 w-4" />
                                            <span className="hidden sm:inline">{label}</span>
                                        </TabsTrigger>
                                    ))}
                                </TabsList>

                                <TabsContent value="yield" className="mt-0">
                                    {isLoading ? (
                                        <p className="py-8 text-sm text-muted-foreground">{t("reports.loading")}</p>
                                    ) : (
                                        <YieldTab yieldViewMode={yieldViewMode} onViewModeChange={setYieldViewMode} chartData={getYieldChartData()} />
                                    )}
                                </TabsContent>
                                <TabsContent value="performance" className="mt-0">
                                    <PerformanceTab data={taskPerformance} />
                                </TabsContent>
                                <TabsContent value="pesticide" className="mt-0">
                                    <PesticideTab
                                        records={pesticideRecords}
                                        getPesticideStatusBadge={getPesticideStatusBadge}
                                    />
                                </TabsContent>
                            </Tabs>
                        </CardContent>
                    </Card>
                </main>
            </div>

            <FilterDrawer
                isOpen={isFilterDrawerOpen}
                onOpenChange={setIsFilterDrawerOpen}
                filters={filters}
                onFiltersChange={setFilters}
                onApplyFilters={handleApplyFilters}
                onClearFilters={handleClearFilters}
            />
            <ExportModal
                isOpen={isExportModalOpen}
                onOpenChange={setIsExportModalOpen}
                isExporting={isExporting}
                exportFormat={exportFormat}
                onExportFormatChange={setExportFormat}
                includeCharts={includeCharts}
                onIncludeChartsChange={setIncludeCharts}
                includeNotes={includeNotes}
                onIncludeNotesChange={setIncludeNotes}
                onExport={handleExport}
            />
        </PageContainer>
    );
}
