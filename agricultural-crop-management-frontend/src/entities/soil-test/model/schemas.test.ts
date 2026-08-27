import { describe, expect, it } from 'vitest';
import { CreateSoilTestRequestSchema, SoilTestResponseSchema } from './schemas';

describe('soil-test schemas', () => {
  it('parses valid create request payload', () => {
    const parsed = CreateSoilTestRequestSchema.parse({
      plotId: 22,
      sampleDate: '2026-03-18',
      soilPh: 6.2,
      electricalConductivityDsM: 0.42,
      mineralNKgPerHa: 14.5,
      soilOrganicMatterPct: 2.1,
      sourceType: 'user_entered',
    });

    expect(parsed.plotId).toBe(22);
    expect(parsed.mineralNKgPerHa).toBe(14.5);
    expect(parsed.soilPh).toBe(6.2);
  });

  it('rejects pH outside the physical 0-14 scale', () => {
    const result = CreateSoilTestRequestSchema.safeParse({
      plotId: 22,
      sampleDate: '2026-03-18',
      soilPh: 14.1,
      mineralNKgPerHa: 14.5,
      sourceType: 'lab_measured',
    });

    expect(result.success).toBe(false);
  });

  it('fails create request when mineral N is missing', () => {
    const result = CreateSoilTestRequestSchema.safeParse({
      plotId: 22,
      sampleDate: '2026-03-18',
      sourceType: 'lab_measured',
    });

    expect(result.success).toBe(false);
  });

  it('keeps null contribution as null instead of coercing to zero', () => {
    const parsed = SoilTestResponseSchema.parse({
      id: 1,
      seasonId: 33,
      plotId: 22,
      sampleDate: '2026-03-18',
      soilPh: '6.20',
      electricalConductivityDsM: '0.4200',
      soilOrganicMatterPct: 2.1,
      mineralNKgPerHa: 14.5,
      nitrateMgPerKg: null,
      ammoniumMgPerKg: null,
      mineralNUnit: 'kg_n_per_ha',
      concentrationUnit: 'mg_per_kg',
      estimatedNContributionKg: null,
      contributionUnit: 'kg_n',
      measured: true,
      status: 'measured',
      sourceType: 'lab_measured',
      sourceDocument: null,
      labReference: null,
      note: null,
      createdByUserId: 7,
      createdAt: '2026-03-18T09:10:00',
    });

    expect(parsed.estimatedNContributionKg).toBeNull();
    expect(parsed.soilPh).toBe(6.2);
  });
});
