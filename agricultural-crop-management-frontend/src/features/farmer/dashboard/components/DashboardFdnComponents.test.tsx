import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { DashboardFdnOverview, DashboardFieldMapItem } from '@/entities/dashboard';
import { FdnAssistantPanel } from './FdnAssistantPanel';
import { FdnHistoryChart } from './FdnHistoryChart';
import { FdnKpiCards } from './FdnKpiCards';
import { FieldSustainabilityMap } from './FieldSustainabilityMap';
import { NitrogenInputBreakdown } from './NitrogenInputBreakdown';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: { defaultValue?: string }) => options?.defaultValue ?? key,
  }),
}));

afterEach(() => {
  vi.unstubAllEnvs();
});

function metric(
  status: 'measured' | 'estimated' | 'missing' | 'unavailable',
  value: number | null,
  unit = '%'
) {
  return {
    value,
    unit,
    status,
    confidence: 0.72,
    calculationMode: 'hybrid_estimated',
    assumptions: [],
    missingInputs: [],
  };
}

function overviewFixture(overrides?: Partial<DashboardFdnOverview>): DashboardFdnOverview {
  return {
    scope: 'field',
    entityId: '22',
    seasonId: 33,
    calculationMode: 'hybrid_estimated',
    confidence: 0.72,
    sustainableScore: {
      value: 64,
      label: 'Fair',
      components: { dependency: 28 },
      weights: { dependency: 0.3 },
    },
    fdn: {
      total: 72,
      mineral: 60,
      organic: 12,
      level: 'high',
      status: 'estimated',
      thresholdSource: 'config_default_v1',
      lowMaxExclusive: 40,
      mediumMaxExclusive: 70,
      mineralHighMin: 60,
      explanation: 'FDN is above configured medium threshold (70%).',
    },
    nue: 43,
    nOutput: 41,
    nSurplus: 36,
    currentSeason: {
      seasonName: 'Mùa 33',
      cropName: 'Lúa',
      dayCount: 55,
      stage: 'ACTIVE',
    },
    yield: {
      estimated: 6.2,
      unit: 't/ha',
    },
    inputsBreakdown: {
      mineralFertilizerN: 60,
      organicFertilizerN: 12,
      biologicalFixationN: 8,
      irrigationWaterN: 6,
      atmosphericDepositionN: 5,
      seedImportN: 0,
      soilLegacyN: 0,
      controlSupplyN: null,
    },
    unit: 'kg N/ha/season',
    dataQuality: [
      {
        source: 'MINERAL_FERTILIZER',
        method: 'measured',
        confidence: 1,
      },
    ],
    dataQualitySummary: {
      overallConfidence: 0.72,
      measuredInputCount: 1,
      estimatedInputCount: 3,
      missingInputCount: 1,
      unavailableInputCount: 0,
      summary: 'Overall confidence 72%; 1 measured, 3 estimated/mixed, 1 missing inputs.',
    },
    missingInputs: ['CONTROL_SUPPLY'],
    unavailableReasons: ['NO_HARVEST'],
    notes: ['Sample note'],
    recommendations: ['Backend recommendation'],
    recommendationSource: 'product_rule_config_v1',
    sustainableScoreMetric: metric('estimated', 64),
    fdnTotalMetric: metric('estimated', 72),
    fdnMineralMetric: metric('estimated', 60),
    fdnOrganicMetric: metric('estimated', 12),
    nueMetric: metric('estimated', 43),
    nOutputMetric: metric('estimated', 41, 'kg N/ha/season'),
    nSurplusMetric: metric('estimated', 36, 'kg N/ha/season'),
    estimatedYieldMetric: metric('estimated', 6.2, 't/ha'),
    historicalTrend: [],
    ...overrides,
  };
}

