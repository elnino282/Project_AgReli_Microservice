import { Star, ExternalLink, Clock, Eye } from "lucide-react";
import { Card, CardContent } from "@/shared/ui/card";
import { Button } from "@/shared/ui/button";
import { Badge } from "@/shared/ui/badge";
import { useI18n } from "@/shared/lib/hooks/useI18n";
import type { Document, DocumentType } from "../types";

interface DocumentCardProps {
    document: Document;
    isHovered: boolean;
    onMouseEnter: () => void;
    onMouseLeave: () => void;
    onPreview: (doc: Document) => void;
    onToggleFavorite: (docId: string) => void;
    onDownload: (doc: Document) => void;
    onOpen?: (doc: Document) => void;
    getDocumentIcon: (type: DocumentType) => JSX.Element;
}

export function DocumentCard({
    document,
    isHovered,
    onMouseEnter,
    onMouseLeave,
    onPreview,
    onToggleFavorite,
    onDownload,
    onOpen,
    getDocumentIcon,
}: DocumentCardProps) {
    const { t, locale } = useI18n();

    const handleOpen = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (onOpen) {
            onOpen(document);
        } else {
            onDownload(document);
        }
    };

    return (
        <Card
            className="border-border rounded-xl shadow-sm hover:shadow-md transition-all cursor-pointer group relative overflow-hidden flex flex-row items-center p-3 gap-4"
            onMouseEnter={onMouseEnter}
            onMouseLeave={onMouseLeave}
            onClick={() => onPreview(document)}
        >
            {/* Small icon thumbnail replacement */}
            <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                {getDocumentIcon(document.type)}
            </div>

            <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                    <h4 className="text-sm font-semibold text-foreground truncate">
                        {document.title}
                    </h4>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 -mr-2 shrink-0"
                        aria-label={
                            document.isFavorite
                                ? t("documents.actions.removeFavorite")
                                : t("documents.actions.addFavorite")
                        }
                        onClick={(e: React.MouseEvent) => {
                            e.stopPropagation();
                            onToggleFavorite(document.id);
                        }}
                    >
                        <Star
                            className={`w-4 h-4 ${document.isFavorite
                                ? "text-accent fill-current"
                                : "text-muted-foreground hover:text-accent"
                                }`}
                        />
                    </Button>
                </div>

                <div className="flex flex-wrap gap-1 mb-2">
                    {document.crop && (
                        <Badge variant="outline" className="text-[10px] bg-primary/5 text-primary border-primary/20 px-1.5 py-0 font-medium">
                            {document.crop}
                        </Badge>
                    )}
                    {document.stage && (
                        <Badge variant="outline" className="text-[10px] bg-secondary/5 text-secondary border-secondary/20 px-1.5 py-0 font-medium">
                            {document.stage}
                        </Badge>
                    )}
                    {document.topic && (
                        <Badge variant="outline" className="text-[10px] bg-accent/5 text-accent border-accent/20 px-1.5 py-0 font-medium">
                            {document.topic}
                        </Badge>
                    )}
                </div>

                <div className="flex items-center justify-between text-[11px] text-muted-foreground mt-1">
                    <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(document.updatedAt).toLocaleDateString(locale)}
                    </div>
                    {isHovered ? (
                        <div className="flex gap-1 animate-in fade-in duration-200">
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 px-2 text-[11px] hover:bg-primary/10"
                                onClick={(e: React.MouseEvent) => {
                                    e.stopPropagation();
                                    onPreview(document);
                                }}
                            >
                                <Eye className="w-3 h-3 mr-1" />
                                {t("documents.actions.preview")}
                            </Button>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 px-2 text-[11px] text-primary hover:bg-primary/10"
                                onClick={handleOpen}
                            >
                                <ExternalLink className="w-3 h-3 mr-1" />
                                {t("documents.actions.openNewTab")}
                            </Button>
                        </div>
                    ) : (
                        <div className="h-6" /> /* Placeholder to avoid layout shift when hovered */
                    )}
                </div>
            </div>
        </Card>
    );
}
