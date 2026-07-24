import { Download, Loader2, FileSpreadsheet, FileText, FileDown } from "lucide-react";
import {
    Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter,
} from "@/shared/ui/dialog";
import { Button } from "@/shared/ui/button";
import { Label } from "@/shared/ui/label";
import { Switch } from "@/shared/ui/switch";
import { Separator } from "@/shared/ui/separator";
import { useI18n } from "@/shared/lib/hooks/useI18n";
import type { ExportFormat } from "../types";

interface ExportModalProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    isExporting: boolean;
    exportFormat: ExportFormat;
    onExportFormatChange: (format: ExportFormat) => void;
    includeCharts: boolean;
    onIncludeChartsChange: (include: boolean) => void;
    includeNotes: boolean;
    onIncludeNotesChange: (include: boolean) => void;
    onExport: () => void;
}

export function ExportModal({
    isOpen, onOpenChange, isExporting, exportFormat,
    onExportFormatChange, includeCharts, onIncludeChartsChange,
    includeNotes, onIncludeNotesChange, onExport,
}: ExportModalProps) {
    const { t } = useI18n();
    const formatOptions = [
        { value: "excel" as ExportFormat, icon: FileSpreadsheet, label: "Excel" },
        { value: "pdf" as ExportFormat, icon: FileText, label: "PDF" },
        { value: "csv" as ExportFormat, icon: FileDown, label: "CSV" },
    ];

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-foreground">
                        <Download className="w-5 h-5 text-primary" />
                        {t("reports.export.title")}
                    </DialogTitle>
                    <DialogDescription className="text-sm text-muted-foreground">
                        {t("reports.export.description")}
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    <div className="space-y-3">
                        <Label className="text-foreground">{t("reports.export.fileType")}</Label>
                        <div className="grid grid-cols-3 gap-3">
                            {formatOptions.map((option) => {
                                const Icon = option.icon;
                                return (
                                    <button
                                        key={option.value}
                                        onClick={() => onExportFormatChange(option.value)}
                                        className={`flex flex-col items-center gap-2 rounded-[14px] border-2 p-4 transition-all ${
                                            exportFormat === option.value
                                                ? "border-primary bg-primary/5"
                                                : "border-border hover:border-primary/50"
                                        }`}
                                    >
                                        <Icon className={`w-8 h-8 ${
                                            exportFormat === option.value ? "text-primary" : "text-muted-foreground"
                                        }`} />
                                        <span className="text-xs text-foreground">{option.label}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    <Separator className="bg-border" />

                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <Label htmlFor="include-charts" className="text-foreground">
                                {t("reports.export.includeCharts")}
                            </Label>
                            <Switch id="include-charts" checked={includeCharts} onCheckedChange={onIncludeChartsChange} />
                        </div>
                        <div className="flex items-center justify-between">
                            <Label htmlFor="include-notes" className="text-foreground">
                                {t("reports.export.includeNotes")}
                            </Label>
                            <Switch id="include-notes" checked={includeNotes} onCheckedChange={onIncludeNotesChange} />
                        </div>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)} className="rounded-[14px] border-border" disabled={isExporting}>
                        {t("reports.export.cancel")}
                    </Button>
                    <Button onClick={onExport} className="rounded-[14px] bg-primary text-white hover:bg-primary/90" disabled={isExporting}>
                        {isExporting ? (
                            <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                {t("reports.export.generating")}
                            </>
                        ) : (
                            <>
                                <Download className="w-4 h-4 mr-2" />
                                {t("reports.export.generate")}
                            </>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
