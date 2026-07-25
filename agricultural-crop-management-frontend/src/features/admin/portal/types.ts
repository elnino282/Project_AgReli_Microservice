import type { BreadcrumbPath } from "@/features/shared/layout/types";

export type AdminView =
  | "dashboard"
  | "marketplace-dashboard"
  | "marketplace-products"
  | "marketplace-orders"
  | "search"
  | "inventory"
  | "incidents"
  | "alerts"
  | "audit-logs"
  | "users-roles"
  | "farms-plots"
  | "crops-varieties"
  | "reports"
  | "documents"
  | "farm-documents"
  | "profile"
  | "settings"
  | "cert-audits"
  | "user-guide";

export type AdminViewConfig = {
  titleKey: string;
  breadcrumbLabelKey?: string;
};

// Type definition helpers
export type BuildBreadcrumbs = (view: AdminView) => BreadcrumbPath[];
