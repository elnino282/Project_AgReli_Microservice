import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";
import { Textarea } from "@/shared/ui/textarea";
import {
  BackButton,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui";
import { useEffect, useState, useMemo } from "react";
import { useSeason } from "@/shared/contexts/SeasonContext";
import { usePlots } from "@/entities/plot";
import { useI18n } from "@/shared/lib/hooks/useI18n";
import { useEligibleAssignees } from "@/entities/task/api/hooks";
import { Badge } from "@/shared/ui/badge";
import { AlertCircle, ChevronDown } from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/shared/ui/radio-group";
import { Checkbox } from "@/shared/ui/checkbox";
import { ScrollArea } from "@/shared/ui/scroll-area";
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/ui/popover";

interface CreateTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreateTask: (data: {
    title: string;
    plannedDate: string;
    dueDate: string;
    description?: string;
    seasonId?: number;
    plotId?: number;
    taskType?: string;
    assigneeUserIds?: number[];
    workTeamIds?: number[];
    estimatedDays?: number;
  }) => void;
  seasonId?: number;
  hideSeasonSelector?: boolean;
  uniquePlots: string[];
  assigneeOptions: Array<{
    userId: number;
    displayName: string;
  }>;
  workTeamOptions?: Array<{
    id: number;
    teamName: string;
  }>;
  isFormDisabled?: boolean;
  disabledReason?: string;
}

