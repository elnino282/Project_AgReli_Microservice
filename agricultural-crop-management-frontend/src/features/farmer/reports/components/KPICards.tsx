import { Card, CardContent } from "@/shared/ui/card";
import { usePreferences } from "@/shared/contexts";
import { convertToDisplayCurrency, formatMoney, formatWeight } from "@/shared/lib";
import { CheckCircle2, DollarSign, TrendingDown, TrendingUp, Wheat } from "lucide-react";
import { useI18n } from "@/shared/lib/hooks/useI18n";

export interface KPICardsProps {
  totalCost?: number;
  netProfit?: number;
  totalYieldKg?: number;
  onTimeTasksPercent?: number;
}

export function KPICards({
  totalCost,
  netProfit,
  totalYieldKg,
  onTimeTasksPercent,
}: KPICardsProps) {
  const { preferences } = usePreferences();
  const { t } = useI18n();
  const noData = "--";

  const totalYieldLabel =
    typeof totalYieldKg === "number"
      ? formatWeight(totalYieldKg, preferences.weightUnit, preferences.locale)
      : noData;

  const kpis = [
    {
      title: t("reports.kpi.totalYield"),
      value: totalYieldLabel,
      unit: t("reports.kpi.thisSeason"),
      trend: { value: noData, isPositive: true },
      icon: Wheat,
    },
    {
      title: t("reports.kpi.totalCost"),
      value:
        typeof totalCost === "number"
          ? formatMoney(
              convertToDisplayCurrency(totalCost, preferences.currency),
              preferences.currency,
              preferences.locale
            )
          : noData,
      unit: t("reports.kpi.thisSeason"),
      trend: { value: noData, isPositive: false },
      icon: DollarSign,
    },
    {
      title: t("reports.kpi.onTimeTasks"),
      value:
        typeof onTimeTasksPercent === "number"
          ? `${onTimeTasksPercent}%`
          : noData,
      unit: t("reports.kpi.completedOnTime"),
      trend: { value: noData, isPositive: true },
      icon: CheckCircle2,
    },
    {
      title: t("reports.kpi.netProfit"),
      value:
        typeof netProfit === "number"
          ? formatMoney(
              convertToDisplayCurrency(netProfit, preferences.currency),
              preferences.currency,
              preferences.locale
            )
          : noData,
      unit: t("reports.kpi.thisSeason"),
      trend: {
        value: noData,
        isPositive: typeof netProfit === "number" ? netProfit >= 0 : true,
      },
      icon: TrendingUp,
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {kpis.map((kpi) => {
        const Icon = kpi.icon;
        const TrendIcon = kpi.trend.isPositive ? TrendingUp : TrendingDown;
        const trendColor = kpi.trend.isPositive
          ? "text-primary"
          : "text-destructive";

        return (
          <Card
            key={kpi.title}
            className="overflow-hidden rounded-[18px] border-border shadow-sm"
          >
            <div
              className="h-1"
              style={{
                background:
                  "linear-gradient(to right, var(--primary), var(--chart-4))",
              }}
            />
            <CardContent className="px-6 py-4">
              <div className="flex items-start justify-between mb-3">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <Icon className="w-6 h-6 text-primary" />
                </div>
                <div className={`flex items-center gap-1 ${trendColor}`}>
                  <TrendIcon className="w-4 h-4" />
                  <span className="text-xs">{kpi.trend.value}</span>
                </div>
              </div>
              <p className="text-sm text-muted-foreground mb-1">{kpi.title}</p>
              <p
                className={`${
                  kpi.value.length > 6 ? "text-2xl" : "text-3xl"
                } numeric text-foreground`}
              >
                {kpi.value}
              </p>
              <p className="text-xs text-muted-foreground mt-1">{kpi.unit}</p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
