import { useI18n } from "@/shared/lib/hooks/useI18n";
import { usePreferences } from "@/shared/contexts";
import { convertWeight, getWeightUnitLabel, useDebounce } from "@/shared/lib";
import {
    AsyncState,
    Badge,
    Button,
    Card,
    CardContent,
    ConfirmDialog,
    DataTablePagination,
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    Input,
    Label,
    PageContainer,
    PageHeader,
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/shared/ui";
import {
    keepPreviousData,
    useMutation,
    useQuery,
    useQueryClient,
} from "@tanstack/react-query";
import { Calendar, Plus, Search, CheckCircle2, AlertCircle, Award, RefreshCw } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { farmsApi } from "@/entities/farm/api/farmsApi";
import { seasonsApi } from "@/entities/season/api/seasonsApi";
import type { SeasonListParams as SeasonSearchParams } from "@/entities/season/model/types";

function SeasonHarvestSafetyBadge({ seasonId }: { seasonId: number }) {
  const { data: activePHI } = useQuery({
    queryKey: ["season-phi", seasonId],
    queryFn: () => seasonsApi.getActivePHI(seasonId),
  });

  if (!activePHI) return null;

  const hasActivePHI = activePHI.length > 0;
  if (hasActivePHI) {
    return (
      <Badge className="bg-[var(--portal-status-estimated-bg)] text-[var(--portal-status-estimated-fg)] border-[var(--portal-status-estimated-border)] text-[10px] py-0 px-1.5 rounded">
        Cách ly BVTV ({activePHI.length})
      </Badge>
    );
  }

  return (
    <Badge className="bg-[var(--portal-status-measured-bg)] text-[var(--portal-status-measured-fg)] border-[var(--portal-status-measured-border)] text-[10px] py-0 px-1.5 rounded">
      An toàn thu hoạch
    </Badge>
  );
}

function HarvestSafetyWidget({ seasons }: { seasons: any[] }) {
  const activeSeasons = seasons.filter(s => s.status === "ACTIVE");
  const [selectedSeasonId, setSelectedSeasonId] = useState<number | null>(
    activeSeasons.length > 0 ? activeSeasons[0].id : null
  );

  useEffect(() => {
    if (activeSeasons.length > 0 && !selectedSeasonId) {
      setSelectedSeasonId(activeSeasons[0].id);
    }
  }, [activeSeasons, selectedSeasonId]);

  const { data: activePHI, isLoading } = useQuery({
    queryKey: ['season-phi', selectedSeasonId],
    queryFn: () => seasonsApi.getActivePHI(selectedSeasonId!),
    enabled: !!selectedSeasonId,
  });

  if (activeSeasons.length === 0) return null;

  const currentSeason = activeSeasons.find(s => s.id === selectedSeasonId);
  const hasActivePHI = activePHI && activePHI.length > 0;

  return (
    <Card className="mb-6 border-[var(--portal-border-subtle)] rounded-[var(--radius-xl)] shadow-sm overflow-hidden bg-gradient-to-r from-[var(--portal-status-measured-bg)] to-[var(--portal-surface)]">
      <CardContent className="p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 border-b border-[var(--border)] pb-3">
          <div>
            <h3 className="text-sm font-bold text-[var(--foreground)] flex items-center gap-1.5">
              <Award className="w-4.5 h-4.5 text-[var(--success)]" />
              Giám sát An toàn Thu hoạch (PHI Safety)
            </h3>
            <p className="text-[11px] text-[var(--muted-foreground)]">Kiểm tra thời gian cách ly thuốc BVTV trước khi thu hoạch</p>
          </div>
          
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold text-[var(--foreground)]">Chọn vụ mùa active:</span>
            <select
              className="text-[11px] border border-[var(--border)] rounded-lg p-1.5 bg-[var(--background)] font-medium focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
              value={selectedSeasonId || ""}
              onChange={(e) => setSelectedSeasonId(Number(e.target.value))}
            >
              {activeSeasons.map(s => (
                <option key={s.id} value={s.id}>{s.seasonName}</option>
              ))}
            </select>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center gap-2 text-[var(--muted-foreground)] text-xs py-2">
            <RefreshCw className="w-3.5 h-3.5 animate-spin text-[var(--muted-foreground)]" /> Đang tải thông tin cách ly...
          </div>
        ) : !selectedSeasonId ? (
          <div className="text-xs text-[var(--muted-foreground)]">Chưa chọn vụ mùa nào.</div>
        ) : !hasActivePHI ? (
          <div className="flex items-start gap-3 bg-[var(--portal-status-measured-bg)] border border-[var(--portal-status-measured-border)] p-4.5 rounded-[var(--radius-xl)] text-[var(--portal-status-measured-fg)]">
            <CheckCircle2 className="w-5 h-5 text-[var(--success)] shrink-0 mt-0.5" />
            <div>
              <h4 className="text-xs font-bold text-[var(--success-foreground)]">Đã hết thời gian cách ly - An toàn thu hoạch</h4>
              <p className="text-[11px] text-[var(--success-foreground)] mt-1 leading-relaxed">
                Vụ mùa <strong className="font-semibold">{currentSeason?.seasonName}</strong> không còn thuốc BVTV nào trong thời gian cách ly. Bạn có thể tiến hành thu hoạch bình thường và đảm bảo VietGAP.
              </p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-3 bg-[var(--portal-status-estimated-bg)] border border-[var(--portal-status-estimated-border)] p-4.5 rounded-[var(--radius-xl)] text-[var(--portal-status-estimated-fg)]">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-[var(--warning)] shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold text-[var(--warning-foreground)]">Cảnh báo: Đang trong thời gian cách ly (PHI)</h4>
                <p className="text-[11px] text-[var(--warning-foreground)] mt-1 leading-relaxed">
                  Vụ mùa <strong className="font-semibold">{currentSeason?.seasonName}</strong> còn {activePHI.length} hoạt chất thuốc BVTV chưa hết thời gian cách ly bắt buộc.
                </p>
              </div>
            </div>
            
            <div className="border-t border-[var(--portal-status-estimated-border)] pt-3 mt-1 sm:pl-8 space-y-2">
              <div className="text-[11px] text-[var(--warning-foreground)] font-semibold">
                Danh sách hoạt chất đang cách ly:
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {activePHI.map((phi: any, idx: number) => (
                  <div key={idx} className="bg-[var(--background)] p-2 rounded-lg border border-[var(--portal-status-estimated-border)] text-xs flex justify-between items-center shadow-sm">
                    <div>
                      <span className="font-semibold text-[var(--foreground)] block">{phi.pesticideName || phi.activeIngredient}</span>
                      <span className="text-[10px] text-[var(--muted-foreground)]">Hoạt chất: {phi.activeIngredient}</span>
                    </div>
                    <span className="text-[var(--destructive)] font-bold bg-[var(--destructive)]/10 px-2 py-0.5 rounded text-[10px] border border-[var(--destructive)]/20">
                      Đến {phi.harvestAllowedDate}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function SeasonsPage() {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const { preferences } = usePreferences();
  const unitLabel = getWeightUnitLabel(preferences.weightUnit);
  const formatYieldValue = (valueKg?: number | null) => {
    if (valueKg == null) return "-";
    const converted = convertWeight(valueKg, preferences.weightUnit);
    const maximumFractionDigits = preferences.weightUnit === "G" ? 0 : 2;
    return new Intl.NumberFormat(preferences.locale, {
      maximumFractionDigits,
    }).format(converted);
  };
  const [filters, setFilters] = useState<SeasonSearchParams>({
    page: 0,
    size: 20,
  });
  const [searchInput, setSearchInput] = useState("");
  const debouncedSearch = useDebounce(searchInput, 300);

  // Dialog states
  const [startConfirmOpen, setStartConfirmOpen] = useState(false);
  const [cancelConfirmOpen, setCancelConfirmOpen] = useState(false);
  const [completeDialogOpen, setCompleteDialogOpen] = useState(false);
  const [selectedSeasonId, setSelectedSeasonId] = useState<number | null>(null);
  const [endDate, setEndDate] = useState(
    new Date().toISOString().split("T")[0],
  );

  // Fetch seasons with keepPreviousData to prevent empty flash
  const {
    data: seasonsData,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["seasons", { ...filters, q: debouncedSearch || undefined }],
    queryFn: () =>
      seasonsApi.searchSeasons({ ...filters, q: debouncedSearch || undefined } as any),
    placeholderData: keepPreviousData,
  });

  // Fetch farms for filter
  const { data: farms } = useQuery({
    queryKey: ["farms"],
    queryFn: () => farmsApi.getMyFarms(),
  });

  // Query key helper
  const currentQueryKey = [
    "seasons",
    { ...filters, q: debouncedSearch || undefined },
  ];

  // Start season mutation with optimistic update
  const startSeasonMutation = useMutation({
    mutationFn: (id: number) => seasonsApi.startSeason(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ["seasons"] });
      const previousSeasons = queryClient.getQueryData(currentQueryKey);

      // Optimistic update: change status to ACTIVE
      queryClient.setQueryData(currentQueryKey, (old: any) =>
        old
          ? {
              ...old,
              content: old.content?.map((s: any) =>
                s.id === id ? { ...s, status: "ACTIVE" } : s,
              ),
            }
          : old,
      );
      return { previousSeasons };
    },
    onError: (_err, _id, context: any) => {
      if (context?.previousSeasons) {
        queryClient.setQueryData(currentQueryKey, context.previousSeasons);
      }
      toast.error(t('seasons.toast.startError'));
    },
    onSuccess: () => {
      toast.success(t('seasons.toast.startSuccess'));
      setStartConfirmOpen(false);
      setSelectedSeasonId(null);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["seasons"] });
    },
  });

  // Complete season mutation with optimistic update
  const completeSeasonMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) =>
      seasonsApi.completeSeason(id, data),
    onMutate: async ({ id }) => {
      await queryClient.cancelQueries({ queryKey: ["seasons"] });
      const previousSeasons = queryClient.getQueryData(currentQueryKey);

      queryClient.setQueryData(currentQueryKey, (old: any) =>
        old
          ? {
              ...old,
              content: old.content?.map((s: any) =>
                s.id === id ? { ...s, status: "COMPLETED" } : s,
              ),
            }
          : old,
      );
      return { previousSeasons };
    },
    onError: (error: any, _variables, context: any) => {
      if (context?.previousSeasons) {
        queryClient.setQueryData(currentQueryKey, context.previousSeasons);
      }
      toast.error(error.response?.data?.message || t('seasons.toast.completeError'));
    },
    onSuccess: () => {
      toast.success(t('seasons.toast.completeSuccess'));
      setCompleteDialogOpen(false);
      setSelectedSeasonId(null);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["seasons"] });
    },
  });

  // Cancel season mutation with optimistic update
  const cancelSeasonMutation = useMutation({
    mutationFn: (id: number) => seasonsApi.cancelSeason(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ["seasons"] });
      const previousSeasons = queryClient.getQueryData(currentQueryKey);

      queryClient.setQueryData(currentQueryKey, (old: any) =>
        old
          ? {
              ...old,
              content: old.content?.map((s: any) =>
                s.id === id ? { ...s, status: "CANCELLED" } : s,
              ),
            }
          : old,
      );
      return { previousSeasons };
    },
    onError: (_err, _id, context: any) => {
      if (context?.previousSeasons) {
        queryClient.setQueryData(currentQueryKey, context.previousSeasons);
      }
      toast.error(t('seasons.toast.cancelError'));
    },
    onSuccess: () => {
      toast.success(t('seasons.toast.cancelSuccess'));
      setCancelConfirmOpen(false);
      setSelectedSeasonId(null);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["seasons"] });
    },
  });

  const getStatusBadge = (status: string) => {
    const variants: Record<
      string,
      "default" | "secondary" | "destructive" | "outline"
    > = {
      PLANNED: "outline",
      ACTIVE: "default",
      COMPLETED: "secondary",
      CANCELLED: "destructive",
      ARCHIVED: "secondary",
    };
    return <Badge variant={variants[status] || "default"}>{status}</Badge>;
  };

  const handleOpenStartConfirm = (id: number) => {
    setSelectedSeasonId(id);
    setStartConfirmOpen(true);
  };

  const handleStartSeason = () => {
    if (selectedSeasonId) {
      startSeasonMutation.mutate(selectedSeasonId);
    }
  };

  const handleOpenCompleteDialog = (id: number) => {
    setSelectedSeasonId(id);
    setEndDate(new Date().toISOString().split("T")[0]);
    setCompleteDialogOpen(true);
  };

  const handleCompleteSeason = () => {
    if (selectedSeasonId && endDate) {
      completeSeasonMutation.mutate({
        id: selectedSeasonId,
        data: { endDate, forceComplete: true },
      });
    }
  };

  const handleOpenCancelConfirm = (id: number) => {
    setSelectedSeasonId(id);
    setCancelConfirmOpen(true);
  };

  const handleCancelSeason = () => {
    if (selectedSeasonId) {
      cancelSeasonMutation.mutate(selectedSeasonId);
    }
  };

  const seasons = seasonsData?.content ?? [];
  const totalElements = seasonsData?.totalElements ?? 0;
  const totalPages = seasonsData?.totalPages ?? 0;

  return (
    <PageContainer>
      <div className="mb-6">
        <PageHeader
          icon={<Calendar className="w-8 h-8" />}
          title={t('seasons.title')}
          subtitle={t('seasons.subtitle')}
          actions={
            <Button className="min-h-[44px] shadow-sm transition-all duration-200 hover:scale-[1.02] hover:shadow-md active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ring-offset-background">
              <Plus className="w-4 h-4 mr-2" />
              {t('seasons.createButton')}
            </Button>
          }
        />
      </div>

      <HarvestSafetyWidget seasons={seasons} />

      {/* Filters */}
      <Card className="mb-6 border border-border rounded-xl shadow-sm">
        <CardContent className="px-6 py-4">
          <div className="flex flex-wrap items-center justify-start gap-4">
            <div className="relative w-[320px]">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder={t('seasons.searchPlaceholder')}
                className="pl-10 rounded-xl border-border focus:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ring-offset-background"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
              />
            </div>

            <Select
              value={filters.farmId?.toString() || "all"}
              onValueChange={(value) =>
                setFilters((prev) => ({
                  ...prev,
                  farmId: value === "all" ? undefined : parseInt(value),
                  page: 0,
                }))
              }
            >
              <SelectTrigger className="rounded-xl border-border w-[180px]">
                <SelectValue placeholder={t('seasons.filters.allFarms')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('seasons.filters.allFarms')}</SelectItem>
                {farms?.map((farm: any) => (
                  <SelectItem key={farm.id} value={farm.id.toString()}>
                    {farm.farmName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={filters.status || "all"}
              onValueChange={(value) =>
                setFilters((prev) => ({
                  ...prev,
                  status: value === "all" ? undefined : (value as any),
                  page: 0,
                }))
              }
            >
              <SelectTrigger className="rounded-xl border-border w-[180px]">
                <SelectValue placeholder={t('seasons.filters.allStatuses')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('seasons.filters.allStatuses')}</SelectItem>
                <SelectItem value="PLANNED">{t('seasons.status.planned')}</SelectItem>
                <SelectItem value="ACTIVE">{t('seasons.status.active')}</SelectItem>
                <SelectItem value="COMPLETED">{t('seasons.status.completed')}</SelectItem>
                <SelectItem value="CANCELLED">{t('seasons.status.cancelled')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Seasons Table */}
      <Card>
        <CardContent className="px-6 py-4">
          <AsyncState
            isLoading={isLoading}
            isEmpty={seasons.length === 0}
            error={error as Error | null}
            onRetry={() => refetch()}
            loadingText={t('seasons.loading')}
            emptyIcon={<Calendar className="w-6 h-6 text-[#777777]" />}
            emptyTitle={t('seasons.empty.title')}
            emptyDescription={t('seasons.empty.description')}
            emptyAction={
              <Button className="min-h-[44px] mt-2 shadow-sm transition-all duration-200 hover:scale-[1.02] hover:shadow-md active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ring-offset-background">
                <Plus className="w-4 h-4 mr-2" />
                {t('seasons.createButton')}
              </Button>
            }
          >
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('seasons.table.name')}</TableHead>
                    <TableHead>{t('seasons.table.crop')}</TableHead>
                    <TableHead>{t('seasons.table.plot')}</TableHead>
                    <TableHead>{t('seasons.table.startDate')}</TableHead>
                    <TableHead>{t('seasons.table.status')}</TableHead>
                    <TableHead>{t('seasons.table.expectedYield')} ({unitLabel})</TableHead>
                    <TableHead className="text-right">{t('seasons.table.actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {seasons.map((season: any) => (
                    <TableRow key={season.id}>
                      <TableCell className="font-medium">
                        {season.seasonName}
                      </TableCell>
                      <TableCell>
                        {season.cropName || `Crop ${season.cropId}`}
                      </TableCell>
                      <TableCell>
                        {season.plotName || `Plot ${season.plotId}`}
                      </TableCell>
                      <TableCell>{season.startDate}</TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1.5 items-start">
                          {getStatusBadge(season.status)}
                          {season.status === "ACTIVE" && (
                            <SeasonHarvestSafetyBadge seasonId={season.id} />
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {formatYieldValue(season.expectedYieldKg)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          {season.status === "PLANNED" && (
                            <Button
                              size="sm"
                              onClick={() => handleOpenStartConfirm(season.id)}
                              disabled={startSeasonMutation.isPending}
                              className="min-h-[44px] shadow-sm transition-all duration-200 hover:scale-[1.02] hover:shadow-md active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ring-offset-background"
                            >
                              {t('seasons.actions.start')}
                            </Button>
                          )}
                          {season.status === "ACTIVE" && (
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() =>
                                handleOpenCompleteDialog(season.id)
                              }
                              disabled={completeSeasonMutation.isPending}
                              className="min-h-[44px] shadow-sm transition-all duration-200 hover:scale-[1.02] hover:shadow-md active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ring-offset-background"
                            >
                              {t('seasons.actions.complete')}
                            </Button>
                          )}
                          {(season.status === "PLANNED" ||
                            season.status === "ACTIVE") && (
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleOpenCancelConfirm(season.id)}
                              disabled={cancelSeasonMutation.isPending}
                              className="min-h-[44px] shadow-sm transition-all duration-200 hover:scale-[1.02] hover:shadow-md active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive focus-visible:ring-offset-2 ring-offset-background"
                            >
                              {t('seasons.actions.cancel')}
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            {totalPages > 0 && (
              <DataTablePagination
                currentPage={filters.page ?? 0}
                totalPages={totalPages}
                totalItems={totalElements}
                pageSize={filters.size ?? 20}
                onPageChange={(page) =>
                  setFilters((prev) => ({ ...prev, page }))
                }
                onPageSizeChange={(size) =>
                  setFilters((prev) => ({ ...prev, size, page: 0 }))
                }
              />
            )}
          </AsyncState>
        </CardContent>
      </Card>

      {/* Start Season Confirmation Dialog */}
      <ConfirmDialog
        open={startConfirmOpen}
        onOpenChange={setStartConfirmOpen}
        title={t('seasons.dialog.startTitle')}
        description={t('seasons.dialog.startDescription')}
        confirmText={t('seasons.dialog.startConfirm')}
        onConfirm={handleStartSeason}
        isLoading={startSeasonMutation.isPending}
      />

      {/* Cancel Season Confirmation Dialog */}
      <ConfirmDialog
        open={cancelConfirmOpen}
        onOpenChange={setCancelConfirmOpen}
        title={t('seasons.dialog.cancelTitle')}
        description={t('seasons.dialog.cancelDescription')}
        confirmText={t('seasons.dialog.cancelConfirm')}
        variant="destructive"
        onConfirm={handleCancelSeason}
        isLoading={cancelSeasonMutation.isPending}
      />

      {/* Complete Season Dialog with Date Input */}
      <Dialog open={completeDialogOpen} onOpenChange={setCompleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('seasons.dialog.completeTitle')}</DialogTitle>
            <DialogDescription>
              {t('seasons.dialog.completeDescription')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="endDate">{t('seasons.dialog.endDateLabel')}</Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="endDate"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCompleteDialogOpen(false)}
              disabled={completeSeasonMutation.isPending}
            >
              {t('common.cancel')}
            </Button>
            <Button
              onClick={handleCompleteSeason}
              disabled={completeSeasonMutation.isPending || !endDate}
            >
              {completeSeasonMutation.isPending
                ? t('seasons.dialog.completing')
                : t('seasons.dialog.completeConfirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}
