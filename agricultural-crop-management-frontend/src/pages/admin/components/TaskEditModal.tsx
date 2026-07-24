import { useI18n } from "@/shared/lib/hooks/useI18n";
import {
  adminTaskApi,
  type AdminTaskUpdateRequest,
} from "@/entities/user/api/api.admin";
import { BackButton } from "@/shared/ui/back-button";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AlertCircle, AlertTriangle, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

interface Task {
  id: number;
  title: string;
  userName: string | null;
  userId: number | null;
  seasonName: string | null;
  seasonId: number | null;
  farmId: number | null;
  farmName: string | null;
  status: string;
  notes: string | null;
}

interface TaskEditModalProps {
  task: Task;
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const TASK_STATUSES = [
  "PENDING",
  "IN_PROGRESS",
  "DONE",
  "OVERDUE",
  "CANCELLED",
];

export function TaskEditModal({
  task,
  open,
  onClose,
  onSuccess,
}: TaskEditModalProps) {
  const { t } = useI18n();
  const queryClient = useQueryClient();

  // Form state
  const [status, setStatus] = useState(task.status);
  const [notes, setNotes] = useState(task.notes || "");
  const [error, setError] = useState<string | null>(null);

  // Track original values to detect changes
  const [originalStatus] = useState(task.status);

  // Check if status is being changed
  const isStatusChanged = status !== originalStatus;
  const isDirty = status !== task.status || notes !== (task.notes || "");

  // Reset form when task changes
  useEffect(() => {
    if (task) {
      setStatus(task.status);
      setNotes(task.notes || "");
      setError(null);
    }
  }, [task]);

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: (data: AdminTaskUpdateRequest) =>
      adminTaskApi.update(task.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "tasks"] });
      onSuccess?.();
      onClose();
    },
    onError: (err: any) => {
      const code = err.response?.data?.code;
      const message =
        err.response?.data?.message || err.message || t("admin.taskEdit.error.updateFailed");

      if (code === "ERR_INVALID_TASK_ASSIGNEE") {
        setError(
          t("admin.taskEdit.error.invalidAssignee"),
        );
      } else {
        setError(message);
      }
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const payload: AdminTaskUpdateRequest = {
      status,
      notes: notes || undefined,
    };

    updateMutation.mutate(payload);
  };
  const handleClose = () => {
    if (
      isDirty &&
      !window.confirm(t("common.unsavedChangesConfirm", "You have unsaved changes. Leave this page?"))
    ) {
      return;
    }

    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={handleClose} />

      {/* Modal */}
      <div className="relative bg-background border border-border rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <BackButton onClick={handleClose} className="w-fit" />
            <h2 className="text-lg font-semibold">{t("admin.taskEdit.title")}</h2>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-4 overflow-y-auto max-h-[calc(90vh-140px)]">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Error Alert */}
            {error && (
              <div className="flex items-start gap-2 p-3 bg-destructive/10 border border-destructive/30 rounded-lg text-destructive">
                <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
                <span className="text-sm">{error}</span>
              </div>
            )}

            {/* Task Info */}
            <div className="p-3 bg-muted/30 rounded-lg space-y-1">
              <div className="text-sm font-medium">{task.title}</div>
              <div className="text-xs text-muted-foreground">
                {t("admin.taskEdit.meta.season", { season: task.seasonName || t("common.notAvailable") })} •{" "}
                {t("admin.taskEdit.meta.farm", { farm: task.farmName || t("common.notAvailable") })}
              </div>
              <div className="text-xs text-muted-foreground">
                {t("admin.taskEdit.meta.assignee", { assignee: task.userName || t("common.notAvailable") })} •{" "}
                {t("admin.taskEdit.meta.status", {
                  status: t(`admin.taskEdit.status.${task.status}`, task.status),
                })}
              </div>
            </div>

            {/* Status Dropdown */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium">{t("common.status")}</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-lg bg-background text-sm"
              >
                {TASK_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {t(`admin.taskEdit.status.${s}`, s.replace("_", " "))}
                  </option>
                ))}
              </select>
            </div>

            {/* Warning when status is changed */}
            {isStatusChanged && (
              <div className="flex items-start gap-2 p-3 bg-amber-100 dark:bg-amber-900/30 border border-amber-300 dark:border-amber-700 rounded-lg text-amber-800 dark:text-amber-300">
                <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
                <div className="text-sm">
                  <strong>{t("admin.taskEdit.statusChange.title")}</strong>{" "}
                  {t("admin.taskEdit.statusChange.description", {
                    from: t(`admin.taskEdit.status.${originalStatus}`, originalStatus),
                    to: t(`admin.taskEdit.status.${status}`, status),
                  })}
                </div>
              </div>
            )}

            {/* Notes */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium">{t("common.notes")}</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-border rounded-lg bg-background text-sm resize-none"
                placeholder={t("admin.taskEdit.notesPlaceholder")}
              />
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-border bg-muted/30">
          <button
            type="button"
            onClick={handleClose}
            disabled={updateMutation.isPending}
            className="px-4 py-2 text-sm border border-border rounded-lg hover:bg-muted/50 disabled:opacity-50"
          >
            {t("common.cancel")}
          </button>
          <button
            type="submit"
            onClick={handleSubmit}
            disabled={updateMutation.isPending}
            className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 inline-flex items-center gap-2"
          >
            {updateMutation.isPending && (
              <Loader2 className="h-4 w-4 animate-spin" />
            )}
            {updateMutation.isPending
              ? t("common.saving")
              : t("common.saveChanges")}
          </button>
        </div>
      </div>
    </div>
  );
}
