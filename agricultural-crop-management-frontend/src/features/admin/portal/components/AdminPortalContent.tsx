import { getAdminViewTitleKey } from "../constants";
import type { AdminView } from "../types";
import { UnderConstruction } from "./UnderConstruction";
import { useI18n } from "@/shared/lib/hooks/useI18n";

// Feature Imports
import { AdminDashboard } from "@/features/admin";
import { AdminPreferences } from "@/features/admin/preferences";
import { AdminProfile } from "@/features/admin/profile";
import { ReportsAnalytics } from "@/features/admin/reports-analytics";
import {
  AdminMarketplaceDashboardPage,
  AdminMarketplaceOrdersPage,
  AdminMarketplaceProductsPage,
} from "@/pages/marketplace";

// Admin Pages
import { AdminAlertsPage } from "@/pages/admin/AdminAlertsPage";
import { AdminAuditLogsPage } from "@/pages/admin/AdminAuditLogsPage";
import { AdminIncidentsPage } from "@/pages/admin/AdminIncidentsPage";
import { AdminInventoryPage } from "@/pages/admin/AdminInventoryPage";
import { CropsVarietiesPage } from "@/pages/admin/CropsVarietiesPage";
import { FarmsPlotsPage } from "@/pages/admin/FarmsPlotsPage";
import { UsersRolesPage } from "@/pages/admin/UsersRolesPage";
import { AdminSearchPage } from "@/pages/admin/AdminSearchPage";
import { UserGuideContent } from "@/features/shared/user-guide";

import { AdminDocumentsPage } from "@/pages/admin/AdminDocumentsPage";
import { AdminCertAuditsPage } from "@/pages/admin/AdminCertAuditsPage";

type AdminPortalContentProps = {
  currentView: AdminView;
};

export function AdminPortalContent({ currentView }: AdminPortalContentProps) {
  const { t } = useI18n();

  switch (currentView) {
    case "dashboard":
      return <AdminDashboard />;
    case "marketplace-dashboard":
      return <AdminMarketplaceDashboardPage />;
    case "marketplace-products":
      return <AdminMarketplaceProductsPage />;
    case "marketplace-orders":
      return <AdminMarketplaceOrdersPage />;
    case "search":
      return <AdminSearchPage />;
    case "inventory":
      return <AdminInventoryPage />;
    case "incidents":
      return <AdminIncidentsPage />;
    case "alerts":
      return <AdminAlertsPage />;
    case "audit-logs":
      return <AdminAuditLogsPage />;
    case "users-roles":
      return <UsersRolesPage />;
    case "farms-plots":
      return <FarmsPlotsPage />;
    case "crops-varieties":
      return <CropsVarietiesPage />;
    case "reports":
      return <ReportsAnalytics />;
    case "cert-audits":
      return <AdminCertAuditsPage />;

    case "documents":
      return <AdminDocumentsPage />;
    case "farm-documents":
      return <AdminCertAuditsPage />;
    case "profile":
      return <AdminProfile />;
    case "settings":
      return <AdminPreferences />;
    case "user-guide":
      return <UserGuideContent portalType="ADMIN" />;
    default:
      return <UnderConstruction title={t(getAdminViewTitleKey(currentView))} />;
  }
}
