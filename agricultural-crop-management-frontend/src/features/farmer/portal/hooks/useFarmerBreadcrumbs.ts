import { useFarmById } from '@/entities/farm';
import { useSeasonById } from '@/entities/season';
import type { BreadcrumbPath } from '@/features/shared/layout/types';
import {
  useMarketplaceFarmerOrderDetail,
  useMarketplaceFarmerProductDetail,
} from '@/features/marketplace/hooks';
import { useI18n } from '@/shared/lib/hooks/useI18n';
import { useSeason } from '@/shared/contexts';
import { useLocation } from 'react-router-dom';

import { getFarmerBreadcrumbLabel } from '../constants';
import type { FarmerView } from '../types';

const WORKSPACE_MODULE_LABEL_KEYS: Record<string, string> = {
  tasks: 'nav.tasks',
  expenses: 'nav.expenses',
  'field-logs': 'nav.fieldLogs',
  disease: 'nav.disease',
  harvest: 'nav.harvest',
  'labor-management': 'nav.laborManagement',
  'nutrient-inputs': 'nav.nutrientInputs',
  'irrigation-water-analyses': 'nav.irrigationWaterAnalysis',
  'soil-tests': 'nav.soilTests',
  reports: 'nav.reports',
};

const MARKETPLACE_ROOT: BreadcrumbPath = {
  label: 'Marketplace',
  href: '/farmer/marketplace-dashboard',
  kind: 'module',
};

const parsePositiveId = (value: string | undefined): number | null => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};

const entityFallback = (label: string, id: number | null) => (id ? `${label} #${id}` : label);

export function useFarmerBreadcrumbs(currentView: FarmerView): BreadcrumbPath[] {
  const { t } = useI18n();
  const location = useLocation();
  const { selectedSeason } = useSeason();
  const pathParts = location.pathname.split('/').filter(Boolean);
  const section = pathParts[1] ?? 'dashboard';

  const farmId = section === 'farms' ? parsePositiveId(pathParts[2]) : null;
  const workspaceSeasonId =
    section === 'seasons' && pathParts[3] === 'workspace'
      ? parsePositiveId(pathParts[2])
      : null;
  const marketplaceProductId =
    section === 'marketplace-products' && pathParts[2] !== 'new'
      ? parsePositiveId(pathParts[2])
      : null;
  const marketplaceOrderId =
    section === 'marketplace-orders' ? parsePositiveId(pathParts[2]) : null;

  const farmQuery = useFarmById(farmId ?? 0, { enabled: Boolean(farmId) });
  const seasonQuery = useSeasonById(workspaceSeasonId ?? 0, {
    enabled: Boolean(workspaceSeasonId),
  });
  const productQuery = useMarketplaceFarmerProductDetail(marketplaceProductId ?? undefined);
  const orderQuery = useMarketplaceFarmerOrderDetail(marketplaceOrderId ?? undefined);

  const portal: BreadcrumbPath = {
    label: t('breadcrumb.portal.farmer', 'Farmer Portal'),
    href: '/farmer/dashboard',
    kind: 'portal',
  };

  if (section === 'dashboard') {
    return [
      portal,
      { label: t('nav.dashboard'), href: '/farmer/dashboard', kind: 'module' },
    ];
  }

  if (section === 'farms') {
    const crumbs: BreadcrumbPath[] = [
      portal,
      { label: t('nav.farms'), href: '/farmer/farms', kind: 'module' },
    ];

    if (farmId) {
      crumbs.push({
        label: farmQuery.data?.name ?? entityFallback(t('breadcrumb.fallback.farm', 'Farm'), farmId),
        kind: 'farm',
        loading: farmQuery.isLoading,
      });
    }

    return crumbs;
  }

  if (workspaceSeasonId) {
    const season = seasonQuery.data ?? selectedSeason;
    const modulePath = pathParts[4];
    const crumbs: BreadcrumbPath[] = [
      portal,
      { label: t('nav.seasons'), href: '/farmer/seasons', kind: 'module' },
    ];

    crumbs.push({
      label: season?.farmName ?? entityFallback(t('breadcrumb.fallback.farm', 'Farm'), season?.farmId ?? null),
      href: season?.farmId ? `/farmer/farms/${season.farmId}` : undefined,
      kind: 'farm',
      loading: seasonQuery.isLoading,
    });
    crumbs.push({
      label: season?.plotName ?? entityFallback(t('breadcrumb.fallback.plot', 'Plot'), season?.plotId ?? null),
      kind: 'plot',
      loading: seasonQuery.isLoading,
    });
    crumbs.push({
      label: season?.seasonName ?? entityFallback(t('breadcrumb.fallback.season', 'Season'), workspaceSeasonId),
      href: `/farmer/seasons/${workspaceSeasonId}/workspace`,
      kind: 'season',
      loading: seasonQuery.isLoading,
    });

    if (modulePath) {
      crumbs.push({
        label: t(WORKSPACE_MODULE_LABEL_KEYS[modulePath] ?? 'common.details', modulePath),
        kind: 'module',
      });
    }

    return crumbs;
  }

  if (section.startsWith('marketplace')) {
    const marketplaceRoot = {
      ...MARKETPLACE_ROOT,
      label: t('nav.marketplace'),
    };
    const crumbs: BreadcrumbPath[] = [portal, marketplaceRoot];

    if (section === 'marketplace-dashboard') {
      crumbs.push({ label: t('nav.marketplaceDashboard', 'Marketplace Dashboard'), kind: 'module' });
      return crumbs;
    }

    if (section === 'marketplace-products') {
      crumbs.push({
        label: t('nav.marketplaceProducts', 'Marketplace Products'),
        href: '/farmer/marketplace-products',
        kind: 'module',
      });

      if (pathParts[2] === 'new') {
        crumbs.push({ label: t('breadcrumb.action.create', 'Create'), kind: 'action' });
      } else if (marketplaceProductId) {
        crumbs.push({
          label: productQuery.data?.name ?? entityFallback(t('breadcrumb.fallback.product', 'Product'), marketplaceProductId),
          href: `/farmer/marketplace-products/${marketplaceProductId}`,
          kind: 'record',
          loading: productQuery.isLoading,
        });
        if (pathParts[3] === 'edit') {
          crumbs.push({ label: t('breadcrumb.action.edit', 'Edit'), kind: 'action' });
        }
      }

      return crumbs;
    }

    if (section === 'marketplace-orders') {
      crumbs.push({
        label: t('nav.marketplaceOrders', 'Marketplace Orders'),
        href: '/farmer/marketplace-orders',
        kind: 'module',
      });

      if (marketplaceOrderId) {
        crumbs.push({
          label: orderQuery.data?.orderCode ?? entityFallback(t('breadcrumb.fallback.order', 'Order'), marketplaceOrderId),
          kind: 'record',
          loading: orderQuery.isLoading,
        });
      }

      return crumbs;
    }
  }

  return [
    portal,
    {
      label: getFarmerBreadcrumbLabel(currentView, t),
      href: `/farmer/${currentView}`,
      kind: 'module',
    },
  ];
}
