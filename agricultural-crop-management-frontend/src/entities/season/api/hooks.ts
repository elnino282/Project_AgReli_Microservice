import {
    type UseMutationOptions,
    type UseQueryOptions,
    type UseQueryResult,
    type UseMutationResult
} from '@tanstack/react-query';
import type { PageResponse } from '@/shared/api/types';
import { seasonKeys } from '../model/keys';
import type {
    SeasonListParams,
    Season,
    SeasonDetailResponse as SeasonDetail,
    SeasonCreateRequest,
    SeasonUpdateRequest,
    SeasonStatusUpdateRequest,
    SeasonStartRequest,
    SeasonCompleteRequest,
    SeasonCancelRequest,
} from '../model/types';
import type { MySeasonResponse } from '@/api/generated/model';

import {
    useSearchSeasons,
    useGetSeason,
    useCreateSeason as useOrvalCreateSeason,
    useUpdateSeason as useOrvalUpdateSeason,
    useUpdateSeasonStatus as useOrvalUpdateSeasonStatus,
    useStartSeason as useOrvalStartSeason,
    useCompleteSeason as useOrvalCompleteSeason,
    useCancelSeason as useOrvalCancelSeason,
    useDeleteSeason as useOrvalDeleteSeason,
    useArchiveSeason as useOrvalArchiveSeason,
    useGetMySeasons,
    useSearchSeasonsByKeyword as useOrvalSearchSeasonsByKeyword,
} from '@/entities/season/api/generated/season-service';

// ═══════════════════════════════════════════════════════════════
// ADAPTER HOOKS
// These wrap the Orval generated hooks to hide the AxiosResponse 
// and ApiResponse boilerplate from the UI components.
// ═══════════════════════════════════════════════════════════════

export const useSeasons = (
    params?: SeasonListParams,
    options?: Omit<UseQueryOptions<any, any, any>, 'queryKey' | 'queryFn'>
): UseQueryResult<PageResponse<Season>, Error> => {
    const query = useSearchSeasons(params as any, {
        query: {
            staleTime: 5 * 60 * 1000,
            ...options
        }
    });

    return {
        ...query,
        data: query.data?.data?.result ? {
            items: (query.data.data.result.items || []) as unknown as Season[],
            page: query.data.data.result.page || 0,
            size: query.data.data.result.size || 20,
            totalElements: query.data.data.result.totalElements || 0,
            totalPages: query.data.data.result.totalPages || 0,
        } : undefined
    } as UseQueryResult<PageResponse<Season>, Error>;
};

export const useSeasonsByCrop = (
    cropId: number,
    options?: Omit<UseQueryOptions<any, any, any>, 'queryKey' | 'queryFn'>
): UseQueryResult<PageResponse<Season>, Error> => useSeasons(
    { cropId, page: 0, size: 100 } as any,
    {
        enabled: cropId > 0,
        ...options,
    } as any
);

export const useSeasonById = (
    id: number,
    options?: Omit<UseQueryOptions<any, any, any>, 'queryKey' | 'queryFn'>
): UseQueryResult<SeasonDetail, Error> => {
    const query = useGetSeason(id, {
        query: {
            enabled: id > 0,
            staleTime: 5 * 60 * 1000,
            ...options
        }
    });

    return {
        ...query,
        data: query.data?.data?.result as unknown as SeasonDetail
    } as UseQueryResult<SeasonDetail, Error>;
};

export const useCreateSeason = (options?: any): UseMutationResult<SeasonDetail, Error, SeasonCreateRequest, unknown> => {
    const mutation = useOrvalCreateSeason({
        mutation: options
    });
    return {
        ...mutation,
        mutate: (data: SeasonCreateRequest, options?: any) => {
            mutation.mutate({ data: data as any }, options);
        },
        mutateAsync: async (data: SeasonCreateRequest) => {
            const res = await mutation.mutateAsync({ data: data as any });
            return res.data?.result as unknown as SeasonDetail;
        }
    } as any;
};

