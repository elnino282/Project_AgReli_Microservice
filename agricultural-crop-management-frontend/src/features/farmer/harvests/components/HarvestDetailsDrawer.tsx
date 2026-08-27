import {
    Wheat,
    QrCode,
    Printer,
    Image as ImageIcon,
    ClipboardCheck,
    Link as LinkIcon,
    FileText,
    PackageCheck,
} from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/shared/ui";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Button } from "@/shared/ui/button";
import { BackButton } from "@/shared/ui/back-button";
import { Badge } from "@/shared/ui/badge";
import type { HarvestBatch, HarvestGrade, HarvestStatus } from "../types";
import { usePreferences } from "@/shared/contexts";
import { formatWeight } from "@/shared/lib";
import { useI18n } from "@/shared/lib/hooks/useI18n";

interface HarvestDetailsDialogProps {
    batch: HarvestBatch | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onAction: (action: string, batch: HarvestBatch) => void;
    getStatusBadge: (status?: HarvestStatus | null) => JSX.Element | null;
    getGradeBadge: (grade?: HarvestGrade | null) => JSX.Element;
}

export function HarvestDetailsDialog({
    batch,
    open,
    onOpenChange,
    onAction,
    getStatusBadge,
    getGradeBadge,
}: HarvestDetailsDialogProps) {
    const { preferences } = usePreferences();
    const { t } = useI18n();

    if (!batch) return null;

    const notAvailable = t("common.notAvailable", "—");
    const visibleNotes = batch.notes?.split("[harvest-metadata]")[0].trim();
    const hasAdvancedQuality = Boolean(
        batch.qualityGrade
        || batch.qualityNotes
        || batch.grossWetWeight != null
        || batch.netDryWeight != null
        || batch.packagingType
        || batch.processingType,
    );

    return (
        <Dialog
            open={open}
            onOpenChange={(nextOpen) => {
                if (!nextOpen) {
                    onOpenChange(false);
                }
            }}
        >
            <DialogContent
                className="w-full sm:max-w-[500px] sm:max-h-[85vh] overflow-y-auto"
            >
                <DialogHeader>
                    <BackButton onClick={() => onOpenChange(false)} className="w-fit" />
                    <DialogTitle className="flex items-center gap-2 text-foreground">
                        <Wheat className="w-5 h-5 text-primary" />
                        {t("harvests.details.title")}
                    </DialogTitle>
                    <DialogDescription className="text-sm text-muted-foreground">
                        {batch.batchId}
                    </DialogDescription>
                </DialogHeader>

                <div className="mt-6 space-y-6">
                    <div className="w-full h-48 rounded-xl bg-muted/30 border-2 border-dashed border-border flex items-center justify-center">
                        <div className="text-center">
                            <ImageIcon className="w-12 h-12 mx-auto mb-2 text-muted-foreground" />
                            <p className="text-sm text-muted-foreground">{t("harvests.details.noPhoto")}</p>
                        </div>
                    </div>

                    <Card className="border-border rounded-xl">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm text-foreground">
                                {t("harvests.details.basicInformation")}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-muted-foreground">{t("harvests.table.columns.date")}</span>
                                <span className="text-sm text-foreground">
                                    {new Date(batch.date).toLocaleDateString(preferences.locale, {
                                        month: "long",
                                        day: "numeric",
                                        year: "numeric",
                                    })}
                                </span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-muted-foreground">{t("harvests.details.quantity")}</span>
                                <span className="numeric text-foreground">
                                    {formatWeight(batch.quantity, preferences.weightUnit, preferences.locale)}
                                </span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-muted-foreground">{t("harvests.table.columns.grade")}</span>
                                {getGradeBadge(batch.grade)}
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-muted-foreground">{t("harvests.addBatch.fields.moisture")}</span>
                                {typeof batch.moisture === "number" ? (
                                    <span className="numeric text-foreground">
                                        {batch.moisture.toFixed(1)}%
                                    </span>
                                ) : (
                                    <span className="text-sm text-muted-foreground">{notAvailable}</span>
                                )}
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-muted-foreground">{t("harvests.table.columns.status")}</span>
                                {getStatusBadge(batch.status) ?? (
                                    <span className="text-sm text-muted-foreground">{notAvailable}</span>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    {batch.qcMetrics && (
                        <Card className="border-border rounded-xl">
                            <CardHeader className="pb-3">
                                <CardTitle className="text-sm text-foreground flex items-center gap-2">
                                    <ClipboardCheck className="w-4 h-4 text-primary" />
                                    {t("harvests.details.qualityControl")}
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-muted-foreground">{t("harvests.addBatch.fields.purity")}</span>
                                    <span className="numeric text-primary">
                                        {batch.qcMetrics.purity.toFixed(1)}%
                                    </span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-muted-foreground">{t("harvests.addBatch.fields.foreignMatter")}</span>
                                    <span className="numeric text-foreground">
                                        {batch.qcMetrics.foreignMatter.toFixed(1)}%
                                    </span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-muted-foreground">{t("harvests.addBatch.fields.brokenGrains")}</span>
                                    <span className="numeric text-foreground">
                                        {batch.qcMetrics.brokenGrains.toFixed(1)}%
                                    </span>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {hasAdvancedQuality && (
                        <Card className="border-border rounded-xl">
                            <CardHeader className="pb-3">
                                <CardTitle className="text-sm text-foreground flex items-center gap-2">
                                    <PackageCheck className="w-4 h-4 text-primary" />
                                    {t("harvests.details.advancedQuality", "Advanced quality & packaging")}
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <div className="flex items-center justify-between gap-4">
                                    <span className="text-sm text-muted-foreground">
                                        {t("harvests.addBatch.fields.qualityGrade", "Quality grade")}
                                    </span>
                                    <span className="text-sm text-foreground">{batch.qualityGrade || notAvailable}</span>
                                </div>
                                <div className="flex items-center justify-between gap-4">
                                    <span className="text-sm text-muted-foreground">
                                        {t("harvests.addBatch.fields.grossWetWeight", "Gross wet weight")}
                                    </span>
                                    <span className="numeric text-foreground">
                                        {batch.grossWetWeight != null ? `${batch.grossWetWeight.toLocaleString(preferences.locale)} kg` : notAvailable}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between gap-4">
                                    <span className="text-sm text-muted-foreground">
                                        {t("harvests.details.netDryWeight", "Net dry weight")}
                                    </span>
                                    <span className="numeric text-foreground">
                                        {batch.netDryWeight != null ? `${batch.netDryWeight.toLocaleString(preferences.locale)} kg` : notAvailable}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between gap-4">
                                    <span className="text-sm text-muted-foreground">
                                        {t("harvests.addBatch.fields.packagingType", "Packaging")}
                                    </span>
                                    <span className="text-sm text-foreground">
                                        {batch.packagingType
                                            ? `${batch.packagingType}${batch.packagingCount != null ? ` (${batch.packagingCount})` : ""}`
                                            : notAvailable}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between gap-4">
                                    <span className="text-sm text-muted-foreground">
                                        {t("harvests.addBatch.fields.processingType", "Processing")}
                                    </span>
                                    <span className="text-sm text-foreground">{batch.processingType || notAvailable}</span>
                                </div>
                                {batch.qualityNotes && (
                                    <div className="border-t border-border pt-3">
                                        <p className="text-sm text-muted-foreground">{batch.qualityNotes}</p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    )}

                    {batch.linkedSale && (
                        <Card className="border-border rounded-xl">
                            <CardHeader className="pb-3">
                                <CardTitle className="text-sm text-foreground flex items-center gap-2">
                                    <LinkIcon className="w-4 h-4 text-secondary" />
                                    {t("harvests.details.linkedSale")}
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-muted-foreground">{t("harvests.details.saleReference")}</span>
                                    <Badge className="bg-secondary/10 text-secondary border-secondary/20">
                                        {batch.linkedSale}
                                    </Badge>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {visibleNotes && (
                        <Card className="border-border rounded-xl">
                            <CardHeader className="pb-3">
                                <CardTitle className="text-sm text-foreground flex items-center gap-2">
                                    <FileText className="w-4 h-4 text-muted-foreground" />
                                    {t("common.notes")}
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">{visibleNotes}</p>
                            </CardContent>
                        </Card>
                    )}

                    <div className="space-y-2">
                        <Button
                            variant="outline"
                            className="w-full justify-start rounded-xl border-border"
                            onClick={() => onAction("qr", batch)}
                        >
                            <QrCode className="w-4 h-4 mr-2" />
                            {t("harvests.details.generateQrCode")}
                        </Button>
                        <Button
                            variant="outline"
                            className="w-full justify-start rounded-xl border-border"
                            onClick={() => onAction("handover", batch)}
                        >
                            <Printer className="w-4 h-4 mr-2" />
                            {t("harvests.details.printHandoverNote")}
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
