import { describe, expect, it } from 'vitest';
import type { Season } from '@/entities/season';
import { formatSeasonOptionLabel, getSeasonFarmName } from './seasonDisplay';

const season = (overrides: Partial<Season> = {}): Season => ({
  id: 1,
  seasonName: 'Vụ Hè Thu 2026',
  plotId: 12,
  cropId: 3,
  startDate: '2026-04-20',
  status: 'ACTIVE',
  farmName: 'Nông trại An Phú',
  cropName: 'Lúa',
  varietyName: 'Đài Thơm 8',
  ...overrides,
});

describe('season dashboard display', () => {
  it('includes the linked farm in the season selector label', () => {
    expect(formatSeasonOptionLabel(season())).toBe(
      'Vụ Hè Thu 2026 · Lúa Đài Thơm 8 · Nông trại An Phú',
    );
  });

  it('does not render empty parentheses or separators when optional names are missing', () => {
    expect(formatSeasonOptionLabel(season({ farmName: null, cropName: null, varietyName: null })))
      .toBe('Vụ Hè Thu 2026');
  });

  it('uses an explicit fallback instead of leaving the farm card blank', () => {
    expect(getSeasonFarmName(season({ farmName: '   ' }))).toBe('Chưa có thông tin nông trại');
  });
});