export const useUpdateSeason = (options?: any): UseMutationResult<SeasonDetail, Error, { id: number; data: SeasonUpdateRequest }, unknown> => {
    const mutation = useOrvalUpdateSeason({
        mutation: options
    });
    return {
        ...mutation,
        mutateAsync: async ({ id, data }: { id: number; data: SeasonUpdateRequest }) => {
            const res = await mutation.mutateAsync({ id, data: data as any });
            return res.data?.result as unknown as SeasonDetail;
        }
    } as any;
};

export const useUpdateSeasonStatus = (options?: any): UseMutationResult<Season, Error, { id: number; data: SeasonStatusUpdateRequest }, unknown> => {
    const mutation = useOrvalUpdateSeasonStatus({
        mutation: options
    });
    return {
        ...mutation,
        mutateAsync: async ({ id, data }: { id: number; data: SeasonStatusUpdateRequest }) => {
            const res = await mutation.mutateAsync({ id, data: data as any });
            return res.data?.result as unknown as Season;
        }
    } as any;
};

export const useStartSeason = (options?: any): UseMutationResult<Season, Error, { id: number; data?: SeasonStartRequest }, unknown> => {
    const mutation = useOrvalStartSeason({
        mutation: options
    });
    return {
        ...mutation,
        mutateAsync: async ({ id, data }: { id: number; data?: SeasonStartRequest }) => {
            const res = await mutation.mutateAsync({ id, data: data as any });
            return res.data?.result as unknown as Season;
        }
    } as any;
};

export const useCompleteSeason = (options?: any): UseMutationResult<Season, Error, { id: number; data: SeasonCompleteRequest }, unknown> => {
    const mutation = useOrvalCompleteSeason({
        mutation: options
    });
    return {
        ...mutation,
        mutateAsync: async ({ id, data }: { id: number; data: SeasonCompleteRequest }) => {
            const res = await mutation.mutateAsync({ id, data: data as any });
            return res.data?.result as unknown as Season;
        }
    } as any;
};

export const useCancelSeason = (options?: any): UseMutationResult<Season, Error, { id: number; data?: SeasonCancelRequest }, unknown> => {
    const mutation = useOrvalCancelSeason({
        mutation: options
    });
    return {
        ...mutation,
        mutateAsync: async ({ id, data }: { id: number; data?: SeasonCancelRequest }) => {
            const res = await mutation.mutateAsync({ id, data: data as any });
            return res.data?.result as unknown as Season;
        }
    } as any;
};

export const useDeleteSeason = (options?: any): UseMutationResult<void, Error, number, unknown> => {
    const mutation = useOrvalDeleteSeason({
        mutation: options
    });
    return {
        ...mutation,
        mutate: (id: number, options?: any) => {
            mutation.mutate({ id }, options);
        },
        mutateAsync: async (id: number) => {
            await mutation.mutateAsync({ id });
        }
    } as any;
};

export const useMySeasons = (options?: Omit<UseQueryOptions<any, any, any>, 'queryKey' | 'queryFn'>): UseQueryResult<MySeasonResponse[], Error> => {
    const query = useGetMySeasons({
        query: {
            staleTime: 5 * 60 * 1000,
            ...options
        }
    });

    return {
        ...query,
        data: (query.data?.data?.result || []) as unknown as MySeasonResponse[]
    } as UseQueryResult<MySeasonResponse[], Error>;
};

export const useArchiveSeason = (options?: any): UseMutationResult<Season, Error, number, unknown> => {
    const mutation = useOrvalArchiveSeason({
        mutation: options
    });
    return {
        ...mutation,
        mutate: (id: number, options?: any) => {
            mutation.mutate({ id }, options);
        },
        mutateAsync: async (id: number) => {
            const res = await mutation.mutateAsync({ id });
            return res.data?.result as unknown as Season;
        }
    } as any;
};

export const useSearchSeasonsByKeyword = (
    keyword: string,
    options?: Omit<UseQueryOptions<any, any, any>, 'queryKey' | 'queryFn'>
): UseQueryResult<Season[], Error> => {
    const query = useOrvalSearchSeasonsByKeyword({ q: keyword }, {
        query: {
            enabled: keyword.length > 0,
            staleTime: 30 * 1000,
            ...options
        }
    });

    return {
        ...query,
        data: (query.data?.data?.result || []) as unknown as Season[]
    } as UseQueryResult<Season[], Error>;
};
