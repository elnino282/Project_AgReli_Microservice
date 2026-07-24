import {
    Download,
    ExternalLink,
    Share2,
    Printer,
    ZoomIn,
    ZoomOut,
    ChevronRight,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Button } from "@/shared/ui/button";
import { Badge } from "@/shared/ui/badge";
import { Label } from "@/shared/ui/label";
import { Separator } from "@/shared/ui/separator";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/shared/ui/sheet";
import { useI18n } from "@/shared/lib/hooks/useI18n";
import type { Document, DocumentType } from "../types";

interface DocumentPreviewProps {
    document: Document | null;
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    onDownload: (doc: Document) => void;
    getDocumentIcon: (type: DocumentType) => JSX.Element;
    getRelatedDocuments: (doc: Document) => Document[];
    onSelectRelated: (doc: Document) => void;
}

export function DocumentPreview({
    document,
    isOpen,
    onOpenChange,
    onDownload,
    getDocumentIcon,
    getRelatedDocuments,
    onSelectRelated,
}: DocumentPreviewProps) {
    const { t, locale } = useI18n();

    if (!document) return null;

    const getDocumentTypeLabel = (type: DocumentType) =>
        t(`documents.types.${type}`, type);

    const relatedDocuments = getRelatedDocuments(document);

    return (
        <Sheet open={isOpen} onOpenChange={onOpenChange}>
            <SheetContent
                side="right"
                className="w-full sm:max-w-2xl overflow-y-auto border-l-2 border-primary/20"
            >
                <SheetHeader>
                    <SheetTitle className="flex items-center gap-2 text-foreground pr-8">
                        {getDocumentIcon(document.type)}
                        {document.title}
                    </SheetTitle>
                </SheetHeader>

                <div className="mt-6 space-y-6">
                    <Card className="border-border rounded-2xl overflow-hidden">
                        <div
                            className="h-96 flex items-center justify-center"
                            style={{
                                background:
                                    "linear-gradient(to bottom right, color-mix(in oklab, var(--primary) 5%, transparent), color-mix(in oklab, var(--secondary) 5%, transparent))",
                            }}
                        >
                            <div className="text-center">
                                <div className="text-8xl mb-4">{document.thumbnail}</div>
                                <p className="text-sm text-muted-foreground mb-4">
                                    {t("documents.preview.previewLabel", {
                                        type: getDocumentTypeLabel(document.type),
                                    })}
                                </p>
                                <div className="flex gap-2 justify-center">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="rounded-xl border-border"
                                    >
                                        <ZoomIn className="w-4 h-4 mr-2" />
                                        {t("documents.actions.zoomIn")}
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="rounded-xl border-border"
                                    >
                                        <ZoomOut className="w-4 h-4 mr-2" />
                                        {t("documents.actions.zoomOut")}
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </Card>

                    <div className="flex gap-3">
                        <Button
                            className="flex-1 bg-primary hover:bg-primary/90 text-white rounded-xl"
                            onClick={() => onDownload(document)}
                        >
                            <Download className="w-4 h-4 mr-2" />
                            {t("documents.actions.downloadDocument")}
                            <ExternalLink className="w-4 h-4 ml-1" />
                            <span className="text-xs">
                                {t("documents.actions.openNewTabHint")}
                            </span>
                        </Button>
                        <Button
                            variant="outline"
                            className="rounded-xl border-border"
                        >
                            <Share2 className="w-4 h-4 mr-2" />
                            {t("documents.actions.share")}
                        </Button>
                        <Button
                            variant="outline"
                            className="rounded-xl border-border"
                        >
                            <Printer className="w-4 h-4 mr-2" />
                            {t("documents.actions.print")}
                        </Button>
                    </div>

                    <Card className="border-border rounded-2xl">
                        <CardHeader>
                            <CardTitle className="text-base text-foreground">
                                {t("documents.preview.information")}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <div>
                                <Label className="text-xs text-muted-foreground">
                                    {t("documents.preview.description")}
                                </Label>
                                <p className="text-sm text-foreground mt-1">
                                    {document.description || t("documents.preview.noDescription")}
                                </p>
                            </div>

                            <Separator className="bg-border" />

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label className="text-xs text-muted-foreground">
                                        {t("documents.preview.fileSize")}
                                    </Label>
                                    <p className="text-sm text-foreground mt-1">
                                        {document.fileSize}
                                    </p>
                                </div>
                                <div>
                                    <Label className="text-xs text-muted-foreground">
                                        {t("documents.preview.author")}
                                    </Label>
                                    <p className="text-sm text-foreground mt-1">
                                        {document.author}
                                    </p>
                                </div>
                            </div>

                            {document.crop && (
                                <>
                                    <Separator className="bg-border" />
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <Label className="text-xs text-muted-foreground">
                                                {t("documents.preview.crop")}
                                            </Label>
                                            <p className="text-sm text-foreground mt-1">
                                                {document.crop}
                                            </p>
                                        </div>
                                        {document.stage && (
                                            <div>
                                                <Label className="text-xs text-muted-foreground">
                                                    {t("documents.preview.stage")}
                                                </Label>
                                                <p className="text-sm text-foreground mt-1">
                                                    {document.stage}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </>
                            )}

                            <Separator className="bg-border" />

                            <div>
                                <Label className="text-xs text-muted-foreground">
                                    {t("documents.preview.tags")}
                                </Label>
                                <div className="flex flex-wrap gap-2 mt-2">
                                    {document.tags.length > 0 ? (
                                        document.tags.map((tag, index) => (
                                            <Badge
                                                key={index}
                                                className="bg-primary/10 text-primary border-primary/20"
                                            >
                                                {tag}
                                            </Badge>
                                        ))
                                    ) : (
                                        <span className="text-sm text-muted-foreground">
                                            {t("common.notAvailable", "-")}
                                        </span>
                                    )}
                                </div>
                            </div>

                            <Separator className="bg-border" />

                            <div>
                                <Label className="text-xs text-muted-foreground">
                                    {t("documents.preview.lastUpdated")}
                                </Label>
                                <p className="text-sm text-foreground mt-1">
                                    {new Date(document.updatedAt).toLocaleDateString(locale, {
                                        year: "numeric",
                                        month: "long",
                                        day: "numeric",
                                    })}
                                </p>
                            </div>
                        </CardContent>
                    </Card>

                    {relatedDocuments.length > 0 && (
                        <Card className="border-border rounded-2xl">
                            <CardHeader>
                                <CardTitle className="text-base text-foreground">
                                    {t("documents.preview.relatedDocuments")}
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-3">
                                    {relatedDocuments.map((relatedDoc) => (
                                        <div
                                            key={relatedDoc.id}
                                            className="flex items-center gap-3 p-3 rounded-xl hover:bg-muted cursor-pointer transition-colors"
                                            onClick={() => onSelectRelated(relatedDoc)}
                                        >
                                            <div className="text-2xl">{relatedDoc.thumbnail}</div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm text-foreground truncate">
                                                    {relatedDoc.title}
                                                </p>
                                                <p className="text-xs text-muted-foreground">
                                                    {getDocumentTypeLabel(relatedDoc.type)}
                                                </p>
                                            </div>
                                            <ChevronRight className="w-4 h-4 text-muted-foreground" />
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </div>
            </SheetContent>
        </Sheet>
    );
}
