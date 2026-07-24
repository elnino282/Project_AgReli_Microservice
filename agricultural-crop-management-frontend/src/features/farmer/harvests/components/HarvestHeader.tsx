import { Button } from "@/shared/ui/button";
import { Card, CardContent } from "@/shared/ui/card";
import { useI18n } from "@/shared/lib/hooks/useI18n";
import { PageHeader } from "@/shared/ui";
import { Plus, Wheat } from "lucide-react";

interface HarvestHeaderProps {
    onAddBatch: () => void;
    addDisabled?: boolean;
    lockMessage?: string;
    phiBadge?: React.ReactNode;
}

export function HarvestHeader({
    onAddBatch,
    addDisabled = false,
    lockMessage,
    phiBadge,
}: HarvestHeaderProps) {
    const { t } = useI18n();
    
    return (
        <Card className="mb-6 border border-border rounded-xl shadow-sm">
            <CardContent className="px-6 py-4">
                <PageHeader
                    className="mb-0"
                    icon={<Wheat className="w-8 h-8" />}
                    title={t('harvests.title')}
                    subtitle={t('harvests.subtitle')}
                    actions={
                        <div className="flex items-center gap-3">
                            {phiBadge}
                            <Button
                                onClick={onAddBatch}
                                variant="default"
                                disabled={addDisabled}
                                title={addDisabled ? lockMessage : undefined}
                            >
                                <Plus className="w-4 h-4 mr-2" />
                                {t('harvests.createButton')}
                            </Button>
                        </div>
                    }
                />
            </CardContent>
        </Card>
    );
}



