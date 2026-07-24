import { AlertCircle, BarChart3, Wheat } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { BackButton } from "@/shared/ui/back-button";
import { Button } from "@/shared/ui/button";
import { Card, CardContent } from "@/shared/ui/card";
import { useAllFarmerHarvests } from "@/entities/harvest";
import { useSeasonById } from "@/entities/season";
import { Reports } from "@/features/farmer/reports";
import { useI18n } from "@/shared/lib/hooks/useI18n";

const computeHarvestProgressPercent = (
  expectedYieldKg: number,
  totalHarvestedKg: number,
  harvestCount: number,
  seasonStatus?: string
) => {
  if (expectedYieldKg > 0) {
    return Math.min(100, Math.round((totalHarvestedKg / expectedYieldKg) * 100));
  }

  if (harvestCount === 0) {
    return 0;
  }

  return seasonStatus === "COMPLETED" || seasonStatus === "ARCHIVED" ? 100 : 50;
};

export function SeasonReportsWorkspace() {
  const { seasonId } = useParams();
  const navigate = useNavigate();
  const { t } = useI18n();
  const seasonIdNumber = Number(seasonId);
  const hasValidSeasonId = Number.isFinite(seasonIdNumber) && seasonIdNumber > 0;

  const { data: season, isLoading: isSeasonLoading } = useSeasonById(seasonIdNumber, {
    enabled: hasValidSeasonId,
  });

  const { data: harvestData, isLoading: isHarvestLoading } = useAllFarmerHarvests(
    {
      seasonId: seasonIdNumber,
      page: 0,
      size: 200,
    },
    { enabled: hasValidSeasonId }
  );

  if (!hasValidSeasonId) {
    return (
      <div className="p-6 space-y-4">
        <BackButton to="/farmer/seasons" variant="outline" />
        <Card className="rounded-[18px] border border-destructive/20 bg-destructive/5 shadow-sm">
          <CardContent className="p-6 space-y-2">
            <div className="flex items-center gap-2 text-destructive">
              <AlertCircle className="w-4 h-4" />
              <p className="text-sm">{t("seasonWorkspace.invalidSeason")}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isSeasonLoading || isHarvestLoading) {
    return (
      <div className="p-6">
        <Card className="rounded-[18px] shadow-sm">
          <CardContent className="p-6 text-sm text-muted-foreground">
            {t("seasonReportsWorkspace.loading")}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!season) {
    return (
      <div className="p-6">
        <Card className="rounded-[18px] border border-destructive/20 bg-destructive/5 shadow-sm">
          <CardContent className="p-6">
            <p className="text-sm text-destructive">{t("seasonReportsWorkspace.notFound")}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const harvestBatches = harvestData?.items ?? [];
  const harvestCount = harvestData?.totalElements ?? harvestBatches.length;
  const totalHarvestedKg = harvestBatches.reduce((sum, item) => sum + (item.quantity ?? 0), 0);
  const expectedYieldKg = season.expectedYieldKg ?? 0;
  const harvestProgressPercent = computeHarvestProgressPercent(
    expectedYieldKg,
    totalHarvestedKg,
    harvestCount,
    season.status
  );

  const isFinalReport = harvestProgressPercent >= 100;
  const hasInterimData = (season.actualYieldKg ?? 0) > 0 || totalHarvestedKg > 0;
  const reportMode = isFinalReport ? "final" : "interim";
  const reportButtonLabel = isFinalReport
    ? t("seasonWorkspace.actions.finalReport")
    : t("seasonWorkspace.actions.interimReport");

  if (!hasInterimData && !isFinalReport) {
    return (
      <div className="p-6 space-y-4">
        <BackButton to={`/farmer/seasons/${seasonIdNumber}/workspace`} />
        <Card className="rounded-[18px] border border-amber-300 bg-amber-50 shadow-sm">
          <CardContent className="p-6 space-y-3">
            <div className="flex items-center gap-2 text-amber-700">
              <Wheat className="w-5 h-5" />
              <p className="text-sm">
                {t("seasonReportsWorkspace.interimLockedMessage", { progress: harvestProgressPercent })}
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => navigate(`/farmer/seasons/${seasonIdNumber}/workspace/harvest`)}
              >
                {t("seasonReportsWorkspace.actions.goToHarvest")}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-6">
      <Card className={isFinalReport ? "rounded-[18px] border border-emerald-300 bg-emerald-50 shadow-sm" : "rounded-[18px] border border-amber-300 bg-amber-50 shadow-sm"}>
        <CardContent className="p-6 space-y-3">
          <div className={`flex items-start gap-2 ${isFinalReport ? "text-emerald-700" : "text-amber-700"}`}>
            <Wheat className="w-5 h-5 mt-0.5" />
            <div className="space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="inline-flex items-center rounded-full border border-current/30 px-2 py-0.5 text-xs font-semibold">
                  {isFinalReport
                    ? t("seasonReportsWorkspace.badges.final")
                    : t("seasonReportsWorkspace.badges.interim")}
                </span>
                <span className="text-xs font-medium opacity-90">
                  {t("seasonReportsWorkspace.harvestProgress", { progress: harvestProgressPercent })}
                </span>
              </div>
              <p className="text-sm">
                {isFinalReport
                  ? t("seasonReportsWorkspace.finalDescription")
                  : t("seasonReportsWorkspace.interimDescription")}
              </p>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button onClick={() => navigate(`/farmer/seasons/${seasonIdNumber}/workspace/reports`)}>
              <BarChart3 className="w-4 h-4 mr-2" />
              {reportButtonLabel}
            </Button>
            {!isFinalReport && (
              <Button
                variant="outline"
                onClick={() => navigate(`/farmer/seasons/${seasonIdNumber}/workspace/harvest`)}
              >
                {t("seasonReportsWorkspace.actions.goToHarvest")}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Reports
        workspaceSeasonId={seasonIdNumber}
        workspaceSeasonName={season.seasonName}
        reportMode={reportMode}
        harvestProgressPercent={harvestProgressPercent}
      />
    </div>
  );
}
