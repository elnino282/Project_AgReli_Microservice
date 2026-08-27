import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { z } from "zod";
import { Alert, AlertDescription, AlertTitle } from "@/shared/ui/alert";
import { Badge } from "@/shared/ui/badge";
import { BackButton } from "@/shared/ui/back-button";
import { Button } from "@/shared/ui/button";
import { Card, CardContent } from "@/shared/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/shared/ui/form";
import { Input } from "@/shared/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";
import { Textarea } from "@/shared/ui/textarea";
import { useSeasonById } from "@/entities/season";
import {
  useCreateSoilTest,
  useSeasonSoilTests,
  type SoilTestSourceType,
} from "@/entities/soil-test";
import { metricStatusClassName } from "@/features/farmer/dashboard/lib/metrics";
import { useI18n } from "@/shared/lib/hooks/useI18n";
import { AlertCircle, Loader2, TestTubeDiagonal } from "lucide-react";
import { toast } from "sonner";

type Translator = (key: string, optionsOrDefault?: Record<string, unknown> | string) => string;

const createSoilTestFormSchema = (t: Translator) =>
  z.object({
    sampleDate: z.string().min(1, t("seasonSoilWorkspace.validation.sampleDateRequired")),
    soilPh: z.number().min(0).max(14).optional(),
    electricalConductivityDsM: z.number().min(0).optional(),
    soilOrganicMatterPct: z.number().min(0).max(100).optional(),
    mineralNKgPerHa: z
      .number({ required_error: t("seasonSoilWorkspace.validation.mineralNRequired") })
      .min(0, t("seasonSoilWorkspace.validation.nonNegative")),
    nitrateMgPerKg: z.number().min(0).optional(),
    ammoniumMgPerKg: z.number().min(0).optional(),
    sourceType: z.enum(["user_entered", "lab_measured", "external_reference"]),
    sourceDocument: z.string().trim().max(255).optional(),
    labReference: z.string().trim().max(255).optional(),
    note: z.string().trim().max(4000).optional(),
  });

type SoilTestFormSchemaType = ReturnType<typeof createSoilTestFormSchema>;
type SoilTestFormValues = z.infer<SoilTestFormSchemaType>;

const SOURCE_OPTIONS: { value: SoilTestSourceType; labelKey: string; fallbackLabel: string }[] = [
  {
    value: "user_entered",
    labelKey: "seasonSoilWorkspace.form.sourceTypeOptions.userEntered",
    fallbackLabel: "User entered",
  },
  {
    value: "lab_measured",
    labelKey: "seasonSoilWorkspace.form.sourceTypeOptions.labMeasured",
    fallbackLabel: "Lab measured",
  },
  {
    value: "external_reference",
    labelKey: "seasonSoilWorkspace.form.sourceTypeOptions.externalReference",
    fallbackLabel: "External reference",
  },
];

const FORM_INPUT_CLASS_NAME =
  "h-11 rounded-xl border border-input bg-input-background px-4 text-sm shadow-sm placeholder:text-muted-foreground hover:border-primary/50 focus:border-primary focus:ring-2 focus:ring-primary/20 focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20";

const FORM_SELECT_TRIGGER_CLASS_NAME =
  "h-11 rounded-xl border border-input bg-input-background px-4 text-sm shadow-sm data-[placeholder]:text-muted-foreground hover:border-primary/50 focus:border-primary focus:ring-2 focus:ring-primary/20 focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20";

const FORM_TEXTAREA_CLASS_NAME =
  "rounded-xl border border-input bg-input-background px-4 py-3 text-sm shadow-sm placeholder:text-muted-foreground hover:border-primary/50 focus:border-primary focus:ring-2 focus:ring-primary/20 focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20";

const defaultValues = (): SoilTestFormValues => ({
  sampleDate: new Date().toISOString().split("T")[0],
  soilPh: undefined,
  electricalConductivityDsM: undefined,
  soilOrganicMatterPct: undefined,
  mineralNKgPerHa: 0,
  nitrateMgPerKg: undefined,
  ammoniumMgPerKg: undefined,
  sourceType: "user_entered",
  sourceDocument: "",
  labReference: "",
  note: "",
});