export function CreateTaskDialog({
  open,
  onOpenChange,
  onCreateTask,
  seasonId,
  hideSeasonSelector = false,
  uniquePlots,
  assigneeOptions,
  workTeamOptions,
  isFormDisabled = false,
  disabledReason,
}: CreateTaskDialogProps) {
  const { t } = useI18n();
  const { seasons, activeSeasons, selectedSeasonId } = useSeason();
  const { data: plotsData } = usePlots();

  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [notes, setNotes] = useState("");
  const [selectedSeason, setSelectedSeason] = useState<string>("");
  const [selectedPlot, setSelectedPlot] = useState<string>("");
  const [taskType, setTaskType] = useState("");
  const [assigneeType, setAssigneeType] = useState<"employee" | "team">("employee");
  const [assignees, setAssignees] = useState<string[]>([]);
  const [workTeams, setWorkTeams] = useState<string[]>([]);
  const [estimatedDays, setEstimatedDays] = useState<number | "">("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const effectiveSeasonId = seasonId ?? selectedSeasonId ?? null;

  const { data: eligibleAssignees = [], isLoading } = useEligibleAssignees(
    effectiveSeasonId ?? 0,
    { workTeamId: undefined },
    { enabled: open && !!effectiveSeasonId && assigneeType === "employee" }
  );

  const hasUntrainedSelected = useMemo(
    () => eligibleAssignees.some((a) => assignees.includes(String(a.employeeUserId)) && a.isTrained === false),
    [eligibleAssignees, assignees]
  );

  // Get available plots from API - plotsData is an array directly (PlotArrayResponse)
  const availablePlots = plotsData ?? [];

  // Reset form when dialog closes
  useEffect(() => {
    if (!open) {
      setTitle("");
      setDueDate("");
      setNotes("");
      setSelectedSeason("");
      setSelectedPlot("");
      setTaskType("");
      setAssigneeType("employee");
      setAssignees([]);
      setWorkTeams([]);
      setEstimatedDays("");
      setErrors({});
    } else {
      // Pre-select the currently active season if available
      if (effectiveSeasonId) {
        setSelectedSeason(String(effectiveSeasonId));
      }
    }
  }, [open, effectiveSeasonId]);

  // Validate form before submission
  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!title.trim()) {
      newErrors.title = t("tasks.validation.titleRequired", "Title is required");
    }

    const seasonIdForSubmit = hideSeasonSelector
      ? effectiveSeasonId
      : (selectedSeason ? Number(selectedSeason) : effectiveSeasonId);

    if (!seasonIdForSubmit) {
      newErrors.season = t("tasks.validation.seasonRequired", "Season is required");
    }

    if (!dueDate) {
      newErrors.dueDate = t("tasks.validation.dueDateRequired", "Due date is required");
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (isFormDisabled) return;
    if (!validateForm()) return;
    const seasonIdForSubmit = hideSeasonSelector
      ? effectiveSeasonId
      : (selectedSeason ? Number(selectedSeason) : effectiveSeasonId);

    onCreateTask({
      title: title.trim(),
      plannedDate: dueDate,
      dueDate,
      description: notes.trim() || undefined,
      seasonId: seasonIdForSubmit ?? undefined,
      plotId: selectedPlot ? Number(selectedPlot) : undefined,
      taskType: taskType || undefined,
      assigneeUserIds: assigneeType === "employee" && assignees.length > 0 ? assignees.map(Number) : undefined,
      workTeamIds: assigneeType === "team" && workTeams.length > 0 ? workTeams.map(Number) : undefined,
      estimatedDays: estimatedDays ? Number(estimatedDays) : undefined,
    });
  };

  // Use active seasons for dropdown, fallback to all seasons
  const availableSeasons = activeSeasons.length > 0 ? activeSeasons : seasons;
  const lockedSeasonLabel = availableSeasons.find((season) => season.id === effectiveSeasonId)?.seasonName;
  const isDirty =
    title.trim().length > 0 ||
    dueDate.length > 0 ||
    notes.trim().length > 0 ||
    selectedPlot.length > 0 ||
    taskType.length > 0 ||
    assignees.length > 0 ||
    workTeams.length > 0 ||
    (!hideSeasonSelector && selectedSeason.length > 0);
  const confirmMessage = t(
    "common.unsavedChangesConfirm",
    "You have unsaved changes. Leave this page?",
  );

  const closeWithConfirm = () => {
    if (isDirty && !window.confirm(confirmMessage)) return;
    onOpenChange(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (nextOpen) {
          onOpenChange(true);
          return;
        }
        closeWithConfirm();
      }}
    >
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <BackButton onClick={closeWithConfirm} className="w-fit" />
          <DialogTitle>{t("tasks.dialog.createTitle", "Create New Task")}</DialogTitle>
          <DialogDescription>
            {t("tasks.dialog.createDescription", "Add a new task to the workspace")}
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-2">
          {isFormDisabled && (
            <div className="sm:col-span-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
              {disabledReason || "This season is locked. Task write actions are disabled."}
            </div>
          )}
          {/* Task Title */}
          <div className="sm:col-span-2 space-y-2">
            <Label htmlFor="task-title" required>{t("tasks.form.title", "Task Title")}</Label>
            <Input
              id="task-title"
              placeholder={t("tasks.form.titlePlaceholder", "e.g., Irrigate Plot A3")}
              aria-invalid={!!errors.title}
              aria-describedby={errors.title ? "task-title-error" : undefined}
              value={title}
              onChange={(event) => setTitle(event.target.value)}
            />
            {errors.title && (
              <p id="task-title-error" className="text-sm text-destructive">{errors.title}</p>
            )}
          </div>

          {/* Season */}
          <div className="space-y-2">
            <Label htmlFor="task-season" required>{t("tasks.table.season", "Season")}</Label>
            {hideSeasonSelector ? (
              <div className="rounded-md border border-border px-3 py-2 text-sm bg-muted/30">
                {lockedSeasonLabel ?? (effectiveSeasonId ? `Mùa vụ #${effectiveSeasonId}` : t("tasks.form.selectSeason", "Select season"))}
              </div>
            ) : (
              <Select value={selectedSeason} onValueChange={setSelectedSeason}>
                <SelectTrigger
                  id="task-season"
                  aria-invalid={!!errors.season}
                  aria-describedby={errors.season ? "task-season-error" : undefined}
                >
                  <SelectValue placeholder={t("tasks.form.selectSeason", "Select season")} />
                </SelectTrigger>
                <SelectContent>
                  {availableSeasons.map((season) => (
                    <SelectItem key={season.id} value={String(season.id)}>
                      {season.seasonName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {errors.season && (
              <p id="task-season-error" className="text-sm text-destructive">{errors.season}</p>
            )}
          </div>

          {/* Plot Selector */}
          <div className="space-y-2">
            <Label htmlFor="task-plot">{t("tasks.table.plot", "Plot")}</Label>
            <Select value={selectedPlot} onValueChange={setSelectedPlot}>
              <SelectTrigger id="task-plot">
                <SelectValue placeholder={t("tasks.form.selectPlot", "Select plot")} />
              </SelectTrigger>
              <SelectContent>
                {availablePlots.map((plot) => (
                  <SelectItem key={plot.id} value={String(plot.id)}>
                    {plot.plotName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Task Type */}
          <div className="space-y-2">
            <Label htmlFor="task-type">{t("tasks.table.type", "Task Type")}</Label>
            <Select value={taskType} onValueChange={setTaskType}>
              <SelectTrigger id="task-type">
                <SelectValue placeholder={t("tasks.form.selectType", "Select type")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="irrigation">{t("tasks.types.irrigation", "Irrigation")}</SelectItem>
                <SelectItem value="fertilizing">{t("tasks.types.fertilizing", "Fertilizing")}</SelectItem>
                <SelectItem value="spraying">{t("tasks.types.spraying", "Spraying")}</SelectItem>
                <SelectItem value="scouting">{t("tasks.types.scouting", "Scouting")}</SelectItem>
                <SelectItem value="harvesting">{t("tasks.types.harvesting", "Harvesting")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Assignee Selection */}
          <div className="sm:col-span-2 space-y-4">
            <Label>{t("tasks.table.assignee", "Người thực hiện")}</Label>
            
            <RadioGroup 
              value={assigneeType} 
              onValueChange={(val) => setAssigneeType(val as "employee" | "team")}
              className="flex items-center gap-6"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="employee" id="type-employee" />
                <Label htmlFor="type-employee" className="font-normal cursor-pointer">Cá nhân (không theo đội nhóm)</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="team" id="type-team" />
                <Label htmlFor="type-team" className="font-normal cursor-pointer">Đội nhóm (Work Team)</Label>
              </div>
            </RadioGroup>

            {assigneeType === "employee" && (
              <div className="space-y-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" role="combobox" className="w-full justify-between bg-background font-normal border-input h-10">
                      <span className="truncate">
                        {isLoading ? "Loading..." : assignees.length > 0 ? `Đã chọn ${assignees.length} nhân sự` : t("tasks.form.selectAssignee", "Chọn người thực hiện")}
                      </span>
                      <ChevronDown className="h-4 w-4 opacity-50 shrink-0" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                    <ScrollArea className="h-64 rounded-md">
                      <div className="p-2 flex flex-col gap-1">
                        {eligibleAssignees.map((employee) => {
                          const id = String(employee.employeeUserId);
                          const isChecked = assignees.includes(id);
                          return (
                            <div 
                              key={id} 
                              className="flex items-center justify-between space-x-2 p-2 hover:bg-muted/50 rounded-sm cursor-pointer"
                              onClick={() => {
                                setAssignees(prev => prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id]);
                              }}
                            >
                              <div className="flex items-center space-x-3 truncate">
                                <Checkbox checked={isChecked} onCheckedChange={(c) => {
                                  setAssignees(prev => c ? [...prev, id] : prev.filter(a => a !== id));
                                }} />
                                <span className="truncate text-sm">
                                  {employee.employeeName || employee.employeeUsername || employee.employeeEmail || `Employee #${id}`}
                                </span>
                              </div>
                              {employee.isTrained ? (
                                <Badge variant="outline" className="text-[10px] h-4 bg-green-50 text-green-700 border-green-200 shrink-0">
                                  Đã đào tạo
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-[10px] h-4 bg-amber-50 text-amber-700 border-amber-200 shrink-0">
                                  Chưa đào tạo
                                </Badge>
                              )}
                            </div>
                          );
                        })}
                        {!isLoading && eligibleAssignees.length === 0 && (
                          <div className="p-2 text-sm text-muted-foreground text-center">
                            {t("tasks.dialog.noAssignees", "No assignees available.")}
                          </div>
                        )}
                      </div>
                    </ScrollArea>
                  </PopoverContent>
                </Popover>

                {hasUntrainedSelected && (
                  <div className="flex items-center text-amber-600 text-xs bg-amber-50 p-2 rounded border border-amber-200 mt-2">
                    <AlertCircle className="w-4 h-4 mr-1 shrink-0" />
                    <span>Có nhân viên chưa qua đào tạo được chọn. Bạn có chắc chắn muốn giao việc?</span>
                  </div>
                )}
              </div>
            )}

            {assigneeType === "team" && (
              <div className="space-y-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" role="combobox" className="w-full justify-between bg-background font-normal border-input h-10">
                      <span className="truncate">
                        {workTeams.length > 0 ? `Đã chọn ${workTeams.length} đội nhóm` : t("tasks.form.selectWorkTeam", "Select Work Team")}
                      </span>
                      <ChevronDown className="h-4 w-4 opacity-50 shrink-0" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                    <ScrollArea className="max-h-64 rounded-md">
                      <div className="p-2 flex flex-col gap-1">
                        {workTeamOptions?.map((team) => {
                          const id = String(team.id);
                          const isChecked = workTeams.includes(id);
                          return (
                            <div 
                              key={id} 
                              className="flex items-center space-x-3 p-2 hover:bg-muted/50 rounded-sm cursor-pointer"
                              onClick={() => {
                                setWorkTeams(prev => prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]);
                              }}
                            >
                              <Checkbox checked={isChecked} onCheckedChange={(c) => {
                                setWorkTeams(prev => c ? [...prev, id] : prev.filter(t => t !== id));
                              }} />
                              <span className="truncate text-sm">{team.teamName}</span>
                            </div>
                          );
                        })}
                        {(!workTeamOptions || workTeamOptions.length === 0) && (
                          <div className="p-2 text-sm text-muted-foreground text-center">
                            Không có đội nhóm nào.
                          </div>
                        )}
                      </div>
                    </ScrollArea>
                  </PopoverContent>
                </Popover>
              </div>
            )}
          </div>

          {/* Estimated Days */}
          <div className="space-y-2">
            <Label htmlFor="task-estimated-days">{t("tasks.form.estimatedDays", "Estimated Days")}</Label>
            <Input
              id="task-estimated-days"
              type="number"
              min={1}
              value={estimatedDays}
              onChange={(e) => setEstimatedDays(e.target.value ? Number(e.target.value) : "")}
              placeholder="e.g., 2"
            />
          </div>

          {/* Due Date */}
          <div className="space-y-2">
            <Label htmlFor="task-due-date" required>{t("tasks.table.dueDate", "Due Date")}</Label>
            <Input
              id="task-due-date"
              type="date"
              aria-invalid={!!errors.dueDate}
              aria-describedby={errors.dueDate ? "task-due-date-error" : undefined}
              value={dueDate}
              onChange={(event) => setDueDate(event.target.value)}
            />
            {errors.dueDate && (
              <p id="task-due-date-error" className="text-sm text-destructive">{errors.dueDate}</p>
            )}
          </div>

          {/* Notes */}
          <div className="sm:col-span-2 space-y-2">
            <Label htmlFor="task-notes">{t("common.notes", "Notes")}</Label>
            <Textarea
              id="task-notes"
              placeholder={t("tasks.form.notesPlaceholder", "Additional task details...")}
              rows={3}
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={closeWithConfirm}
          >
            {t("common.cancel", "Cancel")}
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isFormDisabled}
            title={isFormDisabled ? disabledReason : undefined}
          >
            {t("tasks.createButton", "Create Task")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