describe('Dashboard FDN components', () => {
  it('FdnKpiCards does not render fake zero for missing yield/surplus metrics', () => {
    const overview = overviewFixture({
      estimatedYieldMetric: metric('missing', 0, 't/ha'),
      nSurplusMetric: metric('missing', 0, 'kg N/ha/season'),
    });

    render(<FdnKpiCards overview={overview} isLoading={false} />);

    expect(screen.getAllByText('Insufficient data').length).toBeGreaterThan(0);
    expect(screen.queryByText('0.00 t/ha')).not.toBeInTheDocument();
  });

  it('FdnAssistantPanel renders backend recommendation list without frontend-injected advice', () => {
    const overview = overviewFixture({
      confidence: 0.3,
      recommendations: ['Collect additional measured input data first.'],
    });

    render(<FdnAssistantPanel overview={overview} isLoading={false} />);

    expect(screen.getByText('Collect additional measured input data first.')).toBeInTheDocument();
    expect(
      screen.queryByText(
        'Data confidence is low, prioritize data verification before strong fertilizer adjustments.'
      )
    ).not.toBeInTheDocument();
  });

  it('FdnAssistantPanel suggests actions from backend missingInputs when recommendations are empty', () => {
    const overview = overviewFixture({
      recommendations: [],
      missingInputs: ['IRRIGATION_WATER', 'MINERAL_FERTILIZER'],
      unavailableReasons: ['MISSING_NITROGEN_INPUT'],
      fdnTotalMetric: metric('unavailable', null),
      sustainableScoreMetric: metric('unavailable', null),
    });

    render(<FdnAssistantPanel overview={overview} isLoading={false} />);

    expect(
      screen.getByText('Add irrigation water analysis records so irrigation N can be measured.')
    ).toBeInTheDocument();
    expect(
      screen.getByText('Record mineral/organic fertilizer nitrogen inputs in the season workspace.')
    ).toBeInTheDocument();
  });

  it('NitrogenInputBreakdown shows empty state when inputs are not available', () => {
    const overview = overviewFixture({
      inputsBreakdown: {
        mineralFertilizerN: null,
        organicFertilizerN: null,
        biologicalFixationN: null,
        irrigationWaterN: null,
        atmosphericDepositionN: null,
        seedImportN: null,
        soilLegacyN: null,
        controlSupplyN: null,
      },
      dataQualitySummary: {
        overallConfidence: 0.2,
        measuredInputCount: 0,
        estimatedInputCount: 0,
        missingInputCount: 5,
        unavailableInputCount: 0,
        summary: 'Low confidence',
      },
      unavailableReasons: [],
    });

    render(<NitrogenInputBreakdown overview={overview} isLoading={false} />);

    expect(
      screen.getByText('Not enough input data to build nitrogen breakdown yet.')
    ).toBeInTheDocument();
  });

  it('FdnHistoryChart shows useful empty state when history is empty', () => {
    const overview = overviewFixture({
      unavailableReasons: [],
      historicalTrend: [],
    });
    render(<FdnHistoryChart overview={overview} isLoading={false} />);

    expect(screen.getByText('No historical season metrics available.')).toBeInTheDocument();
  });

  it('FdnHistoryChart renders unavailable reasons and CTA when history is unavailable', () => {
    const overview = overviewFixture({
      unavailableReasons: ['NO_HARVEST', 'INSUFFICIENT_HISTORY'],
      historicalTrend: [],
    });

    render(<FdnHistoryChart overview={overview} isLoading={false} />);

    expect(screen.getByText('FDN dashboard metrics are unavailable')).toBeInTheDocument();
    expect(screen.getByText('Add harvest record')).toBeInTheDocument();
  });

  it('FieldSustainabilityMap shows missing-boundary list when no field has valid boundary', async () => {
    vi.stubEnv('VITE_GOOGLE_MAPS_API_KEY', 'test-key');

    const items: DashboardFieldMapItem[] = [
      {
        fieldId: 1,
        fieldName: 'Field A',
        farmId: 7,
        farmName: 'Farm 7',
        boundaryGeoJson: null,
        center: null,
        boundaryIssue: 'MISSING_BOUNDARY_GEOJSON',
        cropName: 'Rice',
        seasonName: 'Season 33',
        fdnLevel: 'high',
        fdnTotal: null,
        fdnMineral: null,
        fdnOrganic: null,
        nue: null,
        confidence: null,
        calculationMode: 'hybrid_estimated',
        thresholdSource: 'config_default_v1',
        recommendationSource: 'product_rule_config_v1',
        missingInputs: ['MINERAL_FERTILIZER'],
        inputsBreakdown: {
          mineralFertilizerN: null,
          organicFertilizerN: null,
          biologicalFixationN: null,
          irrigationWaterN: null,
          atmosphericDepositionN: null,
          seedImportN: null,
          soilLegacyN: null,
          controlSupplyN: null,
        },
        recommendations: [],
      },
    ];

    render(
      <MemoryRouter>
        <FieldSustainabilityMap
          mapData={{
            fieldsWithBoundary: [],
            fieldsMissingBoundary: items,
            defaultViewport: null,
            unavailableReason: 'MISSING_BOUNDARY_AND_FARM_LOCATION',
          }}
          isLoading={false}
        />
      </MemoryRouter>
    );

    expect(await screen.findByText('dashboard.fdn.map.missingBoundaryTitle')).toBeInTheDocument();
    expect(screen.getByText('dashboard.fdn.map.missingBoundaryListTitle')).toBeInTheDocument();
    expect(screen.getByText('dashboard.fdn.map.manageFieldsCta')).toBeInTheDocument();
  });
});
