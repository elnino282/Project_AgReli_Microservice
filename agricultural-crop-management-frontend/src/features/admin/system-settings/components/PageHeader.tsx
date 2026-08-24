import { Save, RotateCcw } from 'lucide-react';
import { Button } from '@/shared/ui/button';
import { useI18n } from '@/shared/lib/hooks/useI18n';

interface PageHeaderProps {
    onSaveAll: () => void;
    onResetToDefault: () => void;
}

export function PageHeader({ onSaveAll, onResetToDefault }: PageHeaderProps) {
    const { t } = useI18n();

    return (
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
                <h1 className="mb-1">{t('admin.systemSettings.title')}</h1>
                <p className="text-sm text-muted-foreground">
                    {t('admin.systemSettings.subtitle')}
                </p>
            </div>
            <div className="flex items-center gap-3">
                <Button variant="outline" onClick={onResetToDefault}>
                    <RotateCcw className="w-4 h-4 mr-2" />
                    {t('admin.systemSettings.actions.resetToDefault')}
                </Button>
                <Button onClick={onSaveAll}>
                    <Save className="w-4 h-4 mr-2" />
                    {t('admin.systemSettings.actions.saveAll')}
                </Button>
            </div>
        </div>
    );
}
