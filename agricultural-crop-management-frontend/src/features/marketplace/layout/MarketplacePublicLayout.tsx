import { useCallback, useEffect, useRef, useState, type CSSProperties, type FormEvent } from "react";
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { createPortal } from "react-dom";
import { cn } from "@/shared/lib";
import {
  Bot,
  ChevronDown,
  Facebook,
  Instagram,
  LogOut,
  Menu,
  Package,
  Search,
  ShoppingCart,
  Store,
  Twitter,
  User,
  X,
  MapPin,
} from "lucide-react";
import { useAuth } from "@/features/auth";
import { Button } from "@/shared/ui";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/ui";
import {
  useMarketplaceCartCount,
  useMarketplaceCartMergeBridge,
  useScrolled,
} from "../hooks";
import { ThemeToggle } from "@/shared/ui/theme-toggle";
import { BuyerAiAssistantContext, type BuyerAiAssistantOpenInput } from "../ai/BuyerAiAssistantContext";
import { BuyerAiAssistantDrawer } from "../ai/BuyerAiAssistantDrawer";
import { SearchWindow } from "../search";
import "./MarketplacePublicLayout.css";

function resolvePortalRoute(role: string | undefined): string {
  switch (role) {
    case "admin":
      return "/admin/dashboard";
    case "employee":
      return "/employee/tasks";
    case "buyer":
      return "/marketplace/orders";
    default:
      return "/farmer/marketplace-dashboard";
  }
}

function resolvePortalButtonLabel(role: string | undefined) {
  switch (role) {
    case "admin":
      return "Quản trị";
    case "employee":
      return "Công việc";
    default:
      return "Quản lý";
  }
}

function formatRoleLabel(role: string | undefined) {
  switch (role) {
    case "admin":
      return "Admin";
    case "employee":
      return "Employee";
    case "farmer":
      return "Farmer";
    default:
      return "Buyer";
  }
}

const PRODUCTS_NAV_ACTIVE_STYLE = {
  color: "#ffffff",
  background: "rgba(255, 255, 255, 0.12)",
};

const MARKETPLACE_DOCUMENT_SCROLL_CLASS = "marketplace-document-scroll";
const BUYER_PORTAL_ACTIVE_CLASS = "portal-buyer-active";



function MarketplaceNavLink({
  to,
  label,
  onClick,
}: {
  to: string;
  label: string;
  onClick?: () => void;
}) {
  return (
    <NavLink
      to={to}
      onClick={onClick}
      className={({ isActive }) =>
        cn(
          "fb-nav-link rounded-full px-3 py-1 text-sm transition-colors",
          isActive
            ? "fb-active bg-white/10 font-semibold text-white ring-1 ring-white/25"
            : "font-medium text-white hover:bg-white/10 hover:text-emerald-100",
        )
      }
    >
      {label}
    </NavLink>
  );
}

function MarketplaceSearchBar({ className = "", onSearchClick }: { className?: string; onSearchClick?: () => void }) {
  return (
    <div 
      onClick={onSearchClick}
      className={`relative cursor-pointer ${className}`}
    >
      <Search
        className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2"
        style={{ color: "rgba(6, 95, 70, 0.62)" }}
      />
      <input
        type="text"
        readOnly
        placeholder="Tìm kiếm nông sản... (Ctrl+K)"
        className="fb-search-input w-full cursor-pointer rounded-full border py-2.5 pl-10 pr-12 text-sm outline-none transition focus:ring-2 focus:ring-white/30"
        style={{
          backgroundColor: "#F8FAF5",
          borderColor: "#DDE7D8",
          color: "#334155",
        }}
      />
      <kbd className="absolute right-4 top-1/2 -translate-y-1/2 hidden sm:inline-flex h-5 select-none items-center gap-0.5 rounded border border-border bg-muted px-1.5 font-mono text-[9px] font-medium text-muted-foreground opacity-80">
        Ctrl+K
      </kbd>
    </div>
  );
}

