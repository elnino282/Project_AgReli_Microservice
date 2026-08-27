import {
  MapPin,
  Edit,
  GitMerge,
  Scissors,
  QrCode,
  Trash2,
  AlertCircle,
  LayoutGrid,
  Droplets,
  TestTube,
  Activity,
  Download,
  FileText,
  Info,
  Sprout,
  Calendar,
  Plus,
} from "lucide-react";
import { Button } from "@/shared/ui/button";
import { BackButton } from "@/shared/ui/back-button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/ui/tabs";
import { Label } from "@/shared/ui/label";
import { Separator } from "@/shared/ui/separator";
import { Badge } from "@/shared/ui/badge";
import { usePreferences } from "@/shared/contexts";
import { useTranslation } from "react-i18next";
import { useSeasons } from "@/entities/season";
import { PlotStatusChip } from "./PlotStatusChip";
import { getSoilTypeLabel } from "@/features/farmer/shared/plotOptions";
import type { LinkedSeason, Plot } from "../types";

interface PlotDetailDialogProps {
  plot: Plot | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit: () => void;
  onMerge: () => void;
  onSplit: (plot: Plot) => void;
  onMarkDormant: (plot: Plot) => void;
  onReactivate: (plot: Plot) => void;
  onGenerateQR: (plot: Plot) => void;
  onDelete: (plotId: string) => void;
}

/**
 * PlotDetailDialog Component
 *
 * Modal displaying detailed plot information with tabs for different data sections.
 */
