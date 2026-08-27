import httpClient from '@/shared/api/http';
import type { PageResponse } from '@/shared/api/types';
import type {
  Season,
  SeasonDetailResponse as SeasonDetail,
  SeasonCreateRequest as CreateSeasonRequest,
  SeasonCompleteRequest as CompleteSeasonRequest,
  SeasonCancelRequest as CancelSeasonRequest,
  SeasonListParams as SeasonSearchParams,
} from '../model/types';

export interface ApiResponse<T> {
  code: number;
  result: T;
  message?: string;
}

export interface PesticideRecordResponse {
  id: number;
  seasonId: number;
  plotId: number;
  fieldLogId?: number | null;
  pesticideName: string;
  activeIngredient?: string | null;
  phiDays: number;
  harvestAllowedDate: string;
  applicationDate: string;
  applicationMethod?: string | null;
  dosage?: string | null;
  targetPest?: string | null;
  note?: string | null;
  createdBy: number;
  createdAt?: string | null;
  updatedAt?: string | null;
}

type SeasonPagePayload = Partial<PageResponse<Season>> & {
  content?: Season[];
  currentPage?: number;
  pageSize?: number;
};

export const seasonsApi = {
  async searchSeasons(params: SeasonSearchParams): Promise<PageResponse<Season>> {
    const { farmId, ...supportedParams } = params;
    const response = await httpClient.get<ApiResponse<SeasonPagePayload>>('/api/v1/seasons', {
      params: supportedParams,
    });
    const payload = response.data.result ?? {};
    const rawItems = Array.isArray(payload.items)
      ? payload.items
      : Array.isArray(payload.content)
        ? payload.content
        : [];
    const items = farmId == null
      ? rawItems
      : rawItems.filter((season) => season.farmId === farmId);

    return {
      items,
      page: Number(payload.page ?? payload.currentPage ?? 0),
      size: Number(payload.size ?? payload.pageSize ?? supportedParams.size ?? 20),
      totalElements: farmId == null
        ? Number(payload.totalElements ?? items.length)
        : items.length,
      totalPages: farmId == null
        ? Number(payload.totalPages ?? (items.length > 0 ? 1 : 0))
        : (items.length > 0 ? 1 : 0),
    };
  },

  async getSeason(id: number): Promise<SeasonDetail> {
    const response = await httpClient.get<ApiResponse<SeasonDetail>>(`/api/v1/seasons/${id}`);
    return response.data.result;
  },

  async createSeason(data: CreateSeasonRequest): Promise<SeasonDetail> {
    const response = await httpClient.post<ApiResponse<SeasonDetail>>('/api/v1/seasons', data);
    return response.data.result;
  },

  async startSeason(id: number, data?: { actualStartDate?: string }): Promise<Season> {
    const response = await httpClient.post<ApiResponse<Season>>(`/api/v1/seasons/${id}/start`, data);
    return response.data.result;
  },

  async completeSeason(id: number, data: CompleteSeasonRequest): Promise<Season> {
    const response = await httpClient.post<ApiResponse<Season>>(`/api/v1/seasons/${id}/complete`, data);
    return response.data.result;
  },

  async cancelSeason(id: number, data?: CancelSeasonRequest): Promise<Season> {
    const response = await httpClient.post<ApiResponse<Season>>(`/api/v1/seasons/${id}/cancel`, data);
    return response.data.result;
  },

  async getActivePHI(seasonId: number): Promise<any[]> {
    const response = await httpClient.get<ApiResponse<any[]>>(`/api/v1/seasons/${seasonId}/phi/active`);
    return response.data.result;
  },

  async getPesticideRecords(seasonId: number): Promise<PesticideRecordResponse[]> {
    const response = await httpClient.get<ApiResponse<PesticideRecordResponse[]>>(
      `/api/v1/seasons/${seasonId}/phi/records`,
    );
    return response.data.result;
  },
};
