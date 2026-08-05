import {
    useMutation,
    useQuery,
    useQueryClient,
    type UseMutationOptions,
    type UseQueryOptions,
} from '@tanstack/react-query';
import type { PageResponse } from '@/shared/api/types';
import { expenseKeys } from '../model/keys';
import { expenseApi } from './client';
import type {
    ExpenseListParams,
    Expense,
    ExpenseCreateRequest,
    ExpenseUpdateRequest,
    BudgetTracker,
    ExpenseCategoryAnalytics,
    ExpenseTaskAnalytics,
    ExpenseVendorAnalytics,
    ExpenseTimeSeries,
} from '../model/types';

type CreateExpenseVariables = {
    seasonId: number;
    data: ExpenseCreateRequest;
};

type UpdateExpenseVariables = {
    id: number;
    data: ExpenseUpdateRequest;
};

type DeleteExpenseVariables = {
    id: number;
    seasonId: number;
};

/**
 * Hook to fetch paginated list of expenses for a season
 */
export const useExpensesBySeason = (
    seasonId: number,
    params?: ExpenseListParams,
    options?: Omit<UseQueryOptions<PageResponse<Expense>, Error>, 'queryKey' | 'queryFn'>
) => useQuery({
    queryKey: expenseKeys.listBySeason(seasonId, params),
    queryFn: () => expenseApi.listBySeason(seasonId, params),
    enabled: seasonId > 0,
    staleTime: 5 * 60 * 1000,
    ...options,
});

/**
 * Hook to fetch all farmer expenses across seasons
 */
export const useAllFarmerExpenses = (
    params?: ExpenseListParams,
    options?: Omit<UseQueryOptions<PageResponse<Expense>, Error>, 'queryKey' | 'queryFn'>
) => useQuery({
    queryKey: expenseKeys.listAll(params),
    queryFn: () => expenseApi.listAll(params),
    staleTime: 5 * 60 * 1000,
    ...options,
});

/**
 * Hook to fetch a single expense by ID
 */
export const useExpenseById = (
    id: number,
    options?: Omit<UseQueryOptions<Expense, Error>, 'queryKey' | 'queryFn'>
) => useQuery({
    queryKey: expenseKeys.detail(id),
    queryFn: () => expenseApi.getById(id),
    enabled: id > 0,
    staleTime: 5 * 60 * 1000,
    ...options,
});

export const useBudgetTracker = (
    seasonId: number,
    options?: Omit<UseQueryOptions<BudgetTracker, Error>, 'queryKey' | 'queryFn'>
) => useQuery({
    queryKey: expenseKeys.tracker(seasonId),
    queryFn: () => expenseApi.getBudgetTracker(seasonId),
    enabled: seasonId > 0,
    staleTime: 5 * 60 * 1000,
    ...options,
});

export const useExpenseAnalyticsByCategory = (
    params?: ExpenseListParams,
    options?: Omit<UseQueryOptions<ExpenseCategoryAnalytics[], Error>, 'queryKey' | 'queryFn'>
) => useQuery({
    queryKey: expenseKeys.analyticsByCategory(params),
    queryFn: () => expenseApi.analyticsByCategory(params),
    staleTime: 5 * 60 * 1000,
    ...options,
});

export const useExpenseAnalyticsByTask = (
    params?: ExpenseListParams,
    options?: Omit<UseQueryOptions<ExpenseTaskAnalytics[], Error>, 'queryKey' | 'queryFn'>
) => useQuery({
    queryKey: expenseKeys.analyticsByTask(params),
    queryFn: () => expenseApi.analyticsByTask(params),
    staleTime: 5 * 60 * 1000,
    ...options,
});

export const useExpenseAnalyticsByVendor = (
    params?: ExpenseListParams,
    options?: Omit<UseQueryOptions<ExpenseVendorAnalytics[], Error>, 'queryKey' | 'queryFn'>
) => useQuery({
    queryKey: expenseKeys.analyticsByVendor(params),
    queryFn: () => expenseApi.analyticsByVendor(params),
    staleTime: 5 * 60 * 1000,
    ...options,
});

export const useExpenseAnalyticsTimeSeries = (
    params?: ExpenseListParams & { granularity?: 'DAY' | 'WEEK' | 'MONTH' },
    options?: Omit<UseQueryOptions<ExpenseTimeSeries[], Error>, 'queryKey' | 'queryFn'>
) => useQuery({
    queryKey: expenseKeys.analyticsTimeSeries(params),
    queryFn: () => expenseApi.analyticsTimeSeries(params),
    staleTime: 5 * 60 * 1000,
    ...options,
});


/**
 * Hook to create a new expense
 */
export const useCreateExpense = (
    options?: Omit<UseMutationOptions<Expense, Error, CreateExpenseVariables>, 'mutationFn'>
) => {
    const queryClient = useQueryClient();
    return useMutation({
        ...options,
        mutationFn: ({ seasonId, data }) => expenseApi.create(seasonId, data),
        onSuccess: async (_data, variables, _context, _mutationContext) => {
            await queryClient.invalidateQueries({ queryKey: expenseKeys.lists() });
            await queryClient.invalidateQueries({ queryKey: expenseKeys.analytics() });
            await queryClient.invalidateQueries({ queryKey: expenseKeys.tracker(variables.seasonId) });
            await options?.onSuccess?.(_data, variables, _context, _mutationContext);
        },
    });
};

/**
 * Hook to update an expense
 */
export const useUpdateExpense = (
    options?: Omit<UseMutationOptions<Expense, Error, UpdateExpenseVariables>, 'mutationFn'>
) => {
    const queryClient = useQueryClient();
    return useMutation({
        ...options,
        mutationFn: ({ id, data }) => expenseApi.update(id, data),
        onSuccess: async (_data, variables, _context, _mutationContext) => {
            await queryClient.invalidateQueries({ queryKey: expenseKeys.detail(variables.id) });
            await queryClient.invalidateQueries({ queryKey: expenseKeys.lists() });
            await queryClient.invalidateQueries({ queryKey: expenseKeys.analytics() });

            const seasonId = variables.data.seasonId;
            if (seasonId && seasonId > 0) {
                await queryClient.invalidateQueries({ queryKey: expenseKeys.tracker(seasonId) });
            }

            await options?.onSuccess?.(_data, variables, _context, _mutationContext);
        },
    });
};

/**
 * Hook to delete an expense
 */
export const useDeleteExpense = (
    options?: Omit<UseMutationOptions<void, Error, DeleteExpenseVariables>, 'mutationFn'>
) => {
    const queryClient = useQueryClient();
    return useMutation({
        ...options,
        mutationFn: ({ id }) => expenseApi.delete(id),
        onSuccess: async (_data, variables, _context, _mutationContext) => {
            await queryClient.invalidateQueries({ queryKey: expenseKeys.lists() });
            await queryClient.invalidateQueries({ queryKey: expenseKeys.analytics() });
            await queryClient.invalidateQueries({ queryKey: expenseKeys.tracker(variables.seasonId) });
            await options?.onSuccess?.(_data, variables, _context, _mutationContext);
        },
    });
};
