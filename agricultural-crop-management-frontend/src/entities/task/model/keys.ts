// ═══════════════════════════════════════════════════════════════
// TASK QUERY KEY FACTORY
// ═══════════════════════════════════════════════════════════════

import type { TaskListParams } from './types';

export const taskKeys = {
    all: ['task'] as const,
    lists: () => [...taskKeys.all, 'list'] as const,
    listBySeason: (seasonId: number, params?: TaskListParams) =>
        [...taskKeys.lists(), 'bySeason', seasonId, params] as const,
    listWorkspace: (params?: TaskListParams) => {
        const base = [...taskKeys.lists(), 'workspace'] as const;
        return params ? [...base, params] as const : base;
    },
    eligibleAssignees: (seasonId: number, params?: { taskId?: number; workTeamId?: number }) =>
        [...taskKeys.all, 'eligibleAssignees', seasonId, params] as const,
    details: () => [...taskKeys.all, 'detail'] as const,
    detail: (id: number) => [...taskKeys.details(), id] as const,
};
