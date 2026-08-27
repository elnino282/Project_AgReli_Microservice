import { describe, expect, it } from 'vitest';
import { transformApiToFeature } from './utils';

const apiPlot = {
  id: 1,
  farmId: 2,
  plotName: 'Lô A1',
  area: 5,
  soilType: 'Đất phù sa',
  status: 'ACTIVE',
};

describe('plot soil result mapping', () => {
  it('does not invent pH when the database has no soil test', () => {
    const plot = transformApiToFeature(apiPlot);

    expect(plot.pH).toBeUndefined();
    expect(plot.soilTestDate).toBeUndefined();
  });

  it('maps the latest persisted soil-test metrics into the plot view model', () => {
    const plot = transformApiToFeature(apiPlot, {
      id: 8,
      seasonId: 3,
      plotId: 1,
      sampleDate: '2026-04-05',
      soilPh: 6.2,
      electricalConductivityDsM: 0.42,
      soilOrganicMatterPct: 3.5,
      mineralNKgPerHa: 45,
      nitrateMgPerKg: 15.5,
      ammoniumMgPerKg: 20.2,
      status: 'measured',
      sourceType: 'lab_measured',
      labReference: 'LAB-2604-001',
    });

    expect(plot.pH).toBe(6.2);
    expect(plot.electricalConductivity).toBe(0.42);
    expect(plot.organicMatter).toBe(3.5);
    expect(plot.soilTestLabReference).toBe('LAB-2604-001');
  });
});
