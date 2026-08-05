import { Button } from '@/shared/ui/button';
import { Card, CardContent } from '@/shared/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/shared/ui/tooltip';
import { useI18n } from '@/shared/lib/hooks/useI18n';
import { CalendarDays, ClipboardList, Columns3, List, Plus } from 'lucide-react';
import type { ViewMode } from '../types';

interface TaskHeaderProps {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  onCreateTask: () => void;
  disableMutations?: boolean;
  lockMessage?: string;
}

export function TaskHeader({
  viewMode,
  onViewModeChange,
  onCreateTask,
  disableMutations = false,
  lockMessage,
}: TaskHeaderProps) {
  const { t } = useI18n();
  
  return (
    <div className="mb-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex-shrink-0">
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2 leading-tight">
            <ClipboardList className="w-6 h-6 text-emerald-600" />
            {t('tasks.pageTitle')}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {t('tasks.subtitle')}
          </p>
        </div>

        <div className="flex items-center gap-3 flex-shrink-0">
          {/* View Switch */}
          <div className="flex items-center gap-1 bg-muted p-1 rounded-xl overflow-hidden">
            <Button
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => onViewModeChange('list')}
              className={`acm-rounded-sm px-3 ${
                viewMode === 'list'
                  ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                  : 'hover:bg-muted/50'
              }`}
            >
              <List className="w-4 h-4 mr-2" />
              {t('tasks.views.list')}
            </Button>

            <Button
              variant={viewMode === 'calendar' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => onViewModeChange('calendar')}
              className={`acm-rounded-sm px-3 ${
                viewMode === 'calendar'
                  ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                  : 'hover:bg-muted/50'
              }`}
            >
              <CalendarDays className="w-4 h-4 mr-2" />
              {t('tasks.views.calendar')}
            </Button>

            <Button
              variant={viewMode === 'board' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => onViewModeChange('board')}
              className={`acm-rounded-sm px-3 ${
                viewMode === 'board'
                  ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                  : 'hover:bg-muted/50'
              }`}
            >
              <Columns3 className="w-4 h-4 mr-2" />
              {t('tasks.views.board')}
            </Button>
          </div>

          {/* Create Task Button */}
          <Button
            className="bg-primary hover:bg-primary/90 text-primary-foreground acm-rounded-sm acm-button-shadow"
            onClick={onCreateTask}
            disabled={disableMutations}
            title={disableMutations ? lockMessage : undefined}
          >
            <Plus className="w-4 h-4 mr-2" />
            {t('tasks.createButton')}
          </Button>
        </div>
      </div>
    </div>
  );
}



