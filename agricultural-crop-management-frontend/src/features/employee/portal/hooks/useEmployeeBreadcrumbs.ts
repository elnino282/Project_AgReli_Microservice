import { useEmployeeAssignedSeasons } from '@/entities/field-log';
import type { BreadcrumbPath } from '@/features/shared/layout/types';
import { useI18n } from '@/shared/lib/hooks/useI18n';
import { useLocation } from 'react-router-dom';

import type { EmployeeView } from '../types';

const MODULE_LABEL_KEYS: Record<EmployeeView, string> = {
  tasks: 'nav.tasks',
  progress: 'nav.progress',
  payroll: 'nav.payroll',
  workspace: 'employee.workspace.title',
  profile: 'userMenu.profile',
  settings: 'userMenu.preferences',
  'user-guide': 'nav.userGuide',
};

const WORKSPACE_MODULE_LABEL_KEYS: Record<string, string> = {
  'field-logs': 'nav.fieldLogs',
  disease: 'nav.disease',
};

const parsePositiveId = (value: string | undefined): number | null => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};

const entityFallback = (label: string, id: number | null) => (id ? `${label} #${id}` : label);

export function useEmployeeBreadcrumbs(currentView: EmployeeView): BreadcrumbPath[] {
  const { t } = useI18n();
  const location = useLocation();
  const pathParts = location.pathname.split('/').filter(Boolean);
  const section = pathParts[1] ?? 'tasks';
  const seasonId =
    section === 'seasons' && pathParts[3] === 'workspace'
      ? parsePositiveId(pathParts[2])
      : null;
  const { data: assignedSeasons = [], isLoading } = useEmployeeAssignedSeasons({
    enabled: Boolean(seasonId),
  });
  const assignedSeason = assignedSeasons.find((season) => season.seasonId === seasonId);

  const portal: BreadcrumbPath = {
    label: t('breadcrumb.portal.employee', 'Employee Portal'),
    href: '/employee/tasks',
    kind: 'portal',
  };

  if (seasonId) {
    const modulePath = pathParts[4] ?? 'field-logs';
    const crumbs: BreadcrumbPath[] = [
      portal,
      {
        label: t('employee.workspace.title'),
        href: '/employee/workspace',
        kind: 'module',
      },
      {
        label: assignedSeason?.farmName ?? entityFallback(t('breadcrumb.fallback.farm', 'Farm'), assignedSeason?.farmId ?? null),
        kind: 'farm',
        loading: isLoading,
      },
      {
        label: assignedSeason?.plotName ?? entityFallback(t('breadcrumb.fallback.plot', 'Plot'), assignedSeason?.plotId ?? null),
        kind: 'plot',
        loading: isLoading,
      },
      {
        label: assignedSeason?.seasonName ?? entityFallback(t('breadcrumb.fallback.season', 'Season'), seasonId),
        href: `/employee/seasons/${seasonId}/workspace`,
        kind: 'season',
        loading: isLoading,
      },
    ];

    crumbs.push({
      label: t(WORKSPACE_MODULE_LABEL_KEYS[modulePath] ?? 'common.details', modulePath),
      kind: 'module',
    });

    return crumbs;
  }

  return [
    portal,
    {
      label: t(MODULE_LABEL_KEYS[currentView] ?? 'nav.tasks'),
      href: `/employee/${currentView}`,
      kind: 'module',
    },
  ];
}
