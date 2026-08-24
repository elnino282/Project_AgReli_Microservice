import { Button } from '@/shared/ui/button';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/shared/ui/sheet';
import { Download, Filter, History, Info } from 'lucide-react';
import { useI18n } from '@/shared/lib/hooks/useI18n';

interface AuditHistoryDrawerProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function AuditHistoryDrawer({
    open,
    onOpenChange,
}: AuditHistoryDrawerProps) {
    const { t } = useI18n();

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent className="w-full sm:w-[600px]">
                <SheetHeader>
                    <SheetTitle className="flex items-center gap-2">
                        <History className="w-5 h-5" />
                        {t('admin.farmerManagement.auditHistory.title')}
                    </SheetTitle>
                    <SheetDescription>
                        {t('admin.farmerManagement.auditHistory.description')}
                    </SheetDescription>
                </SheetHeader>

                <div className="mt-6 space-y-4">
                    <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" className="flex-1">
                            <Filter className="w-4 h-4 mr-2" />
                            {t('admin.farmerManagement.auditHistory.filterByType')}
                        </Button>
                        <Button variant="outline" size="sm" className="flex-1">
                            <Download className="w-4 h-4 mr-2" />
                            {t('admin.farmerManagement.actions.exportCsv')}
                        </Button>
                    </div>

                    <div className="rounded-lg border bg-muted/30 p-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-2 text-foreground mb-2">
                            <Info className="w-4 h-4" />
                            {t('admin.farmerManagement.auditHistory.unavailableTitle')}
                        </div>
                        <p>
                            {t('admin.farmerManagement.auditHistory.unavailableDescription')}
                        </p>
                    </div>
                </div>
            </SheetContent>
        </Sheet>
    );
}
