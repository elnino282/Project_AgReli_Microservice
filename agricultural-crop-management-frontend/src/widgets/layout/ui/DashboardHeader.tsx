import { Link } from "react-router-dom";
import { ArrowLeft, Store } from "lucide-react";
import { useAuth } from "@/features/auth";
import { useI18n } from "@/shared/lib/hooks/useI18n";
import { Button } from "@/shared/ui";

/**
 * DashboardHeader Component
 *
 * Renders a "Back to Shop" / "View your store" link within dashboard layouts
 * so users can navigate from farmer/admin/employee dashboards back to public
 * marketplace routes.
 *
 * Behaviour:
 * - farmer role → "View your store" linking to /marketplace
 * - admin role → "Back to Shop" linking to /marketplace
 * - any other role → "Back to Shop" linking to /marketplace
 *
 * Mounted only in DashboardLayout paths (within the existing AppShell Header area).
 */

function resolveLinkProps(role: string | undefined): {
  labelKey: string;
  fallback: string;
  icon: React.ReactNode;
} {
  if (role === "farmer") {
    return {
      labelKey: "dashboardHeader.viewYourStore",
      fallback: "View your store",
      icon: <Store size={14} />,
    };
  }
  return {
    labelKey: "dashboardHeader.backToShop",
    fallback: "Back to Shop",
    icon: <ArrowLeft size={14} />,
  };
}

export function DashboardHeader() {
  const { t } = useI18n();
  const { user } = useAuth();
  const { labelKey, fallback, icon } = resolveLinkProps(user?.role);

  return (
    <Link to="/marketplace">
      <Button
        variant="ghost"
        size="sm"
        className="gap-1.5 text-white/80 hover:text-white hover:bg-white/10"
      >
        {icon}
        {t(labelKey, fallback)}
      </Button>
    </Link>
  );
}