function MarketplaceFooter() {
  return (
    <footer className="marketplace-footer py-12 bg-primary text-[#FDFBF7]">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
          <div>
            <Link to="/marketplace" className="mb-4 flex items-center gap-2">
              <div className="marketplace-footer__logo rounded-md p-1.5">
                <Package size={24} />
              </div>
              <span className="marketplace-footer__brand text-xl font-bold">Farm ACM</span>
            </Link>
            <p className="marketplace-footer__description mb-4 text-sm">
              Nền tảng giao dịch nông sản minh bạch, kết nối trực tiếp từ nông
              trại đến bàn ăn của bạn.
            </p>
            <div className="flex gap-4 mt-4">
              <a
                href="#"
                className="marketplace-footer__social-link flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-[#1877F2] transition-colors hover:bg-white/20"
                aria-label="Facebook"
              >
                <Facebook size={20} fill="currentColor" />
              </a>
              <a
                href="#"
                className="marketplace-footer__social-link flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-[#1DA1F2] transition-colors hover:bg-white/20"
                aria-label="Twitter"
              >
                <Twitter size={20} fill="currentColor" />
              </a>
              <a
                href="#"
                className="marketplace-footer__social-link flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-[#E1306C] transition-colors hover:bg-white/20"
                aria-label="Instagram"
              >
                <Instagram size={20} />
              </a>
            </div>
          </div>

          <div>
            <h3 className="marketplace-footer__heading mb-4 font-semibold">Khám phá</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link
                  to="/marketplace/products"
                  className="marketplace-footer__link"
                >
                  Tất cả sản phẩm
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="marketplace-footer__heading mb-4 font-semibold">Hỗ trợ</h3>
            <ul className="marketplace-footer__list space-y-2 text-sm">
              <li>Câu hỏi thường gặp</li>
              <li>Chính sách vận chuyển</li>
              <li>Đổi trả và hoàn tiền</li>
              <li>Liên hệ</li>
            </ul>
          </div>

          <div>
            <h3 className="marketplace-footer__heading mb-4 font-semibold">
              Dành cho người bán
            </h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to="/sign-up" className="marketplace-footer__link">
                  Đăng ký bán hàng
                </Link>
              </li>
              <li className="marketplace-footer__muted">Hướng dẫn bán hàng</li>
              <li className="marketplace-footer__muted">Tiêu chuẩn chất lượng</li>
            </ul>
          </div>
        </div>

        <div className="marketplace-footer__bottom mt-8 border-t border-white/20 pt-8 text-center text-sm opacity-80">
          <p>&copy; {new Date().getFullYear()} FarmACM.</p>
        </div>
      </div>
    </footer>
  );
}

