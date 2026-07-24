import { useEmployeePayrollDetail, useEmployeePayrollRecords } from "@/entities/labor";
import { useI18n } from "@/shared/lib/hooks/useI18n";
import {
  BackButton,
  Button,
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
import { useState } from "react";

const formatDate = (value: string | null | undefined, locale: string) => {
  if (!value) return "-";
  try {
    return new Date(value).toLocaleString(locale);
  } catch {
    return value;
  }
};

const formatMoney = (value: number | null | undefined, locale: string) => {
  if (value === undefined || value === null) return "-";
  return value.toLocaleString(locale);
};

export function EmployeePayrollPage() {
  const { t, locale } = useI18n();
  const [selectedPayrollId, setSelectedPayrollId] = useState<number | null>(null);
  const { data, isLoading } = useEmployeePayrollRecords({ page: 0, size: 200 });
  const {
    data: payrollDetail,
    isLoading: isDetailLoading,
    isError: isDetailError,
  } = useEmployeePayrollDetail(selectedPayrollId);

  const payroll = data?.items ?? [];

  return (
    <div className="p-4 sm:p-6 max-w-[1500px] mx-auto space-y-4">
      <BackButton to="/employee/tasks" className="w-fit" />
      <Card className="rounded-2xl border border-border">
        <CardHeader>
          <CardTitle>{t("employee.payroll.title")}</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">{t("employee.payroll.loading")}</p>
          ) : payroll.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("employee.payroll.empty")}</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("employee.payroll.table.season")}</TableHead>
                  <TableHead>{t("employee.payroll.table.period")}</TableHead>
                  <TableHead>{t("employee.payroll.table.completedTasks")}</TableHead>
                  <TableHead>{t("employee.payroll.table.wagePerTask")}</TableHead>
                  <TableHead>{t("employee.payroll.table.totalAmount")}</TableHead>
                  <TableHead>{t("employee.payroll.table.generatedAt")}</TableHead>
                  <TableHead className="text-right">{t("common.actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payroll.map((record) => (
                  <TableRow key={record.id} className="hover:bg-muted/50 transition-colors">
                    <TableCell>{record.seasonName || t("common.notAvailable")}</TableCell>
                    <TableCell>
                      {record.periodStart || "-"} - {record.periodEnd || "-"}
                    </TableCell>
                    <TableCell>
                      {record.totalCompletedTasks} / {record.totalAssignedTasks}
                    </TableCell>
                    <TableCell>{formatMoney(record.wagePerTask, locale)}</TableCell>
                    <TableCell>{formatMoney(record.totalAmount, locale)}</TableCell>
                    <TableCell>{formatDate(record.generatedAt, locale)}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        type="button"
                        variant="outline"
                        className="min-h-[44px]"
                        onClick={() => setSelectedPayrollId(record.id)}
                      >
                        {t("employee.payroll.actions.viewDetail")}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {selectedPayrollId !== null ? (
        <>
          <BackButton onClick={() => setSelectedPayrollId(null)} className="w-fit" />
          <Card className="rounded-2xl border border-border">
            <CardHeader>
              <CardTitle>{t("employee.payroll.detail.title")}</CardTitle>
            </CardHeader>
            <CardContent>
              {isDetailLoading ? (
                <p className="text-sm text-muted-foreground">{t("employee.payroll.detail.loading")}</p>
              ) : isDetailError ? (
                <p className="text-sm text-destructive">{t("employee.payroll.detail.error")}</p>
              ) : !payrollDetail ? (
                <p className="text-sm text-muted-foreground">{t("employee.payroll.detail.empty")}</p>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <p className="text-xs text-muted-foreground">{t("employee.payroll.detail.season")}</p>
                  <p className="text-sm font-medium">{payrollDetail.seasonName || t("common.notAvailable")}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{t("employee.payroll.detail.employee")}</p>
                  <p className="text-sm font-medium">{payrollDetail.employeeName || t("common.notAvailable")}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{t("employee.payroll.detail.period")}</p>
                  <p className="text-sm font-medium">
                    {payrollDetail.periodStart || "-"} - {payrollDetail.periodEnd || "-"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{t("employee.payroll.detail.taskCompletion")}</p>
                  <p className="text-sm font-medium">
                    {payrollDetail.totalCompletedTasks} / {payrollDetail.totalAssignedTasks}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{t("employee.payroll.detail.wagePerTask")}</p>
                  <p className="text-sm font-medium">{formatMoney(payrollDetail.wagePerTask, locale)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{t("employee.payroll.detail.totalAmount")}</p>
                  <p className="text-sm font-medium">{formatMoney(payrollDetail.totalAmount, locale)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{t("employee.payroll.detail.generatedAt")}</p>
                  <p className="text-sm font-medium">{formatDate(payrollDetail.generatedAt, locale)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{t("employee.payroll.detail.note")}</p>
                  <p className="text-sm font-medium">{payrollDetail.note || t("common.notAvailable")}</p>
                </div>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      ) : null}
    </div>
  );
}
