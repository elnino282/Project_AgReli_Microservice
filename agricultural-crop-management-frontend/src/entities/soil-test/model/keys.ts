import type { SoilTestListQuery } from './types';

export const soilTestKeys = {
  all: ['soil-test'] as const,
  lists: () => [...soilTestKeys.all, 'list'] as const,
  listBySeasonBase: (seasonId: number) => [...soilTestKeys.lists(), 'season', seasonId] as const,
  listBySeason: (seasonId: number, params?: SoilTestListQuery) =>
    [...soilTestKeys.lists(), 'season', seasonId, params] as const,
  latestByPlotsBase: () => [...soilTestKeys.all, 'latest-by-plots'] as const,
  latestByPlots: (plotIds: number[]) => [...soilTestKeys.latestByPlotsBase(), [...plotIds].sort((a, b) => a - b)] as const,
};
