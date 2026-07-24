import { useEmployeeAssignedSeasons } from "@/entities/field-log";
import {
  BackButton,
  Badge,
  Button,
  Card,
  CardContent,
  PageContainer,
  PageHeader,
} from "@/shared/ui";
import { useI18n } from "@/shared/lib/hooks/useI18n";
import { CalendarDays, FileText, Loader2, ShieldAlert } from "lucide-react";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

const formatDate = (value: string | null | undefined, locale: string, fallback: string) => {
  if (!value) return fallback;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString(locale);
};

export function EmployeeWorkspacePage() {
  const navigate = useNavigate();
  const { t, locale } = useI18n();
  const { data: seasons = [], isLoading, isError } = useEmployeeAssignedSeasons();

  useEffect(() => {
    if (seasons.length !== 1) return;
    navigate(`/employee/seasons/${seasons[0].seasonId}/workspace/field-logs`, { replace: true });
  }, [navigate, seasons]);

  return (
    <PageContainer>
      <BackButton to="/employee/tasks" className="mb-4 w-fit" />
      <Card className="mb-6 border border-border rounded-xl shadow-sm">
        <CardContent className="px-6 py-4">
          <PageHeader
            className="mb-0"
            icon={<CalendarDays className="w-8 h-8" />}
            title={t("employee.workspace.title")}
            subtitle={t("employee.workspace.subtitle")}
          />
        </CardContent>
      </Card>

      {isLoading ? (
        <Card>
          <CardContent className="px-6 py-10 flex items-center justify-center gap-2 text-muted-foreground">
            <Loader2 className="w-5 h-5 animate-spin" />
            {t("employee.workspace.loadingAssignedSeasons")}
          </CardContent>
        </Card>
      ) : isError ? (
        <Card>
          <CardContent className="px-6 py-10 flex items-center justify-center gap-2 text-destructive">
            <ShieldAlert className="w-5 h-5" />
            {t("employee.workspace.loadAssignedSeasonsError")}
          </CardContent>
        </Card>
      ) : seasons.length === 0 ? (
        <Card>
          <CardContent className="px-6 py-10 flex flex-col items-center gap-3 text-center text-muted-foreground">
            <FileText className="w-10 h-10 opacity-60" />
            <div>
              <p className="font-medium text-foreground">{t("employee.workspace.emptyTitle")}</p>
              <p className="text-sm">{t("employee.workspace.emptyDescription")}</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {seasons.map((season) => (
            <Card key={season.seasonId} className="border border-border rounded-xl shadow-sm hover:border-primary/50 transition-colors">
              <CardContent className="px-5 py-4 space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-foreground line-clamp-2" title={season.seasonName}>{season.seasonName}</h3>
                    <p className="text-sm text-muted-foreground truncate" title={`${formatDate(season.startDate, locale, t("common.notAvailable"))} - ${formatDate(season.endDate ?? season.plannedHarvestDate, locale, t("common.notAvailable"))}`}>
                      {formatDate(season.startDate, locale, t("common.notAvailable"))} -{" "}
                      {formatDate(season.endDate ?? season.plannedHarvestDate, locale, t("common.notAvailable"))}
                    </p>
                  </div>
                  {season.status && (
                    <Badge variant="secondary">
                      {t(`employee.status.${season.status}`, season.status)}
                    </Badge>
                  )}
                </div>
                <Button
                  className="min-h-[44px] w-full"
                  onClick={() => navigate(`/employee/seasons/${season.seasonId}/workspace/field-logs`)}
                >
                  {t("employee.workspace.openWorkspace")}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </PageContainer>
  );
}
