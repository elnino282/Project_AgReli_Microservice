import { Check, Users, Calendar, X } from 'lucide-react';
import { Button } from '@/shared/ui/button';
import { Separator } from '@/shared/ui/separator';

import { useTranslation } from 'react-i18next';

interface BulkActionToolbarProps {
  selectedCount: number;
  onComplete: () => void;
  onReassign: () => void;
  onChangeDueDate: () => void;
  onClose: () => void;
}

export function BulkActionToolbar({
  selectedCount,
  onComplete,
  onReassign,
  onChangeDueDate,
  onClose,
}: BulkActionToolbarProps) {
  const { t } = useTranslation();
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-card border border-border rounded-xl shadow-lg px-6 py-4 acm-card-shadow">
      <div className="flex items-center gap-4">
        <span className="text-sm text-muted-foreground">
          {t('tasks.actions.selected', { count: selectedCount })}
        </span>
        <Separator orientation="vertical" className="h-6" />
        <Button
          variant="outline"
          size="sm"
          onClick={onComplete}
          className="acm-rounded-sm border-primary text-primary hover:bg-primary/10"
          title={t('tasks.actions.complete')}
        >
          <Check className="w-4 h-4 mr-2" />
          {t('tasks.actions.complete')}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={onReassign}
          className="acm-rounded-sm border-border"
          title={t('tasks.actions.reassign')}
        >
          <Users className="w-4 h-4 mr-2" />
          {t('tasks.actions.reassign')}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={onChangeDueDate}
          className="acm-rounded-sm border-border"
          title={t('tasks.actions.changeDueDate')}
        >
          <Calendar className="w-4 h-4 mr-2" />
          {t('tasks.actions.changeDueDate')}
        </Button>
        <Separator orientation="vertical" className="h-6" />
        <Button variant="ghost" size="sm" onClick={onClose} className="acm-rounded-sm">
          <X className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}



