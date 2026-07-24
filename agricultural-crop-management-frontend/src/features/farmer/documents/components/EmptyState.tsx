import { FileQuestion } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { useI18n } from "@/shared/lib/hooks/useI18n";

interface EmptyStateProps {
    searchQuery: string;
    activeFilterCount: number;
    onClearAll: () => void;
}

export function EmptyState({
    searchQuery,
    activeFilterCount,
    onClearAll,
}: EmptyStateProps) {
    const { t } = useI18n();

    return (
        <div className="flex flex-col items-center justify-center py-16 px-4">
            <div className="w-32 h-32 rounded-full bg-primary/10 flex items-center justify-center mb-6">
                <FileQuestion className="w-16 h-16 text-primary" />
            </div>
            <h3 className="text-xl text-foreground mb-2">{t("documents.states.emptyTitle")}</h3>
            <p className="text-sm text-muted-foreground text-center max-w-md">
                {t("documents.states.emptyDescription")}
            </p>
            {(searchQuery || activeFilterCount > 0) && (
                <Button
                    variant="outline"
                    className="mt-6 rounded-xl border-primary text-primary"
                    onClick={onClearAll}
                >
                    {t("documents.states.clearSearchFilters")}
                </Button>
            )}
        </div>
    );
}



