import { useFarms } from "@/entities/farm";
import {
  Badge,
  Button,
  Card,
  CardContent,
  PageContainer,
  PageHeader,
} from "@/shared/ui";
import { AlertCircle, Award, Building2, ChevronRight, MapPin } from "lucide-react";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

export default function VietGapWorkspaceEntryPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const farmsQuery = useFarms({ page: 0, size: 200 });
  const farms = farmsQuery.data?.content ?? [];

  useEffect(() => {
    if (!farmsQuery.isLoading && !farmsQuery.isError && farms.length === 1) {
      navigate(`/farmer/farms/${farms[0].id}/certification`, { replace: true });
    }
  }, [farms, farmsQuery.isError, farmsQuery.isLoading, navigate]);

  return (
    <PageContainer variant="wide">
      <div className="space-y-6">
        <PageHeader
          title={t("vietGapWorkspace.title")}
          subtitle={t("vietGapWorkspace.subtitle")}
          icon={<Award className="h-7 w-7 text-emerald-700" />}
        />

        {farmsQuery.isLoading && (
          <Card>
            <CardContent className="flex min-h-48 items-center justify-center text-muted-foreground">
              {t("common.loading")}
            </CardContent>
          </Card>
        )}

        {farmsQuery.isError && (
          <Card>
            <CardContent className="flex min-h-48 flex-col items-center justify-center gap-4 text-center">
              <AlertCircle className="h-10 w-10 text-destructive" />
              <p className="font-medium">{t("vietGapWorkspace.loadError")}</p>
              <Button variant="outline" onClick={() => farmsQuery.refetch()}>
                {t("common.tryAgain")}
              </Button>
            </CardContent>
          </Card>
        )}

        {!farmsQuery.isLoading && !farmsQuery.isError && farms.length === 0 && (
          <Card>
            <CardContent className="flex min-h-56 flex-col items-center justify-center gap-4 text-center">
              <Building2 className="h-12 w-12 text-muted-foreground" />
              <div>
                <h2 className="text-lg font-semibold">{t("vietGapWorkspace.emptyTitle")}</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {t("vietGapWorkspace.emptyDescription")}
                </p>
              </div>
              <Button onClick={() => navigate("/farmer/farms")}>
                {t("vietGapWorkspace.manageFarms")}
              </Button>
            </CardContent>
          </Card>
        )}

        {!farmsQuery.isLoading && !farmsQuery.isError && farms.length > 1 && (
          <section aria-labelledby="vietgap-farm-selection" className="space-y-4">
            <div>
              <h2 id="vietgap-farm-selection" className="text-lg font-semibold">
                {t("vietGapWorkspace.selectFarmTitle")}
              </h2>
              <p className="text-sm text-muted-foreground">
                {t("vietGapWorkspace.selectFarmDescription")}
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {farms.map((farm) => (
                <Card
                  key={farm.id}
                  className="group cursor-pointer border-border transition hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-md"
                  role="button"
                  tabIndex={0}
                  onClick={() => navigate(`/farmer/farms/${farm.id}/certification`)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      navigate(`/farmer/farms/${farm.id}/certification`);
                    }
                  }}
                >
                  <CardContent className="flex items-center gap-4 p-5">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                      <Award className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="truncate font-semibold">{farm.name}</h3>
                        <Badge variant={farm.active ? "default" : "secondary"}>
                          {farm.active ? t("common.active") : t("common.inactive")}
                        </Badge>
                      </div>
                      <p className="mt-1 flex items-center gap-1 truncate text-sm text-muted-foreground">
                        <MapPin className="h-3.5 w-3.5 shrink-0" />
                        {farm.provinceName || farm.wardName || t("vietGapWorkspace.locationUnknown")}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {t("vietGapWorkspace.area", { area: Number(farm.area ?? 0).toFixed(2) })}
                      </p>
                    </div>
                    <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-emerald-700" />
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        )}
      </div>
    </PageContainer>
  );
}
