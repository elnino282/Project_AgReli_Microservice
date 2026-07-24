import { AlertTriangle, AlertCircle } from "lucide-react";
import { Badge } from "@/shared/ui/badge";
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/shared/ui/table";
import { useI18n } from "@/shared/lib/hooks/useI18n";
import type { PesticideRecord, PesticideStatus } from "../types";

interface PesticideTabProps {
    records: PesticideRecord[];
    getPesticideStatusBadge: (status: PesticideStatus) => {
        className: string;
        label: string;
    };
}

const formatNullableNumber = (value: number | null, digits = 1) =>
    value === null ? "N/A" : value.toFixed(digits);

export function PesticideTab({ records, getPesticideStatusBadge }: PesticideTabProps) {
    const { t } = useI18n();
    const recordsNeedingReview = records.filter((r) => r.status !== "safe").length;

    return (
        <div className="space-y-6">
            <div className="flex items-start justify-between">
                <div>
                    <h3 className="text-lg text-foreground mb-1">{t("reports.pesticide.title")}</h3>
                    <p className="text-sm text-muted-foreground">{t("reports.pesticide.subtitle")}</p>
                </div>
                <Badge className="bg-muted text-muted-foreground border-border">
                    <AlertCircle className="w-3 h-3 mr-1" />
                    {t("reports.pesticide.recordsNeedReview", { count: recordsNeedingReview })}
                </Badge>
            </div>

            <div className="overflow-x-auto rounded-[14px] border border-border">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-muted hover:bg-muted">
                            <TableHead className="text-foreground">{t("reports.pesticide.record")}</TableHead>
                            <TableHead className="text-foreground">{t("reports.pesticide.chemicalNotes")}</TableHead>
                            <TableHead className="text-foreground text-right">{t("reports.pesticide.quantity")}</TableHead>
                            <TableHead className="text-foreground text-right">{t("reports.pesticide.phiDays")}</TableHead>
                            <TableHead className="text-foreground text-right">{t("reports.pesticide.daysRemaining")}</TableHead>
                            <TableHead className="text-foreground">{t("reports.pesticide.status")}</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {records.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={6} className="py-8 text-center text-sm text-muted-foreground">
                                    {t("reports.pesticide.noRecords")}
                                </TableCell>
                            </TableRow>
                        )}
                        {records.map((record) => {
                            const statusBadge = getPesticideStatusBadge(record.status);
                            return (
                                <TableRow key={record.id} className="hover:bg-muted/50">
                                    <TableCell className="numeric text-foreground">{record.lotId}</TableCell>
                                    <TableCell className="text-foreground">
                                        {record.chemical ?? record.notes ?? "N/A"}
                                    </TableCell>
                                    <TableCell className="text-right numeric text-foreground">
                                        {formatNullableNumber(record.quantity)}
                                        {record.unit ? ` ${record.unit}` : ""}
                                    </TableCell>
                                    <TableCell className="text-right numeric text-foreground">
                                        {record.phi ?? "N/A"}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <span
                                            className={`numeric ${record.daysRemaining === null
                                                ? "text-muted-foreground"
                                                : record.daysRemaining < 0
                                                ? "text-destructive"
                                                : record.daysRemaining <= 5
                                                    ? "text-accent"
                                                    : "text-primary"
                                                }`}
                                        >
                                            {record.daysRemaining ?? "N/A"}
                                        </span>
                                    </TableCell>
                                    <TableCell>
                                        <Badge className={statusBadge.className}>
                                            {statusBadge.label}
                                        </Badge>
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
            </div>

            <div className="rounded-[14px] border border-accent/20 bg-accent/5 p-4">
                <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-accent mt-0.5" />
                    <div>
                        <p className="text-sm text-foreground mb-1">{t("reports.pesticide.complianceReminder")}</p>
                        <p className="text-xs text-muted-foreground">{t("reports.pesticide.complianceDescription")}</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
