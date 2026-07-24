import {
    LineChart, Line, XAxis, YAxis, CartesianGrid,
    Tooltip as RechartsTooltip, ResponsiveContainer, Legend,
} from "recharts";
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/shared/ui/table";
import { useI18n } from "@/shared/lib/hooks/useI18n";
import type { TaskPerformance } from "../types";

interface PerformanceTabProps {
    data: TaskPerformance[];
}

export function PerformanceTab({ data }: PerformanceTabProps) {
    const { t } = useI18n();

    return (
        <div className="space-y-6">
            <div>
                <h3 className="text-lg text-foreground mb-1">{t("reports.performance.title")}</h3>
                <p className="text-sm text-muted-foreground">{t("reports.performance.subtitle")}</p>
            </div>

            <ResponsiveContainer width="100%" height={300}>
                <LineChart data={data}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="month" tick={{ fontSize: 12, fill: "var(--muted-foreground)" }} />
                    <YAxis tick={{ fontSize: 12, fill: "var(--muted-foreground)" }} />
                    <RechartsTooltip />
                    <Legend />
                    <Line
                        type="monotone"
                        dataKey="onTime"
                        stroke="var(--primary)"
                        strokeWidth={3}
                        name={t("reports.performance.onTimeTasks")}
                        dot={{ fill: "var(--primary)", r: 5 }}
                    />
                </LineChart>
            </ResponsiveContainer>

            <div className="mt-6">
                <h4 className="text-sm text-foreground mb-4">{t("reports.performance.taskStatusBreakdown")}</h4>
                <div className="overflow-x-auto rounded-[14px] border border-border">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-muted hover:bg-muted">
                                <TableHead className="text-foreground">{t("reports.performance.month")}</TableHead>
                                <TableHead className="text-foreground text-right">{t("reports.performance.onTime")}</TableHead>
                                <TableHead className="text-foreground text-right">{t("reports.performance.late")}</TableHead>
                                <TableHead className="text-foreground text-right">{t("reports.performance.overdue")}</TableHead>
                                <TableHead className="text-foreground text-right">{t("reports.performance.total")}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {data.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={5} className="py-8 text-center text-sm text-muted-foreground">
                                        {t("reports.performance.noData")}
                                    </TableCell>
                                </TableRow>
                            )}
                            {data.map((record) => {
                                const total = record.onTime + record.late + record.overdue;
                                return (
                                    <TableRow key={record.month}>
                                        <TableCell className="text-foreground">{record.month}</TableCell>
                                        <TableCell className="text-right">
                                            <span className="text-primary numeric">{record.onTime}</span>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <span className="text-accent numeric">{record.late}</span>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <span className="text-destructive numeric">{record.overdue}</span>
                                        </TableCell>
                                        <TableCell className="text-right numeric text-foreground">{total}</TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </div>
            </div>
        </div>
    );
}
