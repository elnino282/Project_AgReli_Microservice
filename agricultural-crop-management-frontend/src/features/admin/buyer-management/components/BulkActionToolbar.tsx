import { CheckCircle, Ban, Trash2 } from 'lucide-react';
import { Card, CardContent } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { Checkbox } from '@/shared/ui/checkbox';
import { useI18n } from '@/shared/lib/hooks/useI18n';

interface BulkActionToolbarProps {
    selectedCount: number;
    onSelectAll: () => void;
    isAllSelected: boolean;
    onActivate: () => void;
    onSuspend: () => void;
    onDelete: () => void;
}

export function BulkActionToolbar({
    selectedCount,
    onSelectAll,
    isAllSelected,
    onActivate,
    onSuspend,
    onDelete,
}: BulkActionToolbarProps) {
    const { t } = useI18n();
    if (selectedCount === 0) return null;

    return (
        <Card className="border-primary/30 bg-primary/10">
            <CardContent className="p-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Checkbox checked={isAllSelected} onCheckedChange={onSelectAll} />
                        <span className="text-sm">
                            {t('admin.buyerManagement.bulk.selectedCount', { count: selectedCount })}
                        </span>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={onActivate}>
                            <CheckCircle className="w-4 h-4 mr-2" />
                            {t('admin.buyerManagement.actions.activate')}
                        </Button>
                        <Button variant="outline" size="sm" onClick={onSuspend}>
                            <Ban className="w-4 h-4 mr-2" />
                            {t('admin.buyerManagement.actions.suspend')}
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={onDelete}
                            className="text-red-600 hover:text-red-700"
                        >
                            <Trash2 className="w-4 h-4 mr-2" />
                            {t('common.delete')}
                        </Button>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
