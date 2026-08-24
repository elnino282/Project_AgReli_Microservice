import type { DashboardFdnOverview } from '@/entities/dashboard';
import { useDashboardFdnOverview } from '@/entities/dashboard';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SustainabilityOverviewWidget } from './SustainabilityOverviewWidget';

vi.mock('@/entities/dashboard', async () => {
  const actual = await vi.importActual<typeof import('@/entities/dashboard')>('@/entities/dashboard');
  return { ...actual, useDashboardFdnOverview: vi.fn() };
});

const metric = (value: number | null, status: 'measured' | 'estimated' | 'missing' = 'measured') => ({
  value,
  unit: 'kg_n_per_ha',
  status,
  confidence: 90,
  calculationMode: 'explicit_budget',
  assumptions: [],
  missingInputs: [],
});

const overview = {
  scope: 'farm',
  entityId: '9',
  seasonId: 33,
  calculationMode: 'explicit_budget',
  confidence: 91,
  sustainableScore: { value: 80, label: 'good', components: {}, weights: {} },
  fdn: {
    total: 68,
    mineral: 54,
    organic: 14,
    level: 'medium',
    status: 'measured',
    thresholdSource: 'backend',
    lowMaxExclusive: 50,
    mediumMaxExclusive: 80,
    mineralHighMin: 60,
    explanation: 'Persisted inputs',
  },
  nue: 62,
  nOutput: 42,
  nSurplus: 26,
  currentSeason: null,
  yield: { estimated: 1200, unit: 'kg' },
  inputsBreakdown: {
    mineralFertilizerN: 54,
    organicFertilizerN: 14,
    biologicalFixationN: 0,
    irrigationWaterN: 0,
    atmosphericDepositionN: 0,
    seedImportN: 0,
    soilLegacyN: 0,
    controlSupplyN: 0,
  },
  unit: 'kg N/ha',
  dataQuality: [],
  dataQualitySummary: null,
  missingInputs: ['SOIL_TEST'],
  unavailableReasons: [],
  notes: [],
  recommendations: ['Bổ sung mẫu đất đã xác minh.'],
  recommendationSource: 'RULE_ENGINE',
  sustainableScoreMetric: metric(80),
  fdnTotalMetric: metric(68),
  fdnMineralMetric: metric(54),
  fdnOrganicMetric: metric(14),
  nueMetric: metric(62),
  nOutputMetric: metric(42),
  nSurplusMetric: metric(26),
  estimatedYieldMetric: metric(1200, 'estimated'),
  historicalTrend: [],
} as DashboardFdnOverview;

const renderWidget = () => render(
  <QueryClientProvider client={new QueryClient()}>
    <MemoryRouter>
      <SustainabilityOverviewWidget seasonId={33} />
    </MemoryRouter>
  </QueryClientProvider>,
);

describe('SustainabilityOverviewWidget', () => {
  beforeEach(() => {
    vi.mocked(useDashboardFdnOverview).mockReturnValue({
      data: overview,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useDashboardFdnOverview>);
  });

  it('renders persisted FDN metrics and links inputs to the selected season workspace', () => {
    renderWidget();

    expect(useDashboardFdnOverview).toHaveBeenCalledWith(
      { scope: 'farm' },
      expect.objectContaining({ enabled: true }),
    );
    expect(screen.getByText('68 kg N/ha')).toBeInTheDocument();
    expect(screen.getByText('Bổ sung mẫu đất đã xác minh.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Kiểm tra đất' })).toHaveAttribute(
      'href',
      '/farmer/seasons/33/workspace/soil-tests',
    );
  });
});
