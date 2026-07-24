import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card, CardContent } from "@/shared/ui/card";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/shared/ui/tooltip";
import { useI18n } from "@/shared/lib/hooks/useI18n";
import { BackButton } from "@/shared/ui";
import {
    Archive,
    Ban,
    Calendar,
    CheckCircle2,
    Download,
    Edit,
    HelpCircle,
    Play,
    Plus,
} from "lucide-react";
import { Season, SeasonStatus } from "../types";

interface SeasonHeaderProps {
  viewMode: "list" | "detail";
  selectedSeason: Season | null;
  onNewSeason: () => void;
  onExport: () => void;
  onBack: () => void;
  onEdit?: () => void;
  onStartSeason?: (season: Season) => void;
  onCompleteSeason?: (season: Season) => void;
  onCancelSeason?: (season: Season) => void;
  onArchiveSeason?: (season: Season) => void;
  getStatusColor: (status: SeasonStatus) => string;
  getStatusLabel: (status: SeasonStatus) => string;
  formatDateRange: (startDate: string, endDate: string) => string;
}

export function SeasonHeader({
  viewMode,
  selectedSeason,
  onNewSeason,
  onExport,
  onBack,
  onEdit,
  onStartSeason,
  onCompleteSeason,
  onCancelSeason,
  onArchiveSeason,
  getStatusColor,
  getStatusLabel,
  formatDateRange,
}: SeasonHeaderProps) {
  const { t } = useI18n();
  
  if (viewMode === "detail" && selectedSeason) {
    const canStart = selectedSeason.status === "PLANNED";
    const canComplete = selectedSeason.status === "ACTIVE";
    const canCancel =
      selectedSeason.status === "PLANNED" || selectedSeason.status === "ACTIVE";
    const canEdit =
      selectedSeason.status === "PLANNED" || selectedSeason.status === "ACTIVE";
    const canArchive =
      selectedSeason.status === "COMPLETED" ||
      selectedSeason.status === "CANCELLED";
    const effectiveEndDate =
      selectedSeason.endDate ||
      selectedSeason.plannedHarvestDate ||
      selectedSeason.startDate;

    return (
      <div className="mb-6 px-6 py-6 bg-background border-b border-border/40">
        <div className="max-w-[1800px] mx-auto flex flex-col gap-6 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex min-w-0 items-start gap-4">
            <BackButton
              onClick={onBack}
              className="mt-1"
            />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="min-w-0 text-3xl md:text-4xl font-bold tracking-tight text-foreground break-words">{selectedSeason.name}</h1>
                <Badge
                  className={`${getStatusColor(selectedSeason.status)}`}
                >
                  {getStatusLabel(selectedSeason.status)}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                {formatDateRange(
                  selectedSeason.startDate,
                  effectiveEndDate,
                )}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button
              variant="outline"
              onClick={onEdit}
              disabled={!onEdit || !canEdit}
              className="border-border hover:bg-muted"
            >
              <Edit className="w-4 h-4 mr-2" />
              {t('seasons.actions.edit')}
            </Button>
            {canStart && onStartSeason && (
              <Button
                variant="outline"
                onClick={() => onStartSeason(selectedSeason)}
                className="border-border hover:bg-muted"
              >
                <Play className="w-4 h-4 mr-2" />
                {t('seasons.actions.start')}
              </Button>
            )}
            {canComplete && onCompleteSeason && (
              <Button
                onClick={() => onCompleteSeason(selectedSeason)}
                className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm"
              >
                <CheckCircle2 className="w-4 h-4 mr-2" />
                {t('seasons.actions.complete')}
              </Button>
            )}
            {canCancel && onCancelSeason && (
              <Button
                variant="destructive"
                onClick={() => onCancelSeason(selectedSeason)}
                className="bg-destructive/10 text-destructive hover:bg-destructive hover:text-destructive-foreground shadow-none"
              >
                <Ban className="w-4 h-4 mr-2" />
                {t('seasons.actions.cancel')}
              </Button>
            )}
            {canArchive && onArchiveSeason && (
              <Button
                variant="outline"
                onClick={() => onArchiveSeason(selectedSeason)}
                className="border-border hover:bg-muted"
              >
                <Archive className="w-4 h-4 mr-2" />
                {t('seasons.actions.archive')}
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mb-6 px-6 py-6 bg-background border-b border-border/40">
      <div className="max-w-[1800px] mx-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex-shrink-0">
          <h1 className="text-3xl md:text-4xl font-bold text-foreground flex items-center gap-3 tracking-tight">
            <Calendar className="w-8 h-8 text-emerald-600" />
            {t('seasons.pageTitle')}
          </h1>
          <p className="text-sm text-muted-foreground mt-2">
            {t('seasons.subtitle')}
          </p>
        </div>

        <div className="flex items-center gap-3 flex-shrink-0">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                >
                  <HelpCircle className="w-5 h-5 text-muted-foreground" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{t('seasons.help')}</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <Button
            variant="outline"
            onClick={onExport}
            className="border-border hover:bg-muted"
          >
            <Download className="w-4 h-4 mr-2" />
            {t('seasons.actions.export')}
          </Button>

          <Button
            className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm"
            onClick={onNewSeason}
          >
            <Plus className="w-4 h-4 mr-2" />
            {t('seasons.createButton')}
          </Button>
        </div>
      </div>
    </div>
  );
}
