import { useQueryClient } from '@tanstack/react-query';
import { useState, useMemo, useEffect, useCallback } from 'react';
import httpClient from '@/shared/api/http';
import { toast } from 'sonner';
import {
  taskKeys,
  useTasksBySeason,
  useCreateTask,
  useUpdateTask,
  useUpdateTaskStatus,
  useDeleteTask,
  type Task as ApiTask,
  type TaskStatus as ApiTaskStatus,
  type TaskStatusUpdateRequest,
  type TaskUpdateRequest,
} from '@/entities/task';
import { useSeasonEmployees } from '@/entities/labor';
import { useOptionalSeason } from '@/shared/contexts';
import type { Task, TaskStatus, TaskType, ViewMode, FilterState } from '../types';

/**
 * Transform API task to feature task format
 */
const today = new Date().toISOString().split('T')[0];

const TASK_QUERY_PARAMS = {
  page: 0,
  size: 200,
  sortBy: 'dueDate',
  sortDirection: 'asc',
} as const;

const toDateOnly = (value?: string | null) => (value ? value.split('T')[0] : undefined);

const buildInitials = (name: string) => {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'NA';
  const first = parts[0][0] ?? '';
  const second = parts.length > 1 ? parts[1][0] ?? '' : '';
  return `${first}${second}`.toUpperCase();
};

const splitSeasonLabel = (seasonName?: string | null, seasonId?: number | null) => {
  const name = seasonName?.trim();
  if (name) {
    const parts = name.split(' - ');
    if (parts.length >= 2) {
      return { crop: parts[0], plot: parts.slice(1).join(' - ') };
    }
    return { crop: name, plot: seasonId ? `Season #${seasonId}` : 'General' };
  }
  if (seasonId) {
    const label = `Season #${seasonId}`;
    return { crop: label, plot: label };
  }
  return { crop: 'General', plot: 'Unassigned' };
};

const inferTaskType = (title: string, description?: string | null): TaskType => {
  const text = `${title} ${description ?? ''}`.toLowerCase();
  if (text.includes('irrigat') || text.includes('water')) return 'irrigation';
  if (text.includes('fertil') || text.includes('npk')) return 'fertilizing';
  if (text.includes('spray') || text.includes('pest') || text.includes('insect')) return 'spraying';
  if (text.includes('harvest') || text.includes('collect')) return 'harvesting';
  if (text.includes('inspect') || text.includes('scout')) return 'scouting';
  return 'scouting';
};

const transformApiToFeature = (apiTask: ApiTask): Task => {
  const assignee = apiTask.userName?.trim() || 'Assigned';
  const dueDate = apiTask.dueDate ?? apiTask.plannedDate ?? toDateOnly(apiTask.createdAt) ?? today;
  const { crop, plot } = splitSeasonLabel(apiTask.seasonName, apiTask.seasonId);
  const priority = apiTask.status === 'OVERDUE' || (dueDate && dueDate < today && apiTask.status !== 'DONE')
    ? 'high'
    : 'medium';

  return {
    id: String(apiTask.taskId),
    title: apiTask.title,
    type: inferTaskType(apiTask.title, apiTask.description),
    crop,
    plot,
    seasonId: apiTask.seasonId ?? undefined,
    assignee,
    assigneeInitials: buildInitials(assignee),
    dueDate,
    status: mapApiStatusToFeature(apiTask.status),
    notes: apiTask.notes ?? apiTask.description ?? '',
    attachments: 0,
    priority,
  };
};

const mapApiStatusToFeature = (status?: string): TaskStatus => {
  switch (status) {
    case 'PENDING': return 'todo';
    case 'IN_PROGRESS': return 'in-progress';
    case 'DONE': return 'completed';
    case 'CANCELLED': return 'todo';
    case 'OVERDUE': return 'overdue';
    default: return 'todo';
  }
};

const mapFeatureStatusToApi = (status: TaskStatus): ApiTaskStatus => {
  switch (status) {
    case 'todo': return 'PENDING';
    case 'in-progress': return 'IN_PROGRESS';
    case 'overdue': return 'OVERDUE';
    case 'completed': return 'DONE';
    default: return 'PENDING';
  }
};

const isValidDateInput = (value: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }
  return !Number.isNaN(new Date(value).getTime());
};

