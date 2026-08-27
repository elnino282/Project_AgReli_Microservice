import type { FarmerView, FarmerViewConfig } from "./types";

type Translator = (key: string, optionsOrDefault?: Record<string, unknown> | string) => string;

type FarmerViewTextConfig = FarmerViewConfig & {
  titleKey: string;
  breadcrumbKey: string;
};

/**
 * Configuration mapping for all farmer portal views
 */
export const FARMER_VIEW_CONFIG: Record<FarmerView, FarmerViewTextConfig> = {
  dashboard: {
    title: "Dashboard",
    breadcrumbLabel: "Dashboard",
    titleKey: "farmerPortal.views.dashboard.title",
    breadcrumbKey: "farmerPortal.views.dashboard.breadcrumb",
  },
  search: {
    title: "Search",
    breadcrumbLabel: "Search",
    titleKey: "farmerPortal.views.search.title",
    breadcrumbKey: "farmerPortal.views.search.breadcrumb",
  },
  farms: {
    title: "Farms & Plots",
    breadcrumbLabel: "Farms & Plots",
    titleKey: "farmerPortal.views.farms.title",
    breadcrumbKey: "farmerPortal.views.farms.breadcrumb",
  },
  plots: {
    title: "Plot Management",
    breadcrumbLabel: "Plot Management",
    titleKey: "farmerPortal.views.plots.title",
    breadcrumbKey: "farmerPortal.views.plots.breadcrumb",
  },
  seasons: {
    title: "Seasons",
    breadcrumbLabel: "Seasons",
    titleKey: "farmerPortal.views.seasons.title",
    breadcrumbKey: "farmerPortal.views.seasons.breadcrumb",
  },
  tasks: {
    title: "Tasks Workspace",
    breadcrumbLabel: "Tasks Workspace",
    titleKey: "farmerPortal.views.tasks.title",
    breadcrumbKey: "farmerPortal.views.tasks.breadcrumb",
  },
  "field-logs": {
    title: "Field Logs",
    breadcrumbLabel: "Field Logs",
    titleKey: "farmerPortal.views.fieldLogs.title",
    breadcrumbKey: "farmerPortal.views.fieldLogs.breadcrumb",
  },
  expenses: {
    title: "Expenses",
    breadcrumbLabel: "Expenses",
    titleKey: "farmerPortal.views.expenses.title",
    breadcrumbKey: "farmerPortal.views.expenses.breadcrumb",
  },
  harvest: {
    title: "Harvest",
    breadcrumbLabel: "Harvest",
    titleKey: "farmerPortal.views.harvest.title",
    breadcrumbKey: "farmerPortal.views.harvest.breadcrumb",
  },
  "nutrient-inputs": {
    title: "Nutrient Inputs",
    breadcrumbLabel: "Nutrient Inputs",
    titleKey: "farmerPortal.views.nutrientInputs.title",
    breadcrumbKey: "farmerPortal.views.nutrientInputs.breadcrumb",
  },
  "suppliers-supplies": {
    title: "Suppliers & Supplies",
    breadcrumbLabel: "Suppliers & Supplies",
    titleKey: "farmerPortal.views.suppliersSupplies.title",
    breadcrumbKey: "farmerPortal.views.suppliersSupplies.breadcrumb",
  },
  "labor-management": {
    title: "Labor Management",
    breadcrumbLabel: "Labor Management",
    titleKey: "farmerPortal.views.laborManagement.title",
    breadcrumbKey: "farmerPortal.views.laborManagement.breadcrumb",
  },
  inventory: {
    title: "Supply Warehouse",
    breadcrumbLabel: "Supply Warehouse",
    titleKey: "farmerPortal.views.inventory.title",
    breadcrumbKey: "farmerPortal.views.inventory.breadcrumb",
  },
  "product-warehouse": {
    title: "Product Warehouse",
    breadcrumbLabel: "Product Warehouse",
    titleKey: "farmerPortal.views.productWarehouse.title",
    breadcrumbKey: "farmerPortal.views.productWarehouse.breadcrumb",
  },
  "marketplace-workspace": {
    title: "Marketplace Workspace",
    breadcrumbLabel: "Marketplace",
    titleKey: "farmerPortal.views.marketplaceWorkspace.title",
    breadcrumbKey: "farmerPortal.views.marketplaceWorkspace.breadcrumb",
  },
  "marketplace-dashboard": {
    title: "Marketplace Dashboard",
    breadcrumbLabel: "Marketplace Dashboard",
    titleKey: "farmerPortal.views.marketplaceDashboard.title",
    breadcrumbKey: "farmerPortal.views.marketplaceDashboard.breadcrumb",
  },
  "marketplace-products": {
    title: "Marketplace Products",
    breadcrumbLabel: "Marketplace Products",
    titleKey: "farmerPortal.views.marketplaceProducts.title",
    breadcrumbKey: "farmerPortal.views.marketplaceProducts.breadcrumb",
  },
  "marketplace-orders": {
    title: "Marketplace Orders",
    breadcrumbLabel: "Marketplace Orders",
    titleKey: "farmerPortal.views.marketplaceOrders.title",
    breadcrumbKey: "farmerPortal.views.marketplaceOrders.breadcrumb",
  },
  documents: {
    title: "System Documents",
    breadcrumbLabel: "System Documents",
    titleKey: "farmerPortal.views.documents.title",
    breadcrumbKey: "farmerPortal.views.documents.breadcrumb",
  },
  "vietgap-workspace": {
    title: "VietGAP Workspace",
    breadcrumbLabel: "VietGAP Workspace",
    titleKey: "farmerPortal.views.vietGapWorkspace.title",
    breadcrumbKey: "farmerPortal.views.vietGapWorkspace.breadcrumb",
  },
  "farm-documents": {
    title: "VietGAP Documents",
    breadcrumbLabel: "VietGAP Documents",
    titleKey: "farmerPortal.views.farmDocuments.title",
    breadcrumbKey: "farmerPortal.views.farmDocuments.breadcrumb",
  },
  incidents: {
    title: "Incidents",
    breadcrumbLabel: "Incidents",
    titleKey: "farmerPortal.views.incidents.title",
    breadcrumbKey: "farmerPortal.views.incidents.breadcrumb",
  },
  notifications: {
    title: "Notifications",
    breadcrumbLabel: "Notifications",
    titleKey: "farmerPortal.views.notifications.title",
    breadcrumbKey: "farmerPortal.views.notifications.breadcrumb",
  },
  "ai-assistant": {
    title: "AI Assistant",
    breadcrumbLabel: "AI Assistant",
    titleKey: "farmerPortal.views.aiAssistant.title",
    breadcrumbKey: "farmerPortal.views.aiAssistant.breadcrumb",
  },
  crops: {
    title: "Crop Management",
    breadcrumbLabel: "Crop Management",
    titleKey: "farmerPortal.views.crops.title",
    breadcrumbKey: "farmerPortal.views.crops.breadcrumb",
  },
  reports: {
    title: "Reports",
    breadcrumbLabel: "Reports",
    titleKey: "farmerPortal.views.reports.title",
    breadcrumbKey: "farmerPortal.views.reports.breadcrumb",
  },
  profile: {
    title: "Profile",
    breadcrumbLabel: "Profile",
    titleKey: "farmerPortal.views.profile.title",
    breadcrumbKey: "farmerPortal.views.profile.breadcrumb",
  },
  settings: {
    title: "Preferences",
    breadcrumbLabel: "Preferences",
    titleKey: "farmerPortal.views.settings.title",
    breadcrumbKey: "farmerPortal.views.settings.breadcrumb",
  },
  "user-guide": {
    title: "User Guide",
    breadcrumbLabel: "User Guide",
    titleKey: "farmerPortal.views.userGuide.title",
    breadcrumbKey: "farmerPortal.views.userGuide.breadcrumb",
  },
};

function resolveViewConfig(view: FarmerView): FarmerViewTextConfig {
  return FARMER_VIEW_CONFIG[view] ?? FARMER_VIEW_CONFIG.dashboard;
}

/**
 * Get the display title for a farmer view
 */
export function getFarmerViewTitle(view: FarmerView, t?: Translator): string {
  const config = resolveViewConfig(view);
  return t ? t(config.titleKey, config.title) : config.title;
}

/**
 * Get the breadcrumb label for a farmer view
 */
export function getFarmerBreadcrumbLabel(view: FarmerView, t?: Translator): string {
  const config = resolveViewConfig(view);
  return t ? t(config.breadcrumbKey, config.breadcrumbLabel) : config.breadcrumbLabel;
}
