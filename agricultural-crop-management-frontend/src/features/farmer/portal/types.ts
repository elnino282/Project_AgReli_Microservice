import type { BreadcrumbPath } from '@/features/shared/layout/types';

/**
 * Available views in the farmer portal
 */
export type FarmerView =
  | 'dashboard'
  | 'search'
  | 'farms'
  | 'plots'
  | 'seasons'
  | 'tasks'
  | 'field-logs'
  | 'expenses'
  | 'harvest'
  | 'nutrient-inputs'
  | 'suppliers-supplies'
  | 'labor-management'
  | 'inventory'
  | 'product-warehouse'
  | 'marketplace-workspace'
  | 'marketplace-dashboard'
  | 'marketplace-products'
  | 'marketplace-orders'
  | 'documents'
  | 'farm-documents'
  | 'incidents'
  | 'notifications'
  | 'ai-assistant'
  // Keep these for backward compatibility (accessible via other routes)
  | 'crops'
  | 'reports'
  | 'profile'
  | 'settings'
  | 'user-guide';

/**
 * Configuration for each farmer view
 */
export interface FarmerViewConfig {
  title: string;
  breadcrumbLabel: string;
}

/**
 * Function type for building breadcrumbs
 */
export type BuildBreadcrumbs = (view: FarmerView) => BreadcrumbPath[];