export function PlotDetailDialog({
  plot,
  isOpen,
  onClose,
  onEdit,
  onMerge,
  onSplit,
  onMarkDormant,
  onReactivate,
  onGenerateQR,
  onDelete,
}: PlotDetailDialogProps) {
  const { t } = useTranslation();
  const { preferences } = usePreferences();
  const numericPlotId = plot?.id ? Number.parseInt(plot.id, 10) : 0;
  const {
    data: linkedSeasonsData,
    isLoading: isLoadingLinkedSeasons,
    error: linkedSeasonsError,
    refetch: refetchLinkedSeasons,
  } = useSeasons(
    { plotId: numericPlotId, page: 0, size: 100 },
    { enabled: isOpen && numericPlotId > 0 }
  );
  const formatDate = (value?: string | null) => {
    if (!value) return t("plots.detail.noData");
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleDateString(preferences.locale);
  };
  const formatSeasonStatus = (status: string) => {
    const normalized = status.toUpperCase();
    if (normalized === "ACTIVE") return t("farmDetail.seasons.statusLabels.ACTIVE");
    if (normalized === "PLANNED") return t("farmDetail.seasons.statusLabels.PLANNED");
    if (normalized === "COMPLETED") return t("farmDetail.seasons.statusLabels.COMPLETED");
    if (normalized === "CANCELLED") return t("farmDetail.seasons.statusLabels.CANCELLED");
    if (normalized === "ARCHIVED") return t("farmDetail.seasons.statusLabels.ARCHIVED");
    return status;
  };
  const formatSoilTestSource = (source?: string) => {
    if (!source) return t("plots.detail.notAvailable");
    const labels: Record<string, string> = {
      lab_measured: "Kết quả phòng thử nghiệm",
      user_entered: "Người dùng nhập",
      external_reference: "Nguồn tham chiếu bên ngoài",
      system_estimated: "Hệ thống ước tính",
      default_reference: "Giá trị tham chiếu",
    };
    return labels[source] ?? source;
  };

  if (!plot) return null;
  const soilTypeLabel = getSoilTypeLabel(plot.soilType, t);
  const linkedSeasons: LinkedSeason[] =
    linkedSeasonsData?.items.map((season) => ({
      id: String(season.id),
      name: season.seasonName,
      crop: season.cropName ?? season.varietyName ?? t("plots.detail.noData"),
      status: season.status ?? "PLANNED",
      startDate: season.startDate,
      endDate: season.endDate ?? undefined,
    })) ?? plot.seasons ?? [];
  const isDormant = plot.status === "dormant";

  return (
    <Dialog open={isOpen} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <DialogContent className="sm:max-w-2xl sm:max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <BackButton onClick={onClose} className="w-fit" />
          <DialogTitle className="flex items-center gap-2 text-foreground">
            <MapPin className="w-5 h-5 text-primary" />
            {plot.name}
          </DialogTitle>
          <DialogDescription>
            {t("plots.detail.description", {
              id: plot.id,
              area: plot.area.toFixed(1),
            })}
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="overview" className="mt-6">
          <TabsList className="mb-4 w-full overflow-x-auto">
            <TabsTrigger value="overview" className="rounded-lg data-[state=active]:shadow-sm">{t("plots.detail.tabs.overview")}</TabsTrigger>
            <TabsTrigger value="soil" className="rounded-lg data-[state=active]:shadow-sm">{t("plots.detail.tabs.soilData")}</TabsTrigger>
            <TabsTrigger value="seasons" className="rounded-lg data-[state=active]:shadow-sm">{t("plots.detail.tabs.seasons")}</TabsTrigger>
            <TabsTrigger value="actions" className="rounded-lg data-[state=active]:shadow-sm">{t("plots.detail.tabs.actions")}</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4 mt-6">
            <div className="grid grid-cols-2 gap-4">
              <Card className="border-border">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <LayoutGrid className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">{t("plots.detail.area")}</p>
                      <p className="text-lg text-foreground">
                        {plot.area.toFixed(1)} ha
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-muted/30 rounded-lg">
                      <Droplets className="w-5 h-5 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">{t("plots.detail.soilType")}</p>
                      <p className="text-lg text-foreground">{soilTypeLabel}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-secondary/10 rounded-lg">
                      <TestTube className="w-5 h-5 text-secondary" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">{t("plots.detail.phLevel")}</p>
                      <p className="text-lg text-foreground">
                        {plot.pH?.toFixed(1) ?? t("plots.detail.noData")}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-accent/10 rounded-lg">
                      <Activity className="w-5 h-5 text-accent" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">{t("plots.detail.status")}</p>
                      <div className="mt-1"><PlotStatusChip status={plot.status} /></div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card className="border-border">
              <CardHeader>
                <CardTitle className="text-base">{t("plots.detail.plotInformation")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">{t("plots.detail.createdDate")}</span>
                  <span className="text-sm text-foreground">
                    {formatDate(plot.createdDate)}
                  </span>
                </div>
                {plot.crop && (
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">{t("plots.detail.currentCrop")}</span>
                    <span className="text-sm text-foreground">{plot.crop}</span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* QR Code Preview */}
            <Card className="border-border">
              <CardHeader>
                <CardTitle className="text-base">{t("plots.detail.qrCode")}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="w-24 h-24 bg-muted rounded-lg flex items-center justify-center">
                    <QrCode className="w-16 h-16 text-foreground" />
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onGenerateQR(plot)}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    {t("plots.detail.downloadQR")}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Soil Data Tab */}
          <TabsContent value="soil" className="space-y-4 mt-6">
            <Card className="border-border">
              <CardHeader>
                <CardTitle className="text-base">{t("plots.detail.soilTestResults")}</CardTitle>
                <CardDescription>
                  {plot.soilTestDate
                    ? t("plots.detail.lastUpdated", { date: formatDate(plot.soilTestDate) })
                    : t("plots.detail.noData")}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs text-muted-foreground">{t("plots.detail.phLevel")}</Label>
                    <p className="text-2xl text-foreground mt-1">
                      {plot.pH?.toFixed(2) ?? t("plots.detail.notAvailable")}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">Thang đo 0–14</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">
                      {t("plots.detail.organicMatter")}
                    </Label>
                    <p className="text-2xl text-foreground mt-1">
                      {plot.organicMatter !== undefined
                        ? `${plot.organicMatter.toFixed(2)}%`
                        : t("plots.detail.notAvailable")}
                    </p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">
                      {t("plots.detail.electricalConductivity")}
                    </Label>
                    <p className="text-2xl text-foreground mt-1">
                      {plot.electricalConductivity?.toFixed(4) ?? t("plots.detail.notAvailable")}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">dS/m</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">{t("plots.detail.soilType")}</Label>
                    <p className="text-2xl text-foreground mt-1">{soilTypeLabel}</p>
                  </div>
                </div>

                <Separator className="bg-border" />

                <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
                  <div className="flex justify-between gap-3">
                    <span className="text-muted-foreground">Nitơ khoáng</span>
                    <span>{plot.mineralNKgPerHa !== undefined ? `${plot.mineralNKgPerHa.toFixed(4)} kg/ha` : t("plots.detail.notAvailable")}</span>
                  </div>
                  <div className="flex justify-between gap-3">
                    <span className="text-muted-foreground">Nitrat</span>
                    <span>{plot.nitrateMgPerKg !== undefined ? `${plot.nitrateMgPerKg.toFixed(4)} mg/kg` : t("plots.detail.notAvailable")}</span>
                  </div>
                  <div className="flex justify-between gap-3">
                    <span className="text-muted-foreground">Amoni</span>
                    <span>{plot.ammoniumMgPerKg !== undefined ? `${plot.ammoniumMgPerKg.toFixed(4)} mg/kg` : t("plots.detail.notAvailable")}</span>
                  </div>
                  <div className="flex justify-between gap-3">
                    <span className="text-muted-foreground">Mã phòng thử nghiệm</span>
                    <span>{plot.soilTestLabReference ?? t("plots.detail.notAvailable")}</span>
                  </div>
                  <div className="flex justify-between gap-3">
                    <span className="text-muted-foreground">Nguồn kết quả</span>
                    <span>{formatSoilTestSource(plot.soilTestSourceType)}</span>
                  </div>
                </div>

                {plot.soilTestNote && (
                  <div className="rounded-lg border border-border bg-muted/30 p-3 text-sm">
                    <p className="mb-1 text-xs text-muted-foreground">Ghi chú kết quả</p>
                    <p>{plot.soilTestNote}</p>
                  </div>
                )}

                <Separator className="bg-border" />

                <div className="space-y-2">
                  <Label className="text-sm text-foreground">
                    {t("plots.detail.uploadSoilTestReport")}
                  </Label>
                  {plot.soilTestSourceDocument ? (
                    <Button variant="outline" className="w-full" asChild>
                      <a href={plot.soilTestSourceDocument} target="_blank" rel="noreferrer">
                        <FileText className="w-4 h-4 mr-2" />
                        Mở báo cáo đã lưu
                      </a>
                    </Button>
                  ) : (
                    <div className="rounded-lg border border-dashed border-border p-3 text-sm text-muted-foreground">
                      Chưa có tệp báo cáo được lưu cho lần kiểm tra này.
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="border-border bg-secondary/5">
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <Info className="w-5 h-5 text-secondary mt-0.5" />
                  <div>
                    <p className="text-sm text-foreground">
                      {t("plots.detail.soilRecommendationTitle")}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {plot.soilTestDate
                        ? "Theo dõi xu hướng qua các lần xét nghiệm và sử dụng kết quả phòng thử nghiệm khi lập kế hoạch cải tạo đất."
                        : "Chưa có kết quả xét nghiệm. Hãy ghi nhận kết quả tại workspace kiểm tra đất của mùa vụ liên kết."}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Linked Seasons Tab */}
          <TabsContent value="seasons" className="space-y-4 mt-6">
            <Card className="border-border">
              <CardHeader>
                <CardTitle className="text-base">{t("plots.detail.linkedSeasons")}</CardTitle>
                <CardDescription>
                  {t("plots.detail.linkedSeasonsDesc")}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingLinkedSeasons ? (
                  <div className="py-8 text-center text-sm text-muted-foreground">
                    {t("common.loading")}
                  </div>
                ) : linkedSeasonsError ? (
                  <div className="space-y-3 py-8 text-center">
                    <p className="text-sm text-muted-foreground">
                      {t("farmDetail.seasons.errorDesc")}
                    </p>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => refetchLinkedSeasons()}
                    >
                      {t("common.retry")}
                    </Button>
                  </div>
                ) : linkedSeasons.length > 0 ? (
                  <div className="space-y-3">
                    {linkedSeasons.map((season) => (
                      <div
                        key={season.id}
                        className="flex items-center justify-between p-3 bg-muted rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <Sprout className="w-5 h-5 text-primary" />
                          <div>
                            <p className="text-sm text-foreground">{season.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {t("plots.detail.seasonStarted", {
                                crop: season.crop,
                                date: formatDate(season.startDate),
                              })}
                            </p>
                          </div>
                        </div>
                        <Badge
                          variant="outline"
                          className={
                            season.status.toUpperCase() === "ACTIVE"
                              ? "border-primary text-primary"
                              : "border-border text-muted-foreground"
                          }
                        >
                          {formatSeasonStatus(season.status)}
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-30" />
                    <p className="text-sm text-muted-foreground">
                      {t("plots.detail.noSeasonsLinked")}
                    </p>
                    <Button
                      size="sm"
                      variant="outline"
                      className="mt-3"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      {t("plots.detail.createSeason")}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Actions Tab */}
          <TabsContent value="actions" className="space-y-3 mt-6">
            <Button
              className="w-full justify-start"
              onClick={() => {
                onClose();
                onEdit();
              }}
            >
              <Edit className="w-4 h-4 mr-2" />
              {t("plots.detail.editPlotDetails")}
            </Button>

            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => {
                onClose();
                onMerge();
              }}
            >
              <GitMerge className="w-4 h-4 mr-2" />
              {t("plots.mergePlots")}
            </Button>

            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => {
                onClose();
                onSplit(plot);
              }}
            >
              <Scissors className="w-4 h-4 mr-2" />
              {t("plots.detail.splitPlot")}
            </Button>

            <Button
              variant={isDormant ? "default" : "outline"}
              className={`w-full justify-start ${isDormant ? "" : "border-accent text-accent"}`}
              onClick={() => {
                if (isDormant) {
                  onReactivate(plot);
                } else {
                  onMarkDormant(plot);
                }
                onClose();
              }}
            >
              <AlertCircle className="w-4 h-4 mr-2" />
              {isDormant ? t("plots.detail.markAsActive") : t("plots.detail.markAsDormant")}
            </Button>

            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => onGenerateQR(plot)}
            >
              <QrCode className="w-4 h-4 mr-2" />
              {t("plots.detail.generatePrintQR")}
            </Button>

            <Separator className="bg-border my-4" />

            <Button
              variant="destructive"
              className="w-full justify-start"
              onClick={() => {
                onDelete(plot.id);
                onClose();
              }}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              {t("farms.dialog.deletePlotTitle")}
            </Button>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