function MobileMenu({
  isOpen,
  onClose,
  isAuthenticated,
  userName,
  userRole,
  cartCount,
  onLogout,
  onSearchClick,
}: {
  isOpen: boolean;
  onClose: () => void;
  isAuthenticated: boolean;
  userName?: string;
  userRole?: string;
  cartCount: number;
  onLogout: () => void;
  onSearchClick: () => void;
}) {
  if (!isOpen) {
    return null;
  }

  const showPortalLink = Boolean(userRole && userRole !== "buyer");

  return (
    <div
      id="marketplace-mobile-menu"
      className="marketplace-header__mobile-menu border-t border-white/15"
      style={{ backgroundColor: "#065F46" }}
    >
      <div className="space-y-4 px-4 py-4">
        <MarketplaceSearchBar className="w-full" onSearchClick={onSearchClick} />

        <nav className="flex flex-col gap-3">
          <Link
            to="/marketplace"
            onClick={onClose}
            className="rounded-md px-2 py-1 text-sm font-medium text-white hover:bg-white/10 hover:text-emerald-100"
          >
            Trang chủ
          </Link>
          <Link
            to="/marketplace/products"
            onClick={onClose}
            className="rounded-md px-2 py-1 text-sm font-medium text-white hover:bg-white/10 hover:text-emerald-100"
          >
            Sản phẩm
          </Link>
          <Link
            to="/marketplace/farms"
            onClick={onClose}
            className="rounded-md px-2 py-1 text-sm font-medium text-white hover:bg-white/10 hover:text-emerald-100"
          >
            Nông trại
          </Link>
        </nav>

        <div className="border-t border-white/15 pt-3">
          {isAuthenticated ? (
            <div className="space-y-2">
              <div className="rounded-lg bg-white/10 px-3 py-2">
                <p className="text-sm font-medium text-white">
                  {userName ?? "Tài khoản của bạn"}
                </p>
                <p className="text-xs text-emerald-100">
                  {formatRoleLabel(userRole)}
                </p>
              </div>

              <Link
                to="/marketplace/cart"
                onClick={onClose}
                className="flex items-center gap-2 rounded-md px-2 py-1 text-sm text-white hover:bg-white/10 hover:text-emerald-100"
              >
                <ShoppingCart size={16} /> Giỏ hàng ({cartCount})
              </Link>

              {!showPortalLink ? (
                <Link
                  to="/marketplace/profile"
                  onClick={onClose}
                  className="flex items-center gap-2 rounded-md px-2 py-1 text-sm text-white hover:bg-white/10 hover:text-emerald-100"
                >
                  <User size={16} /> Hồ sơ của tôi
                </Link>
              ) : null}

              <Link
                to="/marketplace/orders"
                onClick={onClose}
                className="flex items-center gap-2 rounded-md px-2 py-1 text-sm text-white hover:bg-white/10 hover:text-emerald-100"
              >
                <Package size={16} /> Đơn hàng của tôi
              </Link>
              
              <Link
                to="/marketplace/traceability"
                onClick={onClose}
                className="flex items-center gap-2 rounded-md px-2 py-1 text-sm text-white hover:bg-white/10 hover:text-emerald-100"
              >
                <MapPin size={16} /> Truy xuất nguồn gốc
              </Link>

              {showPortalLink ? (
                <Link
                  to={resolvePortalRoute(userRole)}
                  onClick={onClose}
                  className="flex items-center gap-2 rounded-md px-2 py-1 text-sm text-white hover:bg-white/10 hover:text-emerald-100"
                >
                  <Store size={16} /> {resolvePortalButtonLabel(userRole)}
                </Link>
              ) : null}

              <Button
                type="button"
                variant="ghost"
                className="w-full justify-start px-2 text-sm text-white hover:bg-white/10 hover:text-emerald-100"
                onClick={() => {
                  onClose();
                  onLogout();
                }}
              >
                <LogOut size={16} /> Đăng xuất
              </Button>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <Link to="/sign-in" onClick={onClose}>
                <Button variant="ghost" className="w-full justify-start text-white hover:bg-white/10 hover:text-emerald-100">
                  Đăng nhập
                </Button>
              </Link>
              <Link to="/sign-up" onClick={onClose}>
                <Button className="w-full justify-start bg-white text-emerald-800 hover:bg-emerald-50">Đăng ký</Button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function MarketplacePublicLayout() {
  const { isAuthenticated, user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [buyerAiOpen, setBuyerAiOpen] = useState(false);
  const [buyerAiContext, setBuyerAiContext] = useState("");
  const [buyerAiInitialPrompt, setBuyerAiInitialPrompt] = useState("");
  const [buyerAiRequestId, setBuyerAiRequestId] = useState(0);
  const showPortalAction = isAuthenticated && user?.role !== "buyer";
  const showBuyerAiAssistant = isAuthenticated && user?.role === "buyer";

  const openBuyerAiAssistant = useCallback((input: BuyerAiAssistantOpenInput = {}) => {
    setBuyerAiContext(input.context ?? "");
    setBuyerAiInitialPrompt(input.prompt ?? "");
    setBuyerAiRequestId((current) => current + 1);
    setBuyerAiOpen(true);
  }, []);

  const handleLogout = useCallback(async () => {
    await logout();
    setMobileMenuOpen(false);
    navigate("/sign-in", { replace: true });
  }, [logout, navigate]);

  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, []);

  useEffect(() => {
    document.documentElement.classList.add(MARKETPLACE_DOCUMENT_SCROLL_CLASS);
    document.documentElement.classList.add(BUYER_PORTAL_ACTIVE_CLASS);
    document.body.classList.add(MARKETPLACE_DOCUMENT_SCROLL_CLASS);

    return () => {
      document.documentElement.classList.remove(MARKETPLACE_DOCUMENT_SCROLL_CLASS);
      document.documentElement.classList.remove(BUYER_PORTAL_ACTIVE_CLASS);
      document.body.classList.remove(MARKETPLACE_DOCUMENT_SCROLL_CLASS);
    };
  }, []);

  useMarketplaceCartMergeBridge();
  const cartCount = useMarketplaceCartCount();
  const cartBadgeLabel = cartCount > 99 ? "99+" : String(cartCount);
  const scrolled = useScrolled(80);

  return (
    <BuyerAiAssistantContext.Provider value={{ openAssistant: openBuyerAiAssistant }}>
      <div className="portal-buyer marketplace-buyer-portal flex min-h-screen flex-col bg-background text-foreground">
      <header
        className="marketplace-header fb-marketplace sticky top-0 z-50 w-full border-b border-primary/20 shadow-md transition-shadow bg-primary text-primary-foreground"
        style={{
          boxShadow: scrolled
            ? "0 4px 20px -2px rgba(0, 0, 0, 0.15)"
            : "none",
        }}
      >
        <div className="marketplace-header__inner container mx-auto px-4 relative">
          <div className="marketplace-header__left">
            <Link to="/marketplace" className="flex items-center gap-2 group">
              <div className="rounded-xl bg-white/10 p-2 text-white ring-1 ring-white/20 group-hover:bg-white/20 transition-colors">
                <Package size={22} strokeWidth={2.5} />
              </div>
              <span className="marketplace-header__brand-text text-xl font-bold text-white tracking-tight">
                FarmACM
              </span>
            </Link>

            <nav className="marketplace-header__nav ml-8">
              <NavLink
                to="/marketplace/products"
                className={({ isActive }) =>
                  cn(
                    "px-4 py-2 rounded-full text-sm font-medium transition-all",
                    isActive
                      ? "bg-white/15 text-white font-semibold"
                      : "text-primary-foreground/80 hover:text-white hover:bg-white/10"
                  )
                }
              >
                Sản phẩm
              </NavLink>
              <NavLink
                to="/marketplace/farms"
                className={({ isActive }) =>
                  cn(
                    "px-4 py-2 rounded-full text-sm font-medium transition-all",
                    isActive
                      ? "bg-white/15 text-white font-semibold"
                      : "text-primary-foreground/80 hover:text-white hover:bg-white/10"
                  )
                }
              >
                Nông trại
              </NavLink>
            </nav>
          </div>

          <div className="marketplace-header__desktop-search flex-1 max-w-md mx-8">
            <div onClick={() => setSearchOpen(true)} className="relative cursor-pointer group">
              <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-primary-foreground/50 group-hover:text-primary-foreground/80 transition-colors" />
              <input
                type="text"
                readOnly
                placeholder="Tìm kiếm nông sản, nông trại..."
                className="w-full cursor-pointer rounded-full border border-white/20 bg-white/10 py-2.5 pl-10 pr-12 text-sm text-white placeholder-white/50 outline-none transition-all group-hover:border-white/30 group-hover:bg-white/15 focus:ring-2 focus:ring-white/20"
              />
              <kbd className="absolute right-3 top-1/2 -translate-y-1/2 hidden sm:inline-flex h-5 select-none items-center rounded border border-white/10 bg-white/10 px-1.5 font-mono text-[10px] font-medium text-primary-foreground/70">
                Ctrl+K
              </kbd>
            </div>
          </div>

          <div className="marketplace-header__right flex items-center gap-2">
            <ThemeToggle className="text-primary-foreground/80 hover:bg-white/10 hover:text-white" />

            <Link
              to="/marketplace/cart"
              aria-label="Giỏ hàng"
              className="relative rounded-md p-2 text-primary-foreground/80 transition-colors hover:bg-white/10 hover:text-white"
            >
              <span className="marketplace-cart-icon">
                <ShoppingCart size={24} />
                {cartCount > 0 && (
                  <span
                    key={cartCount}
                    className="marketplace-cart-badge"
                    aria-label={`${cartBadgeLabel} sản phẩm trong giỏ hàng`}
                  >
                    {cartBadgeLabel}
                  </span>
                )}
              </span>
              {cartCount > 0 && (
                <span className="sr-only">
                  {cartBadgeLabel} sản phẩm trong giỏ hàng
                </span>
              )}
            </Link>

            <div className="marketplace-header__desktop-actions">
              {isAuthenticated ? (
                <>
                  {showPortalAction ? (
                    <>
                      <div className="marketplace-header__user flex flex-col items-end mr-2">
                        <span className="text-sm font-medium text-white">
                          {user?.name ?? "Người dùng"}
                        </span>
                        <span className="text-xs text-primary-foreground/70">
                          {formatRoleLabel(user?.role)}
                        </span>
                      </div>

                      <Button asChild variant="outline" size="sm" className="border-white/20 bg-white/10 text-white hover:bg-white/20 hover:text-white">
                        <Link to="/marketplace/orders">Đơn hàng</Link>
                      </Button>

                      <Button asChild variant="outline" size="sm" className="border-white/20 bg-white/10 text-white hover:bg-white/20 hover:text-white">
                        <Link to={resolvePortalRoute(user?.role)}>
                          <Store size={14} />{" "}
                          {resolvePortalButtonLabel(user?.role)}
                        </Link>
                      </Button>

                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          void handleLogout();
                        }}
                        className="text-primary-foreground/80 hover:bg-white/10 hover:text-white"
                        title="Đăng xuất"
                      >
                        <LogOut size={18} />
                      </Button>
                    </>
                  ) : (
                    <>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            className="flex items-center gap-2 text-primary-foreground/80 hover:bg-white/10 hover:text-white"
                          >
                            <User size={16} />
                            <span className="text-sm font-medium">
                              {user?.name ?? "Người dùng"}
                            </span>
                            <ChevronDown size={14} />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <div className="px-2 py-1.5">
                            <p className="text-sm font-medium text-foreground">
                              {user?.name ?? "Người dùng"}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {user?.email ?? ""}
                            </p>
                          </div>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem asChild>
                            <Link
                              to="/marketplace/profile"
                              className="flex items-center cursor-pointer"
                            >
                              <User size={16} className="mr-2" />
                              Hồ sơ của tôi
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link
                              to="/marketplace/orders"
                              className="flex items-center cursor-pointer"
                            >
                              <Package size={16} className="mr-2" />
                              Đơn hàng của tôi
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link
                              to="/marketplace/traceability"
                              className="flex items-center cursor-pointer"
                            >
                              <MapPin size={16} className="mr-2" />
                              Truy xuất nguồn gốc
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => {
                              void handleLogout();
                            }}
                            className="cursor-pointer text-red-600"
                          >
                            <LogOut size={16} className="mr-2" />
                            Đăng xuất
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </>
                  )}
                </>
              ) : (
                <>
                  <Button asChild variant="ghost" size="sm" className="text-primary-foreground/80 hover:bg-white/10 hover:text-white">
                    <Link to="/sign-in">
                      <User size={14} /> Đăng nhập
                    </Link>
                  </Button>
                  <Button asChild size="sm" className="bg-white text-primary hover:bg-slate-100 font-semibold shadow-sm">
                    <Link to="/sign-up">Đăng ký</Link>
                  </Button>
                </>
              )}
            </div>

            <button
              type="button"
              className="marketplace-header__mobile-toggle rounded-md p-2 text-primary-foreground/80 transition-colors hover:bg-white/10 hover:text-white"
              onClick={() => setMobileMenuOpen((current) => !current)}
              aria-controls="marketplace-mobile-menu"
              aria-expanded={mobileMenuOpen}
              aria-label={mobileMenuOpen ? "Đóng menu" : "Mở menu"}
            >
              {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        <MobileMenu
          isOpen={mobileMenuOpen}
          onClose={() => setMobileMenuOpen(false)}
          isAuthenticated={isAuthenticated}
          userName={user?.name}
          userRole={user?.role}
          cartCount={cartCount}
          onLogout={() => {
            void handleLogout();
          }}
          onSearchClick={() => {
            setSearchOpen(true);
            setMobileMenuOpen(false);
          }}
        />
      </header>

        <main className="flex-1">
          <Outlet />
        </main>

        <MarketplaceFooter />

        <SearchWindow open={searchOpen} onOpenChange={setSearchOpen} />

        {showBuyerAiAssistant && (
          <>
            <button
              type="button"
              className="marketplace-buyer-ai-launcher"
              onClick={() => openBuyerAiAssistant()}
              aria-label="Mở trợ lý AI mua hàng"
            >
              <span className="marketplace-buyer-ai-launcher__icon" aria-hidden="true">
                <Bot className="h-4 w-4" />
              </span>
              <span>AI mua hàng</span>
            </button>
            <BuyerAiAssistantDrawer
              open={buyerAiOpen}
              onOpenChange={setBuyerAiOpen}
              buyerContext={buyerAiContext}
              initialPrompt={buyerAiInitialPrompt}
              requestId={buyerAiRequestId}
            />
          </>
        )}
      </div>
    </BuyerAiAssistantContext.Provider>
  );
}
