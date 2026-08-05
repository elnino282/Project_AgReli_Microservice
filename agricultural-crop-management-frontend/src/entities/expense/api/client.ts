import httpClient from '@/shared/api/http';
import { parseApiResponse, parsePageResponse, type PageResponse } from '@/shared/api/types';
import {
    ExpenseListParamsSchema,
    ExpenseSchema,
    ExpenseCreateRequestSchema,
    ExpenseUpdateRequestSchema,
    BudgetTrackerSchema,
    ExpenseCategoryAnalyticsSchema,
    ExpenseTaskAnalyticsSchema,
    ExpenseVendorAnalyticsSchema,
    ExpenseTimeSeriesSchema,
} from '../model/schemas';
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

const normalizeExpenseListParams = (params?: ExpenseListParams) => {
    const validatedParams = params ? ExpenseListParamsSchema.parse(params) : undefined;
    if (!validatedParams) {
        return undefined;
    }

    const { fromDate, toDate, ...rest } = validatedParams;
    return {
        ...rest,
        from: fromDate,
        to: toDate,
    };
};

export const expenseApi = {
    /**
     * List all farmer expenses across seasons
     * GET /api/v1/expenses (with optional seasonId, q, from, to filters)
     */
    listAll: async (params?: ExpenseListParams): Promise<PageResponse<Expense>> => {
        const normalizedParams = normalizeExpenseListParams(params);
        const response = await httpClient.get('/api/v1/expenses', { params: normalizedParams });
        return parsePageResponse(response.data, ExpenseSchema);
    },

    /**
     * List expenses for a specific season
     * GET /api/v1/seasons/{seasonId}/expenses
     */
    listBySeason: async (seasonId: number, params?: ExpenseListParams): Promise<PageResponse<Expense>> => {
        const normalizedParams = normalizeExpenseListParams(params);
        const response = await httpClient.get(`/api/v1/seasons/${seasonId}/expenses`, { params: normalizedParams });
        return parsePageResponse(response.data, ExpenseSchema);
    },

    getById: async (id: number): Promise<Expense> => {
        const response = await httpClient.get(`/api/v1/expenses/${id}`);
        return parseApiResponse(response.data, ExpenseSchema);
    },

    create: async (seasonId: number, data: ExpenseCreateRequest): Promise<Expense> => {
        const validatedPayload = ExpenseCreateRequestSchema.parse(data);
        const response = await httpClient.post(`/api/v1/seasons/${seasonId}/expenses`, validatedPayload);
        return parseApiResponse(response.data, ExpenseSchema);
    },

    update: async (id: number, data: ExpenseUpdateRequest): Promise<Expense> => {
        const validatedPayload = ExpenseUpdateRequestSchema.parse(data);
        const response = await httpClient.put(`/api/v1/expenses/${id}`, validatedPayload);
        return parseApiResponse(response.data, ExpenseSchema);
    },

    delete: async (id: number): Promise<void> => {
        await httpClient.delete(`/api/v1/expenses/${id}`);
    },

    getBudgetTracker: async (seasonId: number): Promise<BudgetTracker> => {
        const response = await httpClient.get(`/api/v1/seasons/${seasonId}/budget-tracker`);
        return parseApiResponse(response.data, BudgetTrackerSchema);
    },

    analyticsByCategory: async (params?: ExpenseListParams): Promise<ExpenseCategoryAnalytics[]> => {
        const normalizedParams = normalizeExpenseListParams(params);
        const response = await httpClient.get('/api/v1/expenses/analytics/by-category', { params: normalizedParams });
        return parseApiResponse(response.data, ExpenseCategoryAnalyticsSchema.array());
    },

    analyticsByTask: async (params?: ExpenseListParams): Promise<ExpenseTaskAnalytics[]> => {
        const normalizedParams = normalizeExpenseListParams(params);
        const response = await httpClient.get('/api/v1/expenses/analytics/by-task', { params: normalizedParams });
        return parseApiResponse(response.data, ExpenseTaskAnalyticsSchema.array());
    },

    analyticsByVendor: async (params?: ExpenseListParams): Promise<ExpenseVendorAnalytics[]> => {
        const normalizedParams = normalizeExpenseListParams(params);
        const response = await httpClient.get('/api/v1/expenses/analytics/by-vendor', { params: normalizedParams });
        return parseApiResponse(response.data, ExpenseVendorAnalyticsSchema.array());
    },

    analyticsTimeSeries: async (
        params?: ExpenseListParams & { granularity?: 'DAY' | 'WEEK' | 'MONTH' }
    ): Promise<ExpenseTimeSeries[]> => {
        const normalizedParams = normalizeExpenseListParams(params);
        const response = await httpClient.get('/api/v1/expenses/analytics/timeseries', {
            params: { ...normalizedParams, granularity: params?.granularity },
        });
        return parseApiResponse(response.data, ExpenseTimeSeriesSchema.array());
    },

    exportCsv: async (params?: ExpenseListParams): Promise<Blob> => {
        const normalizedParams = normalizeExpenseListParams(params);
        const response = await httpClient.get('/api/v1/expenses/export', {
            params: normalizedParams,
            responseType: 'blob',
        });
        return response.data as Blob;
    },

    uploadAttachment: async (id: number, file: File): Promise<Expense> => {
        const formData = new FormData();
        formData.append('file', file);
        const response = await httpClient.post(`/api/v1/expenses/${id}/attachment`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
        return parseApiResponse(response.data, ExpenseSchema);
    },
};
