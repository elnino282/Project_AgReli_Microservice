import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useTaskWorkspace } from './useTaskWorkspace';

const mocks = vi.hoisted(() => ({
  useTasksBySeason: vi.fn(),
  useCreateTask: vi.fn(),
  useUpdateTask: vi.fn(),
  useUpdateTaskStatus: vi.fn(),
  useDeleteTask: vi.fn(),
  useSeasonEmployees: vi.fn(),
  useOptionalSeason: vi.fn(),
  updateTaskMutateAsync: vi.fn(),
  updateStatusMutate: vi.fn(),
  updateStatusMutateAsync: vi.fn(),
  deleteMutate: vi.fn(),
  createMutate: vi.fn(),
  refetch: vi.fn(),
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
}));

vi.mock('@/entities/task', () => ({
  taskKeys: {
    listBySeason: (seasonId: number, params?: unknown) => ['task', 'list', 'bySeason', seasonId, params],
    listWorkspace: (params?: unknown) => ['task', 'list', 'workspace', params],
  },
  useTasksBySeason: mocks.useTasksBySeason,
  useCreateTask: mocks.useCreateTask,
  useUpdateTask: mocks.useUpdateTask,
  useUpdateTaskStatus: mocks.useUpdateTaskStatus,
  useDeleteTask: mocks.useDeleteTask,
}));

vi.mock('@/entities/labor', () => ({
  useSeasonEmployees: mocks.useSeasonEmployees,
}));

vi.mock('@/shared/contexts', () => ({
  useOptionalSeason: mocks.useOptionalSeason,
}));

vi.mock('sonner', () => ({
  toast: {
    success: mocks.toastSuccess,
    error: mocks.toastError,
  },
}));

vi.mock('@/shared/api/http', () => ({
  default: {
    get: vi.fn().mockResolvedValue({ data: [] }),
    post: vi.fn().mockResolvedValue({ data: {} }),
    put: vi.fn().mockResolvedValue({ data: {} }),
    delete: vi.fn().mockResolvedValue({ data: {} }),
  }
}));

const apiTaskRows = [
  {
    taskId: 101,
    userId: 7,
    userName: 'Worker One',
    seasonId: 33,
    seasonName: 'Rice - Plot A',
    title: 'Spray Field A',
    description: 'Pesticide run',
    plannedDate: '2026-06-01',
    dueDate: '2026-06-02',
    status: 'PENDING',
    actualStartDate: null,
    actualEndDate: null,
    notes: 'note-101',
    createdAt: '2026-05-10T10:00:00',
  },
  {
    taskId: 102,
    userId: 8,
    userName: 'Worker Two',
    seasonId: 33,
    seasonName: 'Rice - Plot A',
    title: 'Inspect Plot',
    description: 'Scout for issues',
    plannedDate: '2026-06-03',
    dueDate: '2026-06-04',
    status: 'IN_PROGRESS',
    actualStartDate: null,
    actualEndDate: null,
    notes: 'note-102',
    createdAt: '2026-05-11T10:00:00',
  },
];

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, staleTime: 0, gcTime: 0 },
      mutations: { retry: false },
    },
  });
}

describe('useTaskWorkspace bulk actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mocks.useOptionalSeason.mockReturnValue({
      selectedSeasonId: 33,
      selectedSeason: { id: 33, status: 'ACTIVE' },
    });
    mocks.useTasksBySeason.mockReturnValue({
      data: { items: apiTaskRows },
      isLoading: false,
      error: null,
      refetch: mocks.refetch,
    });
    mocks.useSeasonEmployees.mockReturnValue({
      data: {
        items: [
          { employeeUserId: 501, employeeName: 'Employee A', active: true },
          { employeeUserId: 502, employeeName: 'Employee B', active: true },
        ],
      },
    });
    mocks.useCreateTask.mockReturnValue({
      mutate: mocks.createMutate,
      isPending: false,
    });
    mocks.useUpdateTask.mockReturnValue({
      mutateAsync: mocks.updateTaskMutateAsync,
      isPending: false,
    });
    mocks.useUpdateTaskStatus.mockReturnValue({
      mutate: mocks.updateStatusMutate,
      mutateAsync: mocks.updateStatusMutateAsync,
      isPending: false,
    });
    mocks.useDeleteTask.mockReturnValue({
      mutate: mocks.deleteMutate,
      isPending: false,
    });

    mocks.updateTaskMutateAsync.mockResolvedValue({});
    mocks.updateStatusMutateAsync.mockResolvedValue({});
  });

  it('calls update mutation for each selected task on bulk reassign', async () => {
    const queryClient = createQueryClient();
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
    const { result } = renderHook(() => useTaskWorkspace(), { wrapper });

    act(() => {
      result.current.setSelectedTasks(['101', '102']);
      result.current.setReassignOpen(true);
    });

    await act(async () => {
      await result.current.handleReassign(501);
    });

    expect(mocks.updateTaskMutateAsync).toHaveBeenCalledTimes(2);
    expect(mocks.updateTaskMutateAsync).toHaveBeenCalledWith({
      id: 101,
      data: expect.objectContaining({
        title: 'Spray Field A',
        dueDate: '2026-06-02',
        assigneeUserId: 501,
      }),
    });
    expect(mocks.updateTaskMutateAsync).toHaveBeenCalledWith({
      id: 102,
      data: expect.objectContaining({
        title: 'Inspect Plot',
        dueDate: '2026-06-04',
        assigneeUserId: 501,
      }),
    });
    expect(result.current.reassignOpen).toBe(false);
  });

  it('calls update mutation for each selected task on bulk due date change', async () => {
    const queryClient = createQueryClient();
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
    const { result } = renderHook(() => useTaskWorkspace(), { wrapper });

    act(() => {
      result.current.setSelectedTasks(['101', '102']);
      result.current.setDueDateOpen(true);
    });

    await act(async () => {
      await result.current.handleBulkDueDateChange('2026-06-20');
    });

    expect(mocks.updateTaskMutateAsync).toHaveBeenCalledTimes(2);
    expect(mocks.updateTaskMutateAsync).toHaveBeenCalledWith({
      id: 101,
      data: expect.objectContaining({
        title: 'Spray Field A',
        dueDate: '2026-06-20',
      }),
    });
    expect(mocks.updateTaskMutateAsync).toHaveBeenCalledWith({
      id: 102,
      data: expect.objectContaining({
        title: 'Inspect Plot',
        dueDate: '2026-06-20',
      }),
    });
    expect(result.current.dueDateOpen).toBe(false);
  });

  it('blocks bulk actions when season is locked', async () => {
    mocks.useOptionalSeason.mockReturnValue({
      selectedSeasonId: 33,
      selectedSeason: { id: 33, status: 'COMPLETED' },
    });

    const queryClient = createQueryClient();
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
    const { result } = renderHook(() => useTaskWorkspace(), { wrapper });

    act(() => {
      result.current.setSelectedTasks(['101']);
    });

    await act(async () => {
      await result.current.handleReassign(501);
      await result.current.handleBulkDueDateChange('2026-06-25');
    });

    expect(mocks.updateTaskMutateAsync).not.toHaveBeenCalled();
    expect(mocks.toastError).toHaveBeenCalled();
  });
});