const buildTaskUpdatePayload = (
  task: ApiTask,
  overrides: Partial<Pick<TaskUpdateRequest, 'assigneeUserId' | 'dueDate'>>
): TaskUpdateRequest => {
  const assigneeUserId = overrides.assigneeUserId ?? task.userId ?? undefined;
  return {
    title: task.title || `Task #${task.taskId}`,
    description: task.description ?? undefined,
    seasonId: task.seasonId ?? undefined,
    plannedDate: task.plannedDate ?? undefined,
    dueDate: overrides.dueDate ?? task.dueDate ?? undefined,
    notes: task.notes ?? undefined,
    assigneeUserId: assigneeUserId && assigneeUserId > 0 ? assigneeUserId : undefined,
  };
};

const buildStatusUpdatePayload = (status: TaskStatus): TaskStatusUpdateRequest => {
  if (status === 'completed') {
    return {
      status: 'DONE',
      actualStartDate: today,
      actualEndDate: today,
    };
  }
  return { status: mapFeatureStatusToApi(status) };
};

export function useTaskWorkspace() {
  const queryClient = useQueryClient();
  const seasonContext = useOptionalSeason();
  const seasonId = seasonContext?.selectedSeasonId ?? 0;
  const selectedSeasonStatus = seasonContext?.selectedSeason?.status ?? null;
  const isSeasonWriteLocked =
    selectedSeasonStatus === 'COMPLETED'
    || selectedSeasonStatus === 'CANCELLED'
    || selectedSeasonStatus === 'ARCHIVED';
  const seasonWriteLockReason = isSeasonWriteLocked
    ? 'Season is locked. Task write actions are disabled.'
    : undefined;

  // API Hooks - season-scoped tasks in current workspace
  const {
    data: apiTasksData,
    isLoading: apiLoading,
    error: apiError,
    refetch,
  } = useTasksBySeason(
    seasonId,
    TASK_QUERY_PARAMS,
    { enabled: seasonId > 0 }
  );
  const createMutation = useCreateTask(seasonId, {
    onSuccess: () => { toast.success('Task created'); setCreateTaskOpen(false); },
    onError: (err) => toast.error('Failed to create task', { description: err.message }),
  });
  const updateTaskMutation = useUpdateTask(seasonId);
  const updateStatusMutation = useUpdateTaskStatus(seasonId);
  const deleteMutation = useDeleteTask(seasonId, {
    onSuccess: () => toast.success('Task deleted'),
    onError: (err) => toast.error('Failed to delete', { description: err.message }),
  });

  // View state
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [calendarMode, setCalendarMode] = useState<'month' | 'week'>('month');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [searchQuery, setSearchQuery] = useState('');
  const [searchDebounced, setSearchDebounced] = useState('');
  const [filters, setFilters] = useState<FilterState>({ status: 'all', type: 'all', assignee: 'all', plot: 'all' });
  const [selectedTasks, setSelectedTasks] = useState<string[]>([]);
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);
  const [createTaskOpen, setCreateTaskOpen] = useState(false);
  const [reassignOpen, setReassignOpen] = useState(false);
  const [dueDateOpen, setDueDateOpen] = useState(false);
  const [editTaskOpen, setEditTaskOpen] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [isBulkApplying, setIsBulkApplying] = useState(false);

  const { data: seasonEmployeesData } = useSeasonEmployees(
    seasonId,
    { page: 0, size: 200 },
    { enabled: seasonId > 0 }
  );

  const [workTeams, setWorkTeams] = useState<Array<{ id: number; teamName: string }>>([]);

  useEffect(() => {
    if (seasonId > 0) {
      httpClient.get(`/api/v1/farmer/seasons/${seasonId}/teams`)
        .then(res => {
          if (res.data) {
            // Backend returns array directly
            setWorkTeams(Array.isArray(res.data) ? res.data : (res.data.items ?? []));
          }
        })
        .catch(err => {
          console.error("Failed to fetch work teams", err);
        });
    } else {
      setWorkTeams([]);
    }
  }, [seasonId]);

  const invalidateTaskQueries = useCallback(async () => {
    if (seasonId <= 0) {
      return;
    }
    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: taskKeys.listBySeason(seasonId, TASK_QUERY_PARAMS),
        exact: true,
      }),
      queryClient.invalidateQueries({
        queryKey: taskKeys.listBySeason(seasonId),
        exact: false,
      }),
      queryClient.invalidateQueries({
        queryKey: taskKeys.listWorkspace(),
        exact: false,
      }),
    ]);
  }, [queryClient, seasonId]);

  const selectedApiTasks = useMemo(() => {
    const items = apiTasksData?.items ?? [];
    if (items.length === 0 || selectedTasks.length === 0) {
      return [] as ApiTask[];
    }
    const byId = new Map(items.map((task) => [String(task.taskId), task]));
    return selectedTasks
      .map((taskId) => byId.get(taskId))
      .filter((task): task is ApiTask => Boolean(task));
  }, [apiTasksData, selectedTasks]);

  const executeBulkTaskUpdate = useCallback(async (
    buildPayload: (task: ApiTask) => TaskUpdateRequest,
    successMessageBuilder: (count: number) => string
  ) => {
    if (isSeasonWriteLocked) {
      toast.error(seasonWriteLockReason);
      return { executed: false };
    }
    if (seasonId <= 0) {
      toast.error('Invalid season context');
      return { executed: false };
    }
    if (selectedTasks.length === 0) {
      toast.error('No tasks selected');
      return { executed: false };
    }
    if (selectedApiTasks.length === 0) {
      toast.error('Unable to resolve selected tasks');
      return { executed: false };
    }

    setIsBulkApplying(true);
    try {
      const results = await Promise.allSettled(
        selectedApiTasks.map((task) =>
          updateTaskMutation.mutateAsync({
            id: task.taskId,
            data: buildPayload(task),
          })
        )
      );

      const failedTaskIds: string[] = [];
      results.forEach((result, index) => {
        if (result.status === 'rejected') {
          failedTaskIds.push(String(selectedApiTasks[index].taskId));
        }
      });

      await invalidateTaskQueries();

      const successCount = selectedApiTasks.length - failedTaskIds.length;
      if (successCount > 0) {
        toast.success(successMessageBuilder(successCount));
      }
      if (failedTaskIds.length > 0) {
        toast.error(`Failed to update ${failedTaskIds.length} task(s).`);
        setSelectedTasks(failedTaskIds);
      } else {
        setSelectedTasks([]);
      }

      return { executed: true };
    } finally {
      setIsBulkApplying(false);
    }
  }, [
    invalidateTaskQueries,
    isSeasonWriteLocked,
    seasonId,
    seasonWriteLockReason,
    selectedApiTasks,
    selectedTasks.length,
    updateTaskMutation,
  ]);

  // Transformed data - no mock fallback
  const tasks = useMemo(() => {
    return apiTasksData?.items?.map(transformApiToFeature) ?? [];
  }, [apiTasksData]);

  const isLoading = apiLoading;
  const error = apiError;

  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery.length >= 2 || searchQuery.length === 0) setSearchDebounced(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const filteredTasks = useMemo(() => tasks.filter((task) => {
    if (searchDebounced) {
      const s = searchDebounced.toLowerCase();
      if (!task.title.toLowerCase().includes(s) && !task.plot.toLowerCase().includes(s) && !task.crop.toLowerCase().includes(s)) return false;
    }
    if (filters.status !== 'all' && task.status !== filters.status) return false;
    if (filters.type !== 'all' && task.type !== filters.type) return false;
    if (filters.assignee !== 'all' && task.assignee !== filters.assignee) return false;
    if (filters.plot !== 'all' && task.plot !== filters.plot) return false;
    return true;
  }), [tasks, searchDebounced, filters]);

  const handleTaskMove = useCallback((taskId: string, newStatus: TaskStatus) => {
    if (isSeasonWriteLocked) {
      toast.error(seasonWriteLockReason);
      return;
    }
    const id = parseInt(taskId, 10);
    if (Number.isNaN(id) || id <= 0) {
      toast.error('Invalid task ID');
      return;
    }
    updateStatusMutation.mutate(
      { id, data: buildStatusUpdatePayload(newStatus) },
      {
        onSuccess: () => toast.success('Task status updated'),
        onError: (err) => toast.error('Failed to update', { description: err.message }),
      }
    );
  }, [isSeasonWriteLocked, seasonWriteLockReason, updateStatusMutation]);

  const handleBulkComplete = useCallback(async () => {
    if (isSeasonWriteLocked) {
      toast.error(seasonWriteLockReason);
      return;
    }
    if (selectedTasks.length === 0) {
      toast.error('No tasks selected');
      return;
    }

    const selectedIds = selectedTasks
      .map((taskId) => parseInt(taskId, 10))
      .filter((id) => Number.isFinite(id) && id > 0);
    if (selectedIds.length === 0) {
      toast.error('Unable to resolve selected tasks');
      return;
    }

    setIsBulkApplying(true);
    try {
      const results = await Promise.allSettled(
        selectedIds.map((id) =>
          updateStatusMutation.mutateAsync({
            id,
            data: buildStatusUpdatePayload('completed'),
          })
        )
      );

      const failedTaskIds: string[] = [];
      results.forEach((result, index) => {
        if (result.status === 'rejected') {
          failedTaskIds.push(String(selectedIds[index]));
        }
      });

      await invalidateTaskQueries();

      const successCount = selectedIds.length - failedTaskIds.length;
      if (successCount > 0) {
        toast.success(`${successCount} task(s) completed`);
      }
      if (failedTaskIds.length > 0) {
        toast.error(`Failed to complete ${failedTaskIds.length} task(s).`);
        setSelectedTasks(failedTaskIds);
      } else {
        setSelectedTasks([]);
      }
    } finally {
      setIsBulkApplying(false);
    }
  }, [invalidateTaskQueries, isSeasonWriteLocked, seasonWriteLockReason, selectedTasks, updateStatusMutation]);

  const handleDeleteTask = useCallback((taskId: string) => {
    if (isSeasonWriteLocked) {
      toast.error(seasonWriteLockReason);
      return;
    }
    const id = parseInt(taskId, 10);
    if (Number.isNaN(id) || id <= 0) {
      toast.error('Invalid task ID');
      return;
    }
    deleteMutation.mutate(id);
  }, [deleteMutation, isSeasonWriteLocked, seasonWriteLockReason]);

  const handleSelectAll = useCallback((checked: boolean) => setSelectedTasks(checked ? filteredTasks.map(t => t.id) : []), [filteredTasks]);
  const handleSelectTask = useCallback((taskId: string, checked: boolean) => setSelectedTasks(prev => checked ? [...prev, taskId] : prev.filter(id => id !== taskId)), []);
  
  const handleEditTask = useCallback((taskId: string) => {
    setEditingTaskId(taskId);
    setEditTaskOpen(true);
  }, []);

  const handleUpdateTask = useCallback(async (taskId: string | number, data: any) => {
    if (isSeasonWriteLocked) {
      toast.error(seasonWriteLockReason);
      return;
    }
    const id = typeof taskId === 'string' ? parseInt(taskId, 10) : taskId;
    if (Number.isNaN(id) || id <= 0) return;

    try {
      await updateTaskMutation.mutateAsync({
        id,
        data: {
          title: data.title,
          description: data.description,
          seasonId: data.seasonId,
          plannedDate: data.plannedDate,
          dueDate: data.dueDate,
          notes: data.notes,
          assigneeUserId: data.assigneeUserId,
        }
      });
      if (data.status) {
        await updateStatusMutation.mutateAsync({
          id,
          data: buildStatusUpdatePayload(mapApiStatusToFeature(data.status))
        });
      }
      toast.success('Task updated successfully');
      setEditTaskOpen(false);
      setEditingTaskId(null);
    } catch (err: any) {
      toast.error('Failed to update task', { description: err.message });
    }
  }, [isSeasonWriteLocked, seasonWriteLockReason, updateTaskMutation, updateStatusMutation]);

  const handleCompleteTask = useCallback((taskId: string) => {
    if (isSeasonWriteLocked) {
      toast.error(seasonWriteLockReason);
      return;
    }
    const id = parseInt(taskId, 10);
    if (Number.isNaN(id) || id <= 0) return;

    updateStatusMutation.mutate({
      id,
      data: buildStatusUpdatePayload('completed')
    }, {
      onSuccess: () => toast.success('Task marked as complete'),
      onError: (err) => toast.error('Failed to complete task', { description: err.message })
    });
  }, [isSeasonWriteLocked, seasonWriteLockReason, updateStatusMutation]);

  const handleReassign = useCallback(async (assigneeUserId: number) => {
    if (!Number.isFinite(assigneeUserId) || assigneeUserId <= 0) {
      toast.error('Select a valid assignee');
      return;
    }
    const result = await executeBulkTaskUpdate(
      (task) => buildTaskUpdatePayload(task, { assigneeUserId }),
      (count) => `${count} task(s) reassigned`
    );
    if (result.executed) {
      setReassignOpen(false);
    }
  }, [executeBulkTaskUpdate]);

  const handleBulkDueDateChange = useCallback(async (dueDate: string) => {
    if (!isValidDateInput(dueDate)) {
      toast.error('Please choose a valid due date');
      return;
    }
    const result = await executeBulkTaskUpdate(
      (task) => buildTaskUpdatePayload(task, { dueDate }),
      (count) => `${count} task(s) due date updated`
    );
    if (result.executed) {
      setDueDateOpen(false);
    }
  }, [executeBulkTaskUpdate]);

  const handleCreateTask = useCallback((data: {
    title: string;
    plannedDate: string;
    dueDate: string;
    description?: string;
    seasonId?: number;
    plotId?: number;
    taskType?: string;
    assigneeUserId?: number;
    workTeamId?: number;
    estimatedDays?: number;
  }) => {
    // Always use pinned season from workspace context
    const effectiveSeasonId = seasonId;

    if (!effectiveSeasonId) {
      toast.error('Select a season', { description: 'Pick a season to create tasks.' });
      return;
    }
    if (isSeasonWriteLocked) {
      toast.error(seasonWriteLockReason);
      return;
    }
    if (!data.title) {
      toast.error('Task title is required');
      return;
    }
    if (!data.dueDate) {
      toast.error('Due date is required');
      return;
    }
    const plannedDate = data.plannedDate || data.dueDate;
    createMutation.mutate({
      title: data.title,
      plannedDate,
      dueDate: data.dueDate,
      description: data.description,
      assigneeUserId: data.assigneeUserId,
      plotId: data.plotId,
      workTeamId: data.workTeamId,
      estimatedDays: data.estimatedDays,
    });
  }, [isSeasonWriteLocked, seasonId, seasonWriteLockReason, createMutation]);

  const uniqueAssignees = useMemo(() => [...new Set(tasks.map(t => t.assignee))], [tasks]);
  const uniquePlots = useMemo(() => [...new Set(tasks.map(t => t.plot))], [tasks]);
  const assigneeOptions = useMemo(
    () =>
      (seasonEmployeesData?.items ?? [])
        .filter((employee) => employee.active !== false && !!employee.employeeUserId)
        .map((employee) => ({
          userId: employee.employeeUserId,
          displayName:
            employee.employeeName ||
            employee.employeeUsername ||
            employee.employeeEmail ||
            `Employee #${employee.employeeUserId}`,
        })),
    [seasonEmployeesData]
  );
  const activeFilterCount = useMemo(() => [filters.status, filters.type, filters.assignee, filters.plot].filter(f => f !== 'all').length, [filters]);

  return {
    seasonId, hasSeasonContext: !!seasonContext,
    isSeasonWriteLocked,
    seasonWriteLockReason,
    viewMode, setViewMode, calendarMode, setCalendarMode, currentDate, setCurrentDate,
    searchQuery, setSearchQuery, filters, setFilters, activeFilterCount,
    selectedTasks, setSelectedTasks,
    filterDrawerOpen, setFilterDrawerOpen, createTaskOpen, setCreateTaskOpen, reassignOpen, setReassignOpen, dueDateOpen, setDueDateOpen, editTaskOpen, setEditTaskOpen, editingTaskId, setEditingTaskId,
    tasks, filteredTasks, uniqueAssignees, uniquePlots, assigneeOptions, workTeamOptions: workTeams,
    isLoading, error: error ?? null, refetch,
    handleTaskMove, handleBulkComplete, handleDeleteTask, handleSelectAll, handleSelectTask, handleReassign, handleBulkDueDateChange, handleCreateTask, handleEditTask, handleUpdateTask, handleCompleteTask,
    isCreating: createMutation.isPending,
    isUpdating: updateStatusMutation.isPending || updateTaskMutation.isPending || isBulkApplying,
    isDeleting: deleteMutation.isPending,
    rawTasks: apiTasksData?.items || [],
  };
}
