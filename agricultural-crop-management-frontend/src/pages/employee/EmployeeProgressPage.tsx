import { useEmployeeProgressLogs } from "@/entities/labor";
import {
  BackButton,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/ui";
import { useI18n } from "@/shared/lib/hooks/useI18n";
import { useMemo } from "react";

const formatDate = (value: string | null | undefined, locale: string) => {
  if (!value) return "-";
  try {
    return new Date(value).toLocaleString(locale);
  } catch {
    return value;
  }
};

export function EmployeeProgressPage() {
  const { t, locale } = useI18n();
  const { data, isLoading } = useEmployeeProgressLogs({ page: 0, size: 200 });
  const logs = data?.items ?? [];

  const logsBySeason = useMemo(() => {
    const grouped = new Map<string, { seasonName: string; logs: typeof logs }>();
    logs.forEach((log) => {
      const key = log.seasonId ? String(log.seasonId) : "no-season";
      const seasonName = log.seasonName || t("employee.common.unassignedSeason");
      const existing = grouped.get(key);
      if (existing) {
        existing.logs.push(log);
      } else {
        grouped.set(key, { seasonName, logs: [log] });
      }
    });
    return Array.from(grouped.values()).sort((a, b) => a.seasonName.localeCompare(b.seasonName));
  }, [logs, t]);

  return (
    <div className="p-4 sm:p-6 max-w-[1500px] mx-auto space-y-4">
      <BackButton to="/employee/tasks" className="w-fit" />
      <Card className="rounded-2xl border border-border">
        <CardHeader>
          <CardTitle>{t("employee.progress.title")}</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">{t("employee.progress.loading")}</p>
          ) : logs.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("employee.progress.empty")}</p>
          ) : (
            <div className="space-y-6">
              {logsBySeason.map((group) => (
                <div key={group.seasonName} className="space-y-2">
                  <h3 className="text-sm font-semibold text-foreground">{group.seasonName}</h3>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t("employee.progress.table.task")}</TableHead>
                        <TableHead>{t("employee.progress.table.progress")}</TableHead>
                        <TableHead>{t("employee.progress.table.note")}</TableHead>
                        <TableHead>{t("employee.progress.table.loggedAt")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {group.logs.map((log) => (
                        <TableRow key={log.id} className="hover:bg-muted/50 transition-colors">
                          <TableCell>
                            {log.taskTitle || t("employee.common.taskFallback", { id: log.taskId })}
                          </TableCell>
                          <TableCell>{log.progressPercent}%</TableCell>
                          <TableCell className="max-w-[240px] sm:max-w-[360px] truncate">{log.note || "-"}</TableCell>
                          <TableCell>{formatDate(log.loggedAt, locale)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
