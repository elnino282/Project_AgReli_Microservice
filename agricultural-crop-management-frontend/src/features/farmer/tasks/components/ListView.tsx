import { Edit, Trash2, Check, MoreVertical, Paperclip, Users, Calendar } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { Badge } from "@/shared/ui/badge";
import { Checkbox } from "@/shared/ui/checkbox";
import { Avatar, AvatarFallback } from "@/shared/ui/avatar";
import { useI18n } from "@/shared/lib/hooks/useI18n";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu";
import { Card, CardContent } from "@/shared/ui/card";
import type { Task } from "../types";
import { TASK_TYPES, STATUS_COLORS, STATUS_LABELS } from "../constants";

interface ListViewProps {
  tasks: Task[];
  selectedTasks: string[];
  onSelectAll: (checked: boolean) => void;
  onSelectTask: (taskId: string, checked: boolean) => void;
  onEdit?: (taskId: string) => void;
  onComplete?: (taskId: string) => void;
  onReassign?: (taskId: string) => void;
  onChangeDueDate?: (taskId: string) => void;
  onDelete: (taskId: string) => void;
  disableMutations?: boolean;
}

export function ListView({
  tasks,
  selectedTasks,
  onSelectAll,
  onSelectTask,
  onEdit,
  onComplete,
  onReassign,
  onChangeDueDate,
  onDelete,
  disableMutations = false,
}: ListViewProps) {
  const { t, locale } = useI18n();

  return (
    <Card className="border-border acm-rounded-lg acm-card-shadow">
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-b border-border bg-muted">
                <TableHead className="w-12">
                  <Checkbox
                    checked={tasks.length > 0 && tasks.every((task) => selectedTasks.includes(task.id))}
                    onCheckedChange={onSelectAll}
                    disabled={disableMutations}
                  />
                </TableHead>
                <TableHead className="font-semibold text-foreground">{t("tasks.table.title")}</TableHead>
                <TableHead className="font-semibold text-foreground">{t("tasks.table.type")}</TableHead>
                <TableHead className="font-semibold text-foreground">{t("tasks.table.cropPlot", "Crop / Plot")}</TableHead>
                <TableHead className="font-semibold text-foreground">{t("tasks.table.assignee")}</TableHead>
                <TableHead className="font-semibold text-foreground">{t("tasks.table.dueDate")}</TableHead>
                <TableHead className="font-semibold text-foreground">{t("tasks.table.status")}</TableHead>
                <TableHead className="font-semibold text-foreground">{t("tasks.table.attachments", "Attachments")}</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tasks.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-12 text-muted-foreground">
                    {t("tasks.empty.title")}
                  </TableCell>
                </TableRow>
              ) : (
                tasks.map((task) => {
                  const taskType = TASK_TYPES[task.type];
                  const TaskIcon = taskType.icon;
                  const taskColor = taskType.color;

                  return (
                    <TableRow key={task.id} className="border-b border-border hover:bg-muted/50">
                      <TableCell>
                        <Checkbox
                          checked={selectedTasks.includes(task.id)}
                          onCheckedChange={(checked) => onSelectTask(task.id, checked as boolean)}
                          disabled={disableMutations}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="text-sm text-foreground">{task.title}</div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <TaskIcon className="w-4 h-4" style={{ color: taskColor }} />
                          <span className="text-sm text-muted-foreground">
                            {t(taskType.labelKey, taskType.fallbackLabel)}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <Badge className="bg-primary/10 text-primary border-primary/20 w-fit acm-rounded-sm text-xs">
                            {task.crop}
                          </Badge>
                          <span className="text-xs text-muted-foreground">{task.plot}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Avatar className="h-6 w-6">
                            <AvatarFallback className="text-xs bg-primary/10 text-primary">
                              {task.assigneeInitials}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-sm text-muted-foreground">{task.assignee}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          {new Date(task.dueDate).toLocaleDateString(locale)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge className={`${STATUS_COLORS[task.status]} acm-rounded-sm`}>
                          {t(STATUS_LABELS[task.status].labelKey, STATUS_LABELS[task.status].fallbackLabel)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {task.attachments > 0 ? (
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Paperclip className="w-4 h-4" />
                            <span className="numeric">{task.attachments}</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 w-7 p-0"
                              disabled={disableMutations}
                            >
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="acm-rounded-sm">
                            <DropdownMenuItem 
                              className="cursor-pointer" 
                              disabled={disableMutations}
                              onClick={() => !disableMutations && onEdit?.(task.id)}
                            >
                              <Edit className="w-4 h-4 mr-2" />
                              {t("common.edit")}
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              className="cursor-pointer" 
                              disabled={disableMutations || task.status === 'completed'}
                              onClick={() => !disableMutations && onComplete?.(task.id)}
                            >
                              <Check className="w-4 h-4 mr-2" />
                              {t("tasks.actions.complete")}
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              className="cursor-pointer" 
                              disabled={disableMutations}
                              onClick={() => !disableMutations && onReassign?.(task.id)}
                            >
                              <Users className="w-4 h-4 mr-2" />
                              {t("tasks.actions.reassign")}
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              className="cursor-pointer" 
                              disabled={disableMutations}
                              onClick={() => !disableMutations && onChangeDueDate?.(task.id)}
                            >
                              <Calendar className="w-4 h-4 mr-2" />
                              {t("tasks.actions.changeDueDate")}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="cursor-pointer text-destructive"
                              onClick={() => !disableMutations && onDelete(task.id)}
                              disabled={disableMutations}
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              {t("common.delete")}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
