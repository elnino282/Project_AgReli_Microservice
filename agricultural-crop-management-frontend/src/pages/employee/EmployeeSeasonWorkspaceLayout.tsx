import { useEmployeeAssignedSeasons } from "@/entities/field-log";
import {
  BackButton,
  Badge,
  Button,
  Card,
  CardContent,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui";
import { useI18n } from "@/shared/lib/hooks/useI18n";
import { Bug, CalendarDays, FileText, Loader2 } from "lucide-react";
import { Outlet, useLocation, useNavigate, useParams } from "react-router-dom";

const pageShellClassName = "acm-main-content mx-auto max-w-[1920px] p-4 md:p-6";

const tabClassName = (isActive: boolean) =>
  [
    "min-h-[44px] inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium transition-colors",
    isActive
      ? "border-primary bg-primary text-primary-foreground"
      : "border-border bg-card text-foreground hover:bg-muted",
  ].join(" ");

export function EmployeeSeasonWorkspaceLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useI18n();
  const { seasonId: seasonIdParam } = useParams();
  const selectedSeasonId = Number(seasonIdParam);
  const { data: seasons = [], isLoading } = useEmployeeAssignedSeasons();
  const selectedSeason = seasons.find((season) => season.seasonId === selectedSeasonId);
  const activeTab = location.pathname.endsWith("/disease") ? "disease" : "field-logs";

  const handleTabChange = (nextTab: "field-logs" | "disease") => {
    navigate(`/employee/seasons/${selectedSeasonId}/workspace/${nextTab}`);
  };

  const handleSeasonChange = (value: string) => {
    const nextSeasonId = Number(value);
    if (!Number.isFinite(nextSeasonId)) return;
    navigate(`/employee/seasons/${nextSeasonId}/workspace/${activeTab}`);
  };

  if (isLoading) {
    return (
      <div className={pageShellClassName}>
        <Card>
          <CardContent className="px-6 py-10 flex items-center justify-center gap-2 text-muted-foreground">
            <Loader2 className="w-5 h-5 animate-spin" />
            {t("employee.workspace.loadingWorkspace")}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!selectedSeason) {
    return (
      <div className={pageShellClassName}>
        <BackButton to="/employee/workspace" className="mb-4 w-fit" />
        <Card>
          <CardContent className="px-6 py-10 flex flex-col items-center gap-3 text-center">
            <CalendarDays className="w-10 h-10 text-muted-foreground" />
            <div>
              <p className="font-medium">{t("employee.workspace.notFoundTitle")}</p>
              <p className="text-sm text-muted-foreground">
                {t("employee.workspace.notFoundDescription")}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className={pageShellClassName}>
        <BackButton to="/employee/workspace" className="mb-4 w-fit" />
        <Card className="border border-border rounded-xl shadow-sm">
          <CardContent className="px-6 py-4 space-y-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-xl font-semibold text-foreground">{t("employee.workspace.title")}</h2>
                  {selectedSeason.status && (
                    <Badge variant="secondary">
                      {t(`employee.status.${selectedSeason.status}`, selectedSeason.status)}
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">{selectedSeason.seasonName}</p>
              </div>

              <Select value={String(selectedSeasonId)} onValueChange={handleSeasonChange}>
                <SelectTrigger className="min-h-[44px] w-full lg:w-[280px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {seasons.map((season) => (
                    <SelectItem key={season.seasonId} value={String(season.seasonId)}>
                      {season.seasonName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                className={tabClassName(activeTab === "field-logs")}
                aria-current={activeTab === "field-logs" ? "page" : undefined}
                onClick={() => handleTabChange("field-logs")}
              >
                <FileText className="w-4 h-4" />
                {t("nav.fieldLogs")}
              </button>
              <button
                type="button"
                className={tabClassName(activeTab === "disease")}
                aria-current={activeTab === "disease" ? "page" : undefined}
                onClick={() => handleTabChange("disease")}
              >
                <Bug className="w-4 h-4" />
                {t("nav.disease")}
              </button>
            </div>
          </CardContent>
        </Card>
      </div>

      <Outlet />
    </div>
  );
}
