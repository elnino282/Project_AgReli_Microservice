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
import { AlertCircle } from "lucide-react";

interface EditTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  taskId: number;
  initialData?: any; // We'll type this properly if needed
  onSaveTask: (taskId: number, data: any) => void;
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

export function EditTaskDialog({
  open,
  onOpenChange,
  taskId,
  initialData,
  onSaveTask,
  seasonId,
  hideSeasonSelector = false,
  uniquePlots,
  assigneeOptions,
  workTeamOptions,
  isFormDisabled = false,
  disabledReason,
}: EditTaskDialogProps) {
  const { t } = useI18n();
  const { seasons, activeSeasons, selectedSeasonId } = useSeason();
  const { data: plotsData } = usePlots();

  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [notes, setNotes] = useState("");
  const [selectedSeason, setSelectedSeason] = useState<string>("");
  const [selectedPlot, setSelectedPlot] = useState<string>("");
  const [taskType, setTaskType] = useState("");
  const [assignee, setAssignee] = useState("");
  const [workTeam, setWorkTeam] = useState("");
  const [estimatedDays, setEstimatedDays] = useState<number | "">("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const effectiveSeasonId = seasonId ?? selectedSeasonId ?? null;

  const { data: eligibleAssignees = [], isLoading } = useEligibleAssignees(
    effectiveSeasonId ?? 0,
    { workTeamId: workTeam ? Number(workTeam) : undefined },
    { enabled: open && !!effectiveSeasonId }
  );

  const selectedAssignee = useMemo(
    () => eligibleAssignees.find((a) => String(a.employeeUserId) === assignee),
    [eligibleAssignees, assignee]
  );

  // Get available plots from API - plotsData is an array directly (PlotArrayResponse)
  const availablePlots = plotsData ?? [];
  const [status, setStatus] = useState("");
  const [priority, setPriority] = useState("");

  // Reset form when dialog closes or initialData changes
  useEffect(() => {
    if (open && initialData) {
      setTitle(initialData.title || "");
      setDueDate(initialData.dueDate ? initialData.dueDate.split('T')[0] : "");
      setNotes(initialData.notes || "");
      setSelectedSeason(initialData.seasonId ? String(initialData.seasonId) : (effectiveSeasonId ? String(effectiveSeasonId) : ""));
      setSelectedPlot(initialData.plotId ? String(initialData.plotId) : "");
      setTaskType(initialData.taskType || "");
      setAssignee(initialData.userId ? String(initialData.userId) : "");
      setWorkTeam(initialData.workTeamId ? String(initialData.workTeamId) : "");
      setEstimatedDays(initialData.estimatedDays || "");
      setStatus(initialData.status || "PENDING");
      setPriority(initialData.priority || "normal");
      setErrors({});
    } else if (!open) {
      setErrors({});
    }
  }, [open, initialData, effectiveSeasonId]);

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

    onSaveTask(taskId, {
      title: title.trim(),
      plannedDate: dueDate,
      dueDate,
      description: notes.trim() || undefined,
      seasonId: seasonIdForSubmit ?? undefined,
      plotId: selectedPlot ? Number(selectedPlot) : undefined,
      taskType: taskType || undefined,
      assigneeUserId: assignee ? Number(assignee) : undefined,
      workTeamId: workTeam ? Number(workTeam) : undefined,
      estimatedDays: estimatedDays ? Number(estimatedDays) : undefined,
      status: status || undefined,
      priority: priority || undefined,
      notes: notes.trim() || undefined,
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
    assignee.length > 0 ||
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
          <DialogTitle>{t("tasks.dialog.editTitle", "Chỉnh sửa công việc")}</DialogTitle>
          <DialogDescription>
            Cập nhật thông tin chi tiết của công việc.
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-2">
          {isFormDisabled && (
            <div className="sm:col-span-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
              {disabledReason || "This season is locked. Task write actions are disabled."}
            </div>
          )}
          
          {/* Status */}
          <div className="space-y-2">
            <Label htmlFor="task-status">Trạng thái</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger id="task-status">
                <SelectValue placeholder="Chọn trạng thái" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="PENDING">Chờ xử lý</SelectItem>
                <SelectItem value="IN_PROGRESS">Đang thực hiện</SelectItem>
                <SelectItem value="DONE">Hoàn thành</SelectItem>
                <SelectItem value="OVERDUE">Quá hạn</SelectItem>
                <SelectItem value="CANCELLED">Đã hủy</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Priority */}
          <div className="space-y-2">
            <Label htmlFor="task-priority">Độ ưu tiên</Label>
            <Select value={priority} onValueChange={setPriority}>
              <SelectTrigger id="task-priority">
                <SelectValue placeholder="Chọn độ ưu tiên" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Thấp</SelectItem>
                <SelectItem value="normal">Trung bình</SelectItem>
                <SelectItem value="high">Cao</SelectItem>
              </SelectContent>
            </Select>
          </div>
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

          {/* Assignee */}
          <div className="space-y-2">
            <Label htmlFor="task-assignee">{t("tasks.table.assignee", "Assignee")}</Label>
            <Select value={assignee} onValueChange={setAssignee} disabled={isLoading || eligibleAssignees.length === 0}>
              <SelectTrigger id="task-assignee">
                <SelectValue placeholder={isLoading ? "Loading..." : t("tasks.form.selectAssignee", "Select assignee")} />
              </SelectTrigger>
              <SelectContent>
                {eligibleAssignees.map((employee) => (
                  <SelectItem key={employee.employeeUserId} value={String(employee.employeeUserId)}>
                    <div className="flex items-center justify-between w-full pr-4">
                      <span>
                        {employee.employeeName ||
                          employee.employeeUsername ||
                          employee.employeeEmail ||
                          `Employee #${employee.employeeUserId}`}
                      </span>
                      {employee.isTrained ? (
                        <Badge variant="outline" className="ml-2 text-[10px] h-4 bg-green-50 text-green-700 border-green-200">
                          Đã đào tạo
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="ml-2 text-[10px] h-4 bg-amber-50 text-amber-700 border-amber-200">
                          Chưa đào tạo
                        </Badge>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedAssignee && selectedAssignee.isTrained === false && (
              <div className="flex items-center text-amber-600 text-xs bg-amber-50 p-2 rounded border border-amber-200 mt-2">
                <AlertCircle className="w-4 h-4 mr-1" />
                <span>Nhân viên này chưa qua đào tạo. Bạn có chắc chắn muốn giao việc?</span>
              </div>
            )}
            {!isLoading && eligibleAssignees.length === 0 && (
              <p className="text-xs text-muted-foreground mt-1">
                {t("tasks.dialog.noAssignees", "No assignees available.")}
              </p>
            )}
          </div>

          {/* Work Team */}
          <div className="space-y-2">
            <Label htmlFor="task-work-team">{t("tasks.table.workTeam", "Work Team")}</Label>
            <Select value={workTeam} onValueChange={setWorkTeam}>
              <SelectTrigger id="task-work-team">
                <SelectValue placeholder={t("tasks.form.selectWorkTeam", "Select Work Team")} />
              </SelectTrigger>
              <SelectContent>
                {workTeamOptions?.map((team) => (
                  <SelectItem key={team.id} value={String(team.id)}>
                    {team.teamName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
            {t("common.save", "Lưu thay đổi")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
