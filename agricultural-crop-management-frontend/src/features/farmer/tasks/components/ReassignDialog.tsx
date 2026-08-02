import { Button } from "@/shared/ui/button";
import { Label } from "@/shared/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui";
import { useTranslation } from "react-i18next";
import { useEffect, useState, useMemo } from "react";

import { useEligibleAssignees } from "@/entities/task/api/hooks";
import { Badge } from "@/shared/ui/badge";
import { AlertCircle } from "lucide-react";
interface ReassignDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedCount: number;
  onReassign: (assigneeUserId: number) => void;
  seasonId?: number;
  disabled?: boolean;
  disabledReason?: string;
}

export function ReassignDialog({
  open,
  onOpenChange,
  selectedCount,
  onReassign,
  seasonId = 0,
  disabled = false,
  disabledReason,
}: ReassignDialogProps) {
  const { t } = useTranslation();
  const [selectedAssigneeId, setSelectedAssigneeId] = useState("");

  const { data: eligibleAssignees = [], isLoading } = useEligibleAssignees(seasonId, undefined, { enabled: open && seasonId > 0 });

  const selectedAssignee = useMemo(
    () => eligibleAssignees.find((a) => String(a.employeeUserId) === selectedAssigneeId),
    [eligibleAssignees, selectedAssigneeId]
  );

  useEffect(() => {
    if (!open) {
      setSelectedAssigneeId("");
    }
  }, [open]);

  const handleReassign = () => {
    const assigneeUserId = Number(selectedAssigneeId);
    if (!Number.isFinite(assigneeUserId) || assigneeUserId <= 0) {
      return;
    }
    onReassign(assigneeUserId);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{t("tasks.dialog.reassignTitle")}</DialogTitle>
          <DialogDescription>
            {t("tasks.dialog.reassignDescription", { count: selectedCount })}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {disabled && (
            <div className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
              {disabledReason || t("tasks.dialog.reassignLocked")}
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="bulk-reassign-assignee" required>
              {t("tasks.form.assignee")}
            </Label>
            <Select
              disabled={disabled || isLoading || eligibleAssignees.length === 0}
              value={selectedAssigneeId}
              onValueChange={setSelectedAssigneeId}
            >
              <SelectTrigger id="bulk-reassign-assignee">
                <SelectValue placeholder={isLoading ? "Loading..." : t("tasks.form.selectAssignee")} />
              </SelectTrigger>
              <SelectContent>
                {eligibleAssignees.map((assignee) => (
                  <SelectItem key={assignee.employeeUserId} value={String(assignee.employeeUserId)}>
                    <div className="flex items-center justify-between w-full pr-4">
                      <span>
                        {assignee.employeeName ||
                          assignee.employeeUsername ||
                          assignee.employeeEmail ||
                          `Employee #${assignee.employeeUserId}`}
                      </span>
                      {assignee.isTrained ? (
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
          </div>
          {selectedAssignee && selectedAssignee.isTrained === false && (
            <div className="flex items-center text-amber-600 text-xs bg-amber-50 p-2 rounded border border-amber-200">
              <AlertCircle className="w-4 h-4 mr-1" />
              <span>{t("tasks.dialog.untrainedWarning", "Nhân viên này chưa qua đào tạo. Bạn có chắc chắn muốn giao việc?")}</span>
            </div>
          )}
          {seasonId <= 0 && (
            <div className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
              <AlertCircle className="w-4 h-4 inline mr-1" />
              {t("tasks.dialog.noSeason")}
            </div>
          )}
          {seasonId > 0 && !isLoading && eligibleAssignees.length === 0 && (
            <p className="text-xs text-muted-foreground">
              {t("tasks.dialog.noAssignees")}
            </p>
          )}
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            {t("common.cancel")}
          </Button>
          <Button
            onClick={handleReassign}
            disabled={disabled || !selectedAssigneeId}
            title={disabled ? disabledReason : undefined}
          >
            {t("tasks.dialog.reassignSubmit")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
