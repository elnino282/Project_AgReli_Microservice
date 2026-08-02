import type { Task, TaskStatus } from '../types';
import { KanbanColumn } from './KanbanColumn';
import { KANBAN_COLUMNS } from '../constants';
import { useI18n } from '@/shared/lib/hooks/useI18n';

interface BoardViewProps {
  tasks: Task[];
  onTaskMove: (taskId: string, newStatus: TaskStatus) => void;
  onEdit?: (taskId: string) => void;
  onComplete?: (taskId: string) => void;
  onReassign?: (taskId: string) => void;
  onDelete: (taskId: string) => void;
  disableMutations?: boolean;
}

export function BoardView({
  tasks,
  onTaskMove,
  onEdit,
  onComplete,
  onReassign,
  onDelete,
  disableMutations = false,
}: BoardViewProps) {
  const { t } = useI18n();

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {KANBAN_COLUMNS.map((column) => (
        <KanbanColumn
          key={column.status}
          status={column.status}
          title={t(column.titleKey, column.fallbackTitle)}
          color={column.color}
          tasks={tasks.filter((task) => task.status === column.status)}
          onTaskMove={onTaskMove}
          onEdit={onEdit}
          onComplete={onComplete}
          onReassign={onReassign}
          onDelete={onDelete}
          disableMutations={disableMutations}
        />
      ))}
    </div>
  );
}