const formatDate = (value: string | null | undefined, locale: string) => {
  if (!value) {
    return "-";
  }
  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }
  return parsed.toLocaleDateString(locale);
};

const formatNumber = (value?: number | null, fallback = "-") => {
  if (value === null || value === undefined) {
    return fallback;
  }
  return value.toFixed(4);
};

const toNumberOrUndefined = (raw: string): number | undefined => {
  const parsed = Number.parseFloat(raw);
  return Number.isNaN(parsed) ? undefined : parsed;
};

export function SeasonSoilTestsWorkspace() {
  const { seasonId } = useParams();
  const navigate = useNavigate();
  const { t, locale } = useI18n();
  const seasonIdNumber = Number(seasonId);
  const hasValidSeasonId = Number.isFinite(seasonIdNumber) && seasonIdNumber > 0;
  const [submitMode, setSubmitMode] = useState<"stay" | "dashboard">("stay");

  const formSchema = useMemo(() => createSoilTestFormSchema(t), [t]);
  const form = useForm<SoilTestFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: defaultValues(),
  });

  const { data: seasonDetail, isLoading: isSeasonLoading } = useSeasonById(seasonIdNumber, {
    enabled: hasValidSeasonId,
  });

  const { data: soilTests, isLoading: isListLoading } = useSeasonSoilTests(seasonIdNumber, undefined, {
    enabled: hasValidSeasonId,
  });

  const createMutation = useCreateSoilTest(seasonIdNumber, {
    onSuccess: () => {
      toast.success(t("seasonSoilWorkspace.toast.createSuccess"));
      form.reset({
        ...defaultValues(),
        sourceType: form.getValues("sourceType"),
      });
      if (submitMode === "dashboard") {
        navigate("/farmer/dashboard");
      }
    },
    onError: (error) => {
      toast.error(error.message || t("seasonSoilWorkspace.toast.createError"));
    },
  });

  const plotId = seasonDetail?.plotId ?? null;
  const isSeasonWriteLocked =
    seasonDetail?.status === "COMPLETED"
    || seasonDetail?.status === "CANCELLED"
    || seasonDetail?.status === "ARCHIVED";
  const seasonWriteLockReason = isSeasonWriteLocked
    ? t("seasonSoilWorkspace.alerts.writeLockedDescription")
    : undefined;
  const records = useMemo(() => soilTests ?? [], [soilTests]);

  const getSourceTypeLabel = (value?: string | null) => {
    const option = SOURCE_OPTIONS.find((item) => item.value === value);
    if (!option) return value ?? "N/A";
    return t(option.labelKey, option.fallbackLabel);
  };

  const onSubmit = form.handleSubmit((values) => {
    if (isSeasonWriteLocked) {
      toast.error(seasonWriteLockReason);
      return;
    }
    if (!plotId) {
      toast.error(t("seasonSoilWorkspace.validation.plotRequired"));
      return;
    }

    createMutation.mutate({
      plotId,
      sampleDate: values.sampleDate,
      soilPh: values.soilPh,
      electricalConductivityDsM: values.electricalConductivityDsM,
      soilOrganicMatterPct: values.soilOrganicMatterPct,
      mineralNKgPerHa: values.mineralNKgPerHa,
      nitrateMgPerKg: values.nitrateMgPerKg,
      ammoniumMgPerKg: values.ammoniumMgPerKg,
      sourceType: values.sourceType,
      sourceDocument: values.sourceDocument?.trim() || undefined,
      labReference: values.labReference?.trim() || undefined,
      note: values.note?.trim() || undefined,
    });
  });

  if (!hasValidSeasonId) {
    return (
      <div className="space-y-4">
        <BackButton to="/farmer/seasons" variant="outline" />
        <Card className="border border-destructive/20 bg-destructive/5">
          <CardContent className="p-6 space-y-3">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-destructive mt-0.5" />
              <div className="space-y-2">
                <p className="text-sm text-foreground">{t("seasonWorkspace.invalidSeason")}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-10 max-w-5xl mx-auto">
      {/* Header & Meta Section */}
      <div className="space-y-4 border-b border-border/40 pb-6">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-primary/10 text-primary">
            <TestTubeDiagonal className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-semibold tracking-tight">{t("seasonSoilWorkspace.title")}</h2>
        </div>
        
        {isSeasonLoading ? (
          <div className="text-sm text-muted-foreground flex items-center gap-2 py-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            {t("seasonSoilWorkspace.loadingSeason")}
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-4 bg-muted/30 p-3 rounded-2xl border border-border/40">
            <div className="flex items-center gap-2 px-2">
              <span className="text-xs text-muted-foreground uppercase tracking-wider font-medium">{t("seasonSoilWorkspace.meta.season")}</span>
              <span className="text-sm font-medium">{seasonDetail?.seasonName ?? "-"}</span>
            </div>
            <div className="w-px h-4 bg-border/60 hidden sm:block"></div>
            <div className="flex items-center gap-2 px-2">
              <span className="text-xs text-muted-foreground uppercase tracking-wider font-medium">{t("seasonSoilWorkspace.meta.plot")}</span>
              <span className="text-sm font-medium">{seasonDetail?.plotName ?? "-"}</span>
            </div>
            <div className="w-px h-4 bg-border/60 hidden sm:block"></div>
            <div className="flex items-center gap-2 px-2">
              <span className="text-xs text-muted-foreground uppercase tracking-wider font-medium">{t("seasonSoilWorkspace.meta.crop")}</span>
              <Badge variant="outline" className="text-xs font-normal shadow-none border-border/60 bg-card">
                {seasonDetail?.cropName ?? "-"}
              </Badge>
            </div>
          </div>
        )}
      </div>

      {/* Main Form Section */}
      <section className="space-y-6">
        <div className="space-y-4">
          {!plotId && !isSeasonLoading && (
            <Alert variant="destructive" className="border-destructive/20 bg-destructive/5 rounded-2xl">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>{t("seasonSoilWorkspace.alerts.missingPlotTitle")}</AlertTitle>
              <AlertDescription>{t("seasonSoilWorkspace.alerts.missingPlotDescription")}</AlertDescription>
            </Alert>
          )}

          {isSeasonWriteLocked && (
            <Alert className="rounded-2xl border-amber-300 bg-amber-50">
              <AlertCircle className="h-4 w-4 text-amber-600" />
              <AlertTitle className="text-amber-800">{t("seasonSoilWorkspace.alerts.writeLockedTitle")}</AlertTitle>
              <AlertDescription className="text-amber-700">{seasonWriteLockReason}</AlertDescription>
            </Alert>
          )}

          <Form {...form}>
            <form onSubmit={onSubmit} className="space-y-8" data-testid="soil-test-form">
              <fieldset disabled={isSeasonWriteLocked} className="space-y-8">
                
                {/* Sample Info Block */}
                <div className="p-6 rounded-3xl bg-card border border-border/50 shadow-sm space-y-6">
                  <h3 className="text-sm font-medium uppercase tracking-wider text-muted-foreground border-b border-border/40 pb-2">
                    {t("seasonSoilWorkspace.sections.sampleInfo", "Thông tin lấy mẫu")}
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="soilPh"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Độ pH (0–14)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              max="14"
                              data-testid="soil-ph-input"
                              value={field.value ?? ""}
                              onChange={(event) => field.onChange(toNumberOrUndefined(event.target.value))}
                              placeholder="Ví dụ: 6.20"
                              className={FORM_INPUT_CLASS_NAME}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="electricalConductivityDsM"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Độ dẫn điện EC (dS/m)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="0.0001"
                              min="0"
                              data-testid="soil-ec-input"
                              value={field.value ?? ""}
                              onChange={(event) => field.onChange(toNumberOrUndefined(event.target.value))}
                              placeholder="Ví dụ: 0.4200"
                              className={FORM_INPUT_CLASS_NAME}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="sampleDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("seasonSoilWorkspace.form.sampleDate")} *</FormLabel>
                          <FormControl>
                            <Input
                              type="date"
                              data-testid="soil-sample-date-input"
                              value={field.value}
                              onChange={field.onChange}
                              className={FORM_INPUT_CLASS_NAME}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="sourceType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("seasonSoilWorkspace.form.sourceType")} *</FormLabel>
                          <Select value={field.value} onValueChange={field.onChange}>
                            <FormControl>
                              <SelectTrigger className={FORM_SELECT_TRIGGER_CLASS_NAME}>
                                <SelectValue placeholder={t("seasonSoilWorkspace.form.sourceTypePlaceholder")} />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {SOURCE_OPTIONS.map((item) => (
                                <SelectItem key={item.value} value={item.value} className="rounded-lg cursor-pointer">
                                  {t(item.labelKey, item.fallbackLabel)}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* Soil Metrics Block */}
                <div className="p-6 rounded-3xl bg-card border border-border/50 shadow-sm space-y-6">
                  <h3 className="text-sm font-medium uppercase tracking-wider text-muted-foreground border-b border-border/40 pb-2">
                    {t("seasonSoilWorkspace.sections.soilMetrics", "Chỉ số Đất")}
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="mineralNKgPerHa"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("seasonSoilWorkspace.form.mineralN")} *</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="0.0001"
                              min="0"
                              data-testid="soil-mineral-n-input"
                              value={Number.isFinite(field.value) ? field.value : ""}
                              onChange={(event) => {
                                const nextValue = Number.parseFloat(event.target.value);
                                field.onChange(Number.isNaN(nextValue) ? undefined : nextValue);
                              }}
                              placeholder={t("seasonSoilWorkspace.form.mineralNPlaceholder")}
                              className={FORM_INPUT_CLASS_NAME}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="soilOrganicMatterPct"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("seasonSoilWorkspace.form.soilOrganicMatter")}</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="0.0001"
                              min="0"
                              max="100"
                              data-testid="soil-som-input"
                              value={field.value ?? ""}
                              onChange={(event) => field.onChange(toNumberOrUndefined(event.target.value))}
                              placeholder={t("seasonSoilWorkspace.form.soilOrganicMatterPlaceholder")}
                              className={FORM_INPUT_CLASS_NAME}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="nitrateMgPerKg"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("seasonSoilWorkspace.form.nitrate")}</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="0.0001"
                              min="0"
                              value={field.value ?? ""}
                              onChange={(event) => field.onChange(toNumberOrUndefined(event.target.value))}
                              placeholder={t("seasonSoilWorkspace.form.nitratePlaceholder")}
                              className={FORM_INPUT_CLASS_NAME}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="ammoniumMgPerKg"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("seasonSoilWorkspace.form.ammonium")}</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="0.0001"
                              min="0"
                              value={field.value ?? ""}
                              onChange={(event) => field.onChange(toNumberOrUndefined(event.target.value))}
                              placeholder={t("seasonSoilWorkspace.form.ammoniumPlaceholder")}
                              className={FORM_INPUT_CLASS_NAME}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* References Block */}
                <div className="p-6 rounded-3xl bg-card border border-border/50 shadow-sm space-y-6">
                  <h3 className="text-sm font-medium uppercase tracking-wider text-muted-foreground border-b border-border/40 pb-2">
                    {t("seasonSoilWorkspace.sections.references", "Nguồn dữ liệu & Ghi chú")}
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="sourceDocument"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("seasonSoilWorkspace.form.sourceDocument")}</FormLabel>
                          <FormControl>
                            <Input
                              value={field.value ?? ""}
                              onChange={field.onChange}
                              placeholder={t("seasonSoilWorkspace.form.sourceDocumentPlaceholder")}
                              className={FORM_INPUT_CLASS_NAME}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="labReference"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("seasonSoilWorkspace.form.labReference")}</FormLabel>
                          <FormControl>
                            <Input
                              value={field.value ?? ""}
                              onChange={field.onChange}
                              placeholder={t("seasonSoilWorkspace.form.labReferencePlaceholder")}
                              className={FORM_INPUT_CLASS_NAME}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="note"
                      render={({ field }) => (
                        <FormItem className="md:col-span-2">
                          <FormLabel>{t("seasonSoilWorkspace.form.note")}</FormLabel>
                          <FormControl>
                            <Textarea
                              rows={3}
                              value={field.value ?? ""}
                              onChange={field.onChange}
                              placeholder={t("seasonSoilWorkspace.form.notePlaceholder")}
                              className={FORM_TEXTAREA_CLASS_NAME}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
                  <Button
                    type="submit"
                    variant="outline"
                    data-testid="submit-soil-test-dashboard"
                    disabled={createMutation.isPending || !plotId || isSeasonWriteLocked}
                    onClick={() => setSubmitMode("dashboard")}
                    className="h-12 rounded-xl px-6"
                  >
                    {createMutation.isPending && submitMode === "dashboard" ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : null}
                    {t("seasonSoilWorkspace.actions.saveAndOpenDashboard")}
                  </Button>
                  <Button
                    type="submit"
                    data-testid="submit-soil-test"
                    disabled={createMutation.isPending || !plotId || isSeasonWriteLocked}
                    onClick={() => setSubmitMode("stay")}
                    className="h-12 rounded-xl px-8"
                  >
                    {createMutation.isPending && submitMode === "stay" ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : null}
                    {t("seasonSoilWorkspace.actions.save")}
                  </Button>
                </div>
              </fieldset>
            </form>
          </Form>
        </div>
      </section>

      {/* List Section */}
      <section className="space-y-4 pt-6">
        <div>
          <h3 className="text-lg font-semibold tracking-tight">{t("seasonSoilWorkspace.list.title")}</h3>
          <p className="text-sm text-muted-foreground mt-1">Lịch sử phân tích đất cho mùa vụ này.</p>
        </div>
        
        <div className="rounded-2xl border border-border/50 bg-card shadow-sm overflow-hidden">
          {isListLoading ? (
            <div className="p-12 text-center flex flex-col items-center justify-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground/50" />
              </div>
              <p className="text-sm text-muted-foreground">{t("seasonSoilWorkspace.list.loading")}</p>
            </div>
          ) : records.length === 0 ? (
            <div className="p-12 text-center flex flex-col items-center justify-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center">
                <TestTubeDiagonal className="w-6 h-6 text-muted-foreground/50" />
              </div>
              <p className="text-sm text-muted-foreground">{t("seasonSoilWorkspace.list.empty")}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/30">
                  <tr className="border-b border-border/50 text-muted-foreground">
                    <th className="text-left font-medium py-3 px-4">{t("seasonSoilWorkspace.list.headers.date")}</th>
                    <th className="text-left font-medium py-3 px-4">pH</th>
                    <th className="text-left font-medium py-3 px-4">EC <span className="text-xs font-normal text-muted-foreground">(dS/m)</span></th>
                    <th className="text-left font-medium py-3 px-4">{t("seasonSoilWorkspace.list.headers.mineralN")} <span className="text-xs font-normal text-muted-foreground">(kg/ha)</span></th>
                    <th className="text-left font-medium py-3 px-4">{t("seasonSoilWorkspace.list.headers.soilOrganicMatter")} <span className="text-xs font-normal text-muted-foreground">(%)</span></th>
                    <th className="text-left font-medium py-3 px-4">{t("seasonSoilWorkspace.list.headers.nContribution")} <span className="text-xs font-normal text-muted-foreground">(kg)</span></th>
                    <th className="text-left font-medium py-3 px-4">{t("seasonSoilWorkspace.list.headers.source")}</th>
                    <th className="text-left font-medium py-3 px-4">{t("seasonSoilWorkspace.list.headers.status")}</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map((item) => (
                    <tr key={item.id} className="border-b border-border/40 hover:bg-muted/20 transition-colors">
                      <td className="py-3 px-4 text-muted-foreground">{formatDate(item.sampleDate, locale)}</td>
                      <td className="py-3 px-4 font-medium text-foreground">{item.soilPh?.toFixed(2) ?? "-"}</td>
                      <td className="py-3 px-4 font-medium text-foreground">{formatNumber(item.electricalConductivityDsM)}</td>
                      <td className="py-3 px-4 font-medium text-foreground">{formatNumber(item.mineralNKgPerHa)}</td>
                      <td className="py-3 px-4 font-medium text-foreground">{formatNumber(item.soilOrganicMatterPct)}</td>
                      <td className="py-3 px-4 font-semibold text-primary">{formatNumber(item.estimatedNContributionKg)}</td>
                      <td className="py-3 px-4 text-muted-foreground">{getSourceTypeLabel(item.sourceType)}</td>
                      <td className="py-3 px-4">
                        <Badge className={`${metricStatusClassName(item.status)} font-medium shadow-none`}>{item.status ?? "unavailable"}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
