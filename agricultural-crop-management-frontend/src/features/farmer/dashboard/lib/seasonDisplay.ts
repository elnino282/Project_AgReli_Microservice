import type { Season } from '@/entities/season';

type DashboardSeason = Pick<
  Season,
  'seasonName' | 'farmName' | 'plotName' | 'cropName' | 'varietyName'
>;

const clean = (value?: string | null) => value?.trim() || null;

export const getSeasonFarmName = (season: DashboardSeason) =>
  clean(season.farmName) ?? 'Chưa có thông tin nông trại';

export const formatSeasonOptionLabel = (season: DashboardSeason) => {
  const cropName = clean(season.cropName);
  const varietyName = clean(season.varietyName);
  const cultivationName = cropName && varietyName
    ? cropName.toLocaleLowerCase('vi-VN').includes(varietyName.toLocaleLowerCase('vi-VN'))
      ? cropName
      : `${cropName} ${varietyName}`
    : cropName ?? varietyName;

  return [clean(season.seasonName), cultivationName, clean(season.farmName)]
    .filter((value): value is string => Boolean(value))
    .join(' · ');
};
