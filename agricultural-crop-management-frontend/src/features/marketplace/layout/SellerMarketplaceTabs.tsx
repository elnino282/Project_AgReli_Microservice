import { LayoutDashboard, Package, ShoppingBag, Truck } from "lucide-react";
import { NavLink } from "react-router-dom";
// eslint-disable-next-line no-restricted-imports
import { useI18n } from "@/shared/lib/hooks/useI18n";
import { cn } from "@/shared/lib";

const sellerTabs = [
  {
    to: "/farmer/marketplace-dashboard",
    labelKey: "marketplaceSeller.tabs.items.overview.label",
    labelFallback: "Overview",
    descriptionKey: "marketplaceSeller.tabs.items.overview.description",
    descriptionFallback: "Store summary",
    icon: LayoutDashboard,
  },
  {
    to: "/farmer/marketplace-products",
    labelKey: "marketplaceSeller.tabs.items.products.label",
    labelFallback: "Products",
    descriptionKey: "marketplaceSeller.tabs.items.products.description",
    descriptionFallback: "Listings and stock",
    icon: Package,
  },
  {
    to: "/farmer/marketplace-orders",
    labelKey: "marketplaceSeller.tabs.items.orders.label",
    labelFallback: "Orders",
    descriptionKey: "marketplaceSeller.tabs.items.orders.description",
    descriptionFallback: "Buyer orders",
    icon: ShoppingBag,
  },
  {
    to: "/farmer/marketplace-deliveries",
    labelKey: "marketplaceSeller.tabs.items.deliveries.label",
    labelFallback: "Vận chuyển",
    descriptionKey: "marketplaceSeller.tabs.items.deliveries.description",
    descriptionFallback: "Fulfillment logs",
    icon: Truck,
  },
] as const;

export function SellerMarketplaceTabs() {
  const { t } = useI18n();

  return (
    <nav
      className="mb-6 border-b border-border/60"
      aria-label={t("marketplaceSeller.tabs.ariaLabel", "Marketplace seller tabs")}
    >
      <div className="-mb-px flex flex-nowrap overflow-x-auto gap-6">
        {sellerTabs.map((tab) => {
          const Icon = tab.icon;

          return (
            <NavLink
              key={tab.to}
              to={tab.to}
              end={tab.to.endsWith("dashboard")}
              className={({ isActive }) =>
                cn(
                  "flex min-w-0 shrink-0 items-center gap-2 border-b-2 px-1 py-4 text-sm font-medium transition-colors",
                  isActive
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:border-border hover:text-foreground",
                )
              }
            >
              <Icon size={18} />
              <span>{t(tab.labelKey, tab.labelFallback)}</span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
