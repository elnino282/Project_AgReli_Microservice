import {
  Bar, BarChart as RechartsBarChart, CartesianGrid, ResponsiveContainer,
  Tooltip as RechartsTooltip, XAxis, YAxis,
} from "recharts";
import { AlertCircle, AlertTriangle, Sparkles, Wallet } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Badge } from "@/shared/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/shared/ui/table";
import { usePreferences } from "@/shared/contexts";
import {
  convertCostPerKg, convertToDisplayCurrency, formatMoney, getWeightUnitLabel,
} from "@/shared/lib";
import { useI18n } from "@/shared/lib/hooks/useI18n";
import type { CostOptimizationAiSuggestion, CostOptimizationSummary } from "../types";

interface CostTabProps {
  summary: CostOptimizationSummary | null;
  summaryLoading: boolean;
  summaryError: string | null;
  onRetrySummary: () => void;
  aiSuggestion: CostOptimizationAiSuggestion | null;
  aiLoading: boolean;
  aiError: string | null;
  onAnalyzeWithAi: () => void;
}

export function CostTab({
  summary, summaryLoading, summaryError, onRetrySummary,
  aiSuggestion, aiLoading, aiError, onAnalyzeWithAi,
}: CostTabProps) {
  const { preferences } = usePreferences();
  const { t } = useI18n();
  const resolvedSummary = aiSuggestion ?? summary;
  const unitLabel = getWeightUnitLabel(preferences.weightUnit);
  const noData = "--";

  const formatCurrency = (value: number | null | undefined) => {
    if (typeof value !== "number" || Number.isNaN(value)) return noData;
    return formatMoney(
      convertToDisplayCurrency(value, preferences.currency),
      preferences.currency, preferences.locale,
    );
  };

  const formatPercent = (value: number | null | undefined) => {
    if (typeof value !== "number" || Number.isNaN(value)) return noData;
    return `${new Intl.NumberFormat(preferences.locale, {
      minimumFractionDigits: 0, maximumFractionDigits: 1,
    }).format(value)}%`;
  };

  const formatCostPerWeightUnit = (value: number | null | undefined) => {
    if (typeof value !== "number" || Number.isNaN(value)) return noData;
    const converted = convertCostPerKg(value, preferences.weightUnit);
    return `${formatCurrency(converted)} / ${unitLabel}`;
  };

  const generatedAtLabel = (() => {
    const g = aiSuggestion?.generatedAt;
    if (!g) return null;
    const d = new Date(g);
    if (Number.isNaN(d.getTime())) return g;
    return d.toLocaleString(preferences.locale);
  })();

  const costCategoryRows = resolvedSummary?.topCostCategories?.length
    ? resolvedSummary.topCostCategories
    : resolvedSummary?.expenseByCategory ?? [];

  const categoryChartData = costCategoryRows.slice(0, 6).map((row, i) => ({
    category: row.category || `Category #${i + 1}`,
    amount: row.amount ?? 0,
  }));

  const warnings = resolvedSummary?.warnings ?? [];
  const fallbackDisclaimer = t("reports.cost.fallbackDisclaimer");
  const disclaimer = aiSuggestion?.disclaimer ?? resolvedSummary?.disclaimer ?? fallbackDisclaimer;

  if (summaryLoading) {
    return (
      <Card className="rounded-[18px] border-border">
        <CardContent className="py-6 text-sm text-muted-foreground">
          {t("reports.cost.loading")}
        </CardContent>
      </Card>
    );
  }

  if (summaryError) {
    return (
      <Card className="rounded-[18px] border-destructive/20 bg-destructive/5">
        <CardContent className="py-5 space-y-3">
          <div className="flex items-start gap-2 text-destructive text-sm">
            <AlertCircle className="w-4 h-4 mt-0.5" />
            <p>{t("reports.cost.errorPrefix")} {summaryError}</p>
          </div>
          <Button variant="outline" onClick={onRetrySummary}>
            {t("reports.cost.retryButton")}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg text-foreground mb-1">{t("reports.cost.title")}</h3>
        <p className="text-sm text-muted-foreground">{t("reports.cost.subtitle")}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <Card className="rounded-[18px] border-border">
          <CardContent className="p-4 space-y-2">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">{t("reports.cost.seasonalBudget")}</p>
            <p className="text-2xl font-semibold numeric">{formatCurrency(resolvedSummary?.budgetAmount)}</p>
          </CardContent>
        </Card>
        <Card className="rounded-[18px] border-border">
          <CardContent className="p-4 space-y-2">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">{t("reports.cost.totalExpense")}</p>
            <p className="text-2xl font-semibold numeric">{formatCurrency(resolvedSummary?.totalExpense)}</p>
          </CardContent>
        </Card>
        <Card className="rounded-[18px] border-border">
          <CardContent className="p-4 space-y-2">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">{t("reports.cost.remainingBudget")}</p>
            <p className="text-2xl font-semibold numeric">{formatCurrency(resolvedSummary?.remainingBudget)}</p>
          </CardContent>
        </Card>
        <Card className="rounded-[18px] border-border">
          <CardContent className="p-4 space-y-2">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">{t("reports.cost.costPerExpectedYield")}</p>
            <p className="text-xl font-semibold numeric">{formatCostPerWeightUnit(resolvedSummary?.costPerExpectedKg)}</p>
            <p className="text-xs text-muted-foreground">{t("reports.cost.actual")} {formatCostPerWeightUnit(resolvedSummary?.costPerActualKg)}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <Card className="rounded-[18px] border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Wallet className="w-4 h-4 text-primary" />
              {t("reports.cost.topCostCategories")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {categoryChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <RechartsBarChart data={categoryChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="category" tick={{ fontSize: 12, fill: "var(--muted-foreground)" }} />
                  <YAxis tick={{ fontSize: 12, fill: "var(--muted-foreground)" }} />
                  <RechartsTooltip formatter={(v: number | string) => {
                    const n = Number(v);
                    return formatCurrency(Number.isFinite(n) ? n : null);
                  }} />
                  <Bar dataKey="amount" fill="var(--chart-1)" radius={[6, 6, 0, 0]} />
                </RechartsBarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-muted-foreground">{t("reports.cost.noCategoryData")}</p>
            )}
            <div className="overflow-x-auto rounded-[14px] border border-border">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted hover:bg-muted">
                    <TableHead>{t("reports.cost.categoryHeader")}</TableHead>
                    <TableHead className="text-right">{t("reports.cost.amountHeader")}</TableHead>
                    <TableHead className="text-right">{t("reports.cost.percentOfTotal")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {costCategoryRows.map((row, index) => (
                    <TableRow key={`${row.category ?? "category"}-${index}`}>
                      <TableCell>{row.category || t("reports.cost.uncategorized")}</TableCell>
                      <TableCell className="text-right numeric">{formatCurrency(row.amount)}</TableCell>
                      <TableCell className="text-right numeric">{formatPercent(row.percentageOfTotal)}</TableCell>
                    </TableRow>
                  ))}
                  {costCategoryRows.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center text-muted-foreground">
                        {t("reports.cost.noTopCategories")}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-[18px] border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              {t("reports.cost.warnings")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {warnings.length > 0 ? (
              warnings.map((warning, index) => (
                <div key={`${warning}-${index}`} className="rounded-[14px] border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                  {warning}
                </div>
              ))
            ) : (
              <div className="rounded-[14px] border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                {t("reports.cost.noWarnings")}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-[18px] border-secondary/20 bg-secondary/5">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-secondary" />
            {t("reports.cost.aiTitle")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <Button onClick={onAnalyzeWithAi} disabled={aiLoading}>
              {aiLoading ? t("reports.cost.aiAnalyzing") : t("reports.cost.aiAnalyzeButton")}
            </Button>
            {generatedAtLabel && (
              <Badge variant="outline" className="text-xs">
                {t("reports.cost.generatedAt", { time: generatedAtLabel })}
              </Badge>
            )}
          </div>
          {aiError && (
            <div className="rounded-[14px] border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm text-destructive">
              {aiError}
            </div>
          )}
          {aiSuggestion?.aiSuggestionText ? (
            <div className="rounded-[14px] border border-border bg-card p-4">
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{aiSuggestion.aiSuggestionText}</p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">{t("reports.cost.aiPlaceholder")}</p>
          )}
          <div className="rounded-[14px] border border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
            <strong>{t("reports.cost.disclaimer")}</strong> {disclaimer}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
