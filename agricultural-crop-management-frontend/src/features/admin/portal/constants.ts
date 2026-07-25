import type { AdminView, AdminViewConfig } from "./types";

export const ADMIN_VIEW_CONFIG: Record<AdminView, AdminViewConfig> = {
  dashboard: { titleKey: "admin.portal.views.dashboard.title", breadcrumbLabelKey: "admin.portal.views.dashboard.breadcrumb" },
  "marketplace-dashboard": { titleKey: "admin.portal.views.marketplaceDashboard.title", breadcrumbLabelKey: "admin.portal.views.marketplaceDashboard.breadcrumb" },
  "marketplace-products": { titleKey: "admin.portal.views.marketplaceProducts.title", breadcrumbLabelKey: "admin.portal.views.marketplaceProducts.breadcrumb" },
  "marketplace-orders": { titleKey: "admin.portal.views.marketplaceOrders.title", breadcrumbLabelKey: "admin.portal.views.marketplaceOrders.breadcrumb" },
  search: { titleKey: "admin.portal.views.search.title", breadcrumbLabelKey: "admin.portal.views.search.breadcrumb" },
  inventory: { titleKey: "admin.portal.views.inventory.title", breadcrumbLabelKey: "admin.portal.views.inventory.breadcrumb" },
  incidents: { titleKey: "admin.portal.views.incidents.title", breadcrumbLabelKey: "admin.portal.views.incidents.breadcrumb" },
  alerts: { titleKey: "admin.portal.views.alerts.title", breadcrumbLabelKey: "admin.portal.views.alerts.breadcrumb" },
  "audit-logs": { titleKey: "admin.portal.views.auditLogs.title", breadcrumbLabelKey: "admin.portal.views.auditLogs.breadcrumb" },
  "users-roles": {
    titleKey: "admin.portal.views.usersRoles.title",
    breadcrumbLabelKey: "admin.portal.views.usersRoles.breadcrumb",
  },
  "farms-plots": {
    titleKey: "admin.portal.views.farmsPlots.title",
    breadcrumbLabelKey: "admin.portal.views.farmsPlots.breadcrumb",
  },
  "crops-varieties": {
    titleKey: "admin.portal.views.cropsVarieties.title",
    breadcrumbLabelKey: "admin.portal.views.cropsVarieties.breadcrumb",
  },
  reports: { titleKey: "admin.portal.views.reports.title", breadcrumbLabelKey: "admin.portal.views.reports.breadcrumb" },
  documents: { titleKey: "admin.portal.views.documents.title", breadcrumbLabelKey: "admin.portal.views.documents.breadcrumb" },
  "farm-documents": { titleKey: "admin.portal.views.farmDocuments.title", breadcrumbLabelKey: "admin.portal.views.farmDocuments.breadcrumb" },
  profile: { titleKey: "admin.portal.views.profile.title", breadcrumbLabelKey: "admin.portal.views.profile.breadcrumb" },
  settings: { titleKey: "admin.portal.views.settings.title", breadcrumbLabelKey: "admin.portal.views.settings.breadcrumb" },
  "cert-audits": { titleKey: "admin.portal.views.certAudits.title", breadcrumbLabelKey: "admin.portal.views.certAudits.breadcrumb" },
  "user-guide": { titleKey: "admin.portal.views.userGuide.title", breadcrumbLabelKey: "admin.portal.views.userGuide.breadcrumb" },
};

export const getAdminViewTitleKey = (view: AdminView): string =>
  ADMIN_VIEW_CONFIG[view]?.titleKey ?? ADMIN_VIEW_CONFIG.dashboard.titleKey;

export const getAdminBreadcrumbLabelKey = (view: AdminView): string | undefined =>
  ADMIN_VIEW_CONFIG[view]?.breadcrumbLabelKey;
