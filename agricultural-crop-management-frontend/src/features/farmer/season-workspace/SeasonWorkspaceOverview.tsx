import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { useI18n } from "@/shared/lib/hooks/useI18n";
import {
  ArrowRight,
  BarChart3,
  Beaker,
  Bug,
  ClipboardList,
  DollarSign,
  Droplets,
  FileText,
  TestTubeDiagonal,
  Users,
  Wheat,
  CheckCircle,
  AlertTriangle,
} from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { seasonsApi } from "@/entities/season/api/seasonsApi";
import { cn } from "@/shared/lib";
import { Text } from "@/shared/ui";

const MODULE_CARDS = [
  {
    titleKey: "seasonWorkspaceOverview.modules.tasks.title",
    descriptionKey: "seasonWorkspaceOverview.modules.tasks.description",
    icon: ClipboardList,
    path: "tasks",
  },
  {
    titleKey: "seasonWorkspaceOverview.modules.expenses.title",
    descriptionKey: "seasonWorkspaceOverview.modules.expenses.description",
    icon: DollarSign,
    path: "expenses",
  },
  {
    titleKey: "seasonWorkspaceOverview.modules.fieldLogs.title",
    descriptionKey: "seasonWorkspaceOverview.modules.fieldLogs.description",
    icon: FileText,
    path: "field-logs",
  },
  {
    titleKey: "seasonWorkspaceOverview.modules.disease.title",
    descriptionKey: "seasonWorkspaceOverview.modules.disease.description",
    icon: Bug,
    path: "disease",
  },
  {
    titleKey: "seasonWorkspaceOverview.modules.harvest.title",
    descriptionKey: "seasonWorkspaceOverview.modules.harvest.description",
    icon: Wheat,
    path: "harvest",
  },
  {
    titleKey: "seasonWorkspaceOverview.modules.labor.title",
    descriptionKey: "seasonWorkspaceOverview.modules.labor.description",
    icon: Users,
    path: "labor-management",
  },
  // {
  //   titleKey: "seasonWorkspaceOverview.modules.nutrient.title",
  //   descriptionKey: "seasonWorkspaceOverview.modules.nutrient.description",
  //   icon: Beaker,
  //   path: "nutrient-inputs",
  // },
  // {
  //   titleKey: "seasonWorkspaceOverview.modules.irrigation.title",
  //   descriptionKey: "seasonWorkspaceOverview.modules.irrigation.description",
  //   icon: Droplets,
  //   path: "irrigation-water-analyses",
  // },
  // {
  //   titleKey: "seasonWorkspaceOverview.modules.soil.title",
  //   descriptionKey: "seasonWorkspaceOverview.modules.soil.description",
  //   icon: TestTubeDiagonal,
  //   path: "soil-tests",
  // },
  {
    titleKey: "seasonWorkspaceOverview.modules.reports.title",
    descriptionKey: "seasonWorkspaceOverview.modules.reports.description",
    icon: BarChart3,
    path: "reports",
  },
] as const;

function HarvestSafetyStatus({ seasonId }: { seasonId: number }) {
  const { data: activePHI } = useQuery({
    queryKey: ['season-phi', seasonId],
    queryFn: () => seasonsApi.getActivePHI(seasonId),
    enabled: !!seasonId,
  });

  const hasActivePHI = activePHI && activePHI.length > 0;
  const nearestSafe = activePHI?.[0]?.harvestAllowedDate;

  return (
    <div className={cn(
      "p-4 rounded-xl border mb-6",
      !hasActivePHI && "border-emerald-200 bg-emerald-50/50",
      hasActivePHI && "border-amber-200 bg-amber-50/50"
    )}>
      {!hasActivePHI ? (
        <div className="flex items-center gap-2 text-emerald-800">
          <CheckCircle className="w-5 h-5 text-emerald-600" />
          <Text className="font-semibold text-emerald-800">Đã hết thời gian cách ly — Có thể thu hoạch</Text>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-amber-800">
            <AlertTriangle className="w-5 h-5 text-amber-600" />
            <Text className="font-semibold text-amber-800">
              {activePHI.length} thuốc BVTV đang trong thời gian cách ly
            </Text>
          </div>
          <div className="text-sm text-amber-700 ml-7">
            Thuốc gần nhất hết cách ly: <strong className="text-amber-900 font-bold">{nearestSafe}</strong>
          </div>
        </div>
      )}
    </div>
  );
}

export function SeasonWorkspaceOverview() {
  const { t } = useI18n();
  const { seasonId } = useParams();
  const navigate = useNavigate();
  const seasonIdSegment = seasonId ?? "";

  return (
    <div className="space-y-6">
      {seasonIdSegment && <HarvestSafetyStatus seasonId={Number(seasonIdSegment)} />}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {MODULE_CARDS.map((module) => {
            const Icon = module.icon;
            return (
              <Card 
                key={module.path} 
                className="group border border-border rounded-2xl bg-card cursor-pointer transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-md hover:border-primary/40 hover:bg-primary/[0.02]"
                onClick={() => navigate(`/farmer/seasons/${seasonIdSegment}/workspace/${module.path}`)}
              >
                <CardHeader className="pb-2 flex flex-row items-start justify-between space-y-0">
                  <CardTitle className="text-lg text-foreground flex items-center gap-2.5">
                    <div className="p-2 bg-primary/10 rounded-xl group-hover:bg-primary/20 transition-colors duration-300">
                      <Icon className="w-4 h-4 text-primary" />
                    </div>
                    <span>{t(module.titleKey)}</span>
                  </CardTitle>
                  <ArrowRight className="w-5 h-5 text-muted-foreground opacity-0 -translate-x-3 transition-all duration-300 group-hover:opacity-100 group-hover:translate-x-0 group-hover:text-primary" />
                </CardHeader>
                <CardContent className="pt-2">
                  <p className="acm-body-text text-muted-foreground line-clamp-3">{t(module.descriptionKey)}</p>
                </CardContent>
              </Card>
          );
        })}
      </div>
    </div>
  );
}
