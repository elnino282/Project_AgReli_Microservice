import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/features/auth';
import { useSeason } from '@/shared/contexts';
import { CartProvider } from '@/features/buyer/providers/CartProvider';

// ═══════════════════════════════════════════════════════════════
// LOADING FALLBACK
// ═══════════════════════════════════════════════════════════════

function RouteSuspenseFallback() {
  return (
    <div className="min-h-screen bg-[#F8F8F4] flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-slate-500 text-sm">Loading…</p>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// LAZY IMPORTS — Auth pages (small, rarely revisited)
// ═══════════════════════════════════════════════════════════════

const SignInPage = lazy(() =>
  import('@/pages/shared/SignInPage').then((m) => ({ default: m.SignInPage }))
);
const SignUpPage = lazy(() =>
  import('@/pages/shared/SignUpPage').then((m) => ({ default: m.SignUpPage }))
);
const ForgotPasswordPage = lazy(() =>
  import('@/pages/ForgotPassword').then((m) => ({ default: m.ForgotPasswordPage }))
);
const ResetPasswordPage = lazy(() =>
  import('@/pages/ResetPassword').then((m) => ({ default: m.ResetPasswordPage }))
);
const ChatPage = lazy(() =>
  import('@/features/chat').then((m) => ({ default: m.ChatPage }))
);

// ═══════════════════════════════════════════════════════════════
// LAZY IMPORTS — ProtectedRoute guard
// ═══════════════════════════════════════════════════════════════

const ProtectedRoute = lazy(() =>
  import('@/features/auth/components/ProtectedRoute').then((m) => ({
    default: m.ProtectedRoute,
  }))
);

// ═══════════════════════════════════════════════════════════════
// LAZY IMPORTS — Public / Marketplace branch
// ═══════════════════════════════════════════════════════════════

const MarketplacePublicLayout = lazy(() =>
  import('@/features/marketplace/layout/MarketplacePublicLayout').then((m) => ({
    default: m.MarketplacePublicLayout,
  }))
);
const MarketHomePage = lazy(() =>
  import('@/pages/marketplace').then((m) => ({ default: m.MarketHomePage }))
);
const PublicTracePage = lazy(() =>
  import('@/pages/public/PublicTracePage').then((m) => ({ default: m.PublicTracePage }))
);
const MarketplaceProductListPage = lazy(() =>
  import('@/pages/marketplace').then((m) => ({ default: m.ProductListPage }))
);
const MarketplaceProductDetailPage = lazy(() =>
  import('@/pages/marketplace').then((m) => ({ default: m.ProductDetailPage }))
);
const MarketplaceProductTraceabilityPage = lazy(() =>
  import('@/pages/marketplace').then((m) => ({ default: m.ProductTraceabilityPage }))
);
const MarketplaceFarmsDiscoveryPage = lazy(() =>
  import('@/pages/marketplace').then((m) => ({ default: m.FarmsDiscoveryPage }))
);
const MarketplaceFarmStorePage = lazy(() =>
  import('@/pages/marketplace').then((m) => ({ default: m.FarmStorePage }))
);

const CartPage = lazy(() =>
  import('@/pages/marketplace').then((m) => ({ default: m.CartPage }))
);
const CheckoutPage = lazy(() =>
  import('@/pages/marketplace').then((m) => ({ default: m.CheckoutPage }))
);
const MarketplaceMyOrdersPage = lazy(() =>
  import('@/pages/marketplace').then((m) => ({ default: m.MyOrdersPage }))
);
const MarketplaceOrderDetailPage = lazy(() =>
  import('@/pages/marketplace').then((m) => ({ default: m.OrderDetailPage }))
);

const BuyerTraceabilityPage = lazy(() =>
  import('@/pages/buyer/BuyerTraceabilityPage').then((m) => ({ default: m.BuyerTraceabilityPage }))
);

// Buyer profile components
import { BuyerProfileLayout, PersonalInfoPage, AddressBookPage, SecurityPage } from '@/features/buyer/profile';

// ═══════════════════════════════════════════════════════════════
// LAZY IMPORTS — Farmer branch
// ═══════════════════════════════════════════════════════════════

const FarmerPortalWithShell = lazy(() =>
  import('@/features/farmer/portal').then((m) => ({ default: m.FarmerPortalWithShell }))
);
const FarmerDashboard = lazy(() =>
  import('@/pages/farmer/FarmerDashboardPage').then((m) => ({ default: m.FarmerDashboardPage }))
);
const CropManagement = lazy(() =>
  import('@/features/farmer/crops').then((m) => ({ default: m.CropManagement }))
);
const HarvestManagement = lazy(() =>
  import('@/features/farmer/harvests').then((m) => ({ default: m.HarvestManagement }))
);
const PlotManagement = lazy(() =>
  import('@/features/farmer/plots').then((m) => ({ default: m.PlotManagement }))
);
const SeasonManagement = lazy(() =>
  import('@/features/farmer/seasons').then((m) => ({ default: m.SeasonManagement }))
);
const Documents = lazy(() =>
  import('@/features/farmer/documents').then((m) => ({ default: m.Documents }))
);
const FarmDocumentsPage = lazy(() =>
  import('@/pages/farmer/FarmDocumentsPage').then((m) => ({ default: m.default }))
);
const ExpenseManagement = lazy(() =>
  import('@/features/farmer/expense-management').then((m) => ({
    default: m.ExpenseManagement,
  }))
);
const TaskWorkspace = lazy(() =>
  import('@/features/farmer/tasks').then((m) => ({ default: m.TaskWorkspace }))
);
const LaborManagementPage = lazy(() =>
  import('@/features/farmer/labor-management').then((m) => ({
    default: m.LaborManagementPage,
  }))
);
const FarmerProfile = lazy(() =>
  import('@/features/farmer/profile').then((m) => ({ default: m.FarmerProfile }))
);
const FarmerPreferences = lazy(() =>
  import('@/features/farmer/preferences').then((m) => ({ default: m.FarmerPreferences }))
);
const FarmsListPage = lazy(() =>
  import('@/features/farmer/farm-management').then((m) => ({ default: m.FarmsListPage }))
);
const FarmDetailPage = lazy(() =>
  import('@/features/farmer/farm-management').then((m) => ({ default: m.FarmDetailPage }))
);
const FieldLogsPage = lazy(() =>
  import('@/pages/farmer/FieldLogsPage').then((m) => ({ default: m.FieldLogsPage }))
);
const DiseaseTrackingPage = lazy(() =>
  import('@/pages/farmer/DiseaseTrackingPage').then((m) => ({ default: m.DiseaseTrackingPage }))
);
const SupplyManagementPage = lazy(() =>
  import('@/pages/farmer/SupplyManagementPage').then((m) => ({
    default: m.SupplyManagementPage,
  }))
);
const ProductWarehousePage = lazy(() =>
  import('@/pages/farmer/ProductWarehousePage').then((m) => ({
    default: m.ProductWarehousePage,
  }))
);
const AiAssistantPage = lazy(() =>
  import('@/pages/farmer/AiAssistantPage').then((m) => ({ default: m.AiAssistantPage }))
);
const NotificationsPage = lazy(() =>
  import('@/pages/farmer/NotificationsPage').then((m) => ({
    default: m.NotificationsPage,
  }))
);
const FarmerSearchPage = lazy(() =>
  import('@/pages/farmer/FarmerSearchPage').then((m) => ({ default: m.FarmerSearchPage }))
);
const CertificationPage = lazy(() =>
  import('@/pages/farmer/CertificationPage').then((m) => ({ default: m.default }))
);
const SelfAssessmentPage = lazy(() =>
  import('@/pages/farmer/SelfAssessmentPage').then((m) => ({ default: m.SelfAssessmentPage }))
);
const NonconformityManagementPage = lazy(() =>
  import('@/pages/farmer/NonconformityManagementPage').then((m) => ({ default: m.NonconformityManagementPage }))
);

// Farmer season workspace
const SeasonWorkspaceLayout = lazy(() =>
  import('@/features/farmer/season-workspace').then((m) => ({
    default: m.SeasonWorkspaceLayout,
  }))
);
const SeasonWorkspaceOverview = lazy(() =>
  import('@/features/farmer/season-workspace').then((m) => ({
    default: m.SeasonWorkspaceOverview,
  }))
);
const SeasonNutrientInputsWorkspace = lazy(() =>
  import('@/features/farmer/season-workspace').then((m) => ({
    default: m.SeasonNutrientInputsWorkspace,
  }))
);
const SeasonIrrigationWaterAnalysesWorkspace = lazy(() =>
  import('@/features/farmer/season-workspace').then((m) => ({
    default: m.SeasonIrrigationWaterAnalysesWorkspace,
  }))
);
const SeasonSoilTestsWorkspace = lazy(() =>
  import('@/features/farmer/season-workspace').then((m) => ({
    default: m.SeasonSoilTestsWorkspace,
  }))
);
const SeasonReportsWorkspace = lazy(() =>
  import('@/features/farmer/season-workspace').then((m) => ({
    default: m.SeasonReportsWorkspace,
  }))
);
const ProductionDiaryWorkspace = lazy(() =>
  import('@/features/farmer/season-workspace').then((m) => ({
    default: m.ProductionDiaryWorkspace,
  }))
);

// Farmer marketplace seller pages
const MarketplaceSellerDashboardPage = lazy(() =>
  import('@/pages/marketplace').then((m) => ({
    default: m.SellerDashboardPage,
  }))
);
const MarketplaceSellerProductsPage = lazy(() =>
  import('@/pages/marketplace').then((m) => ({
    default: m.SellerProductsPage,
  }))
);
const MarketplaceSellerProductDetailPage = lazy(() =>
  import('@/pages/marketplace').then((m) => ({
    default: m.SellerProductDetailPage,
  }))
);
const MarketplaceSellerProductFormPage = lazy(() =>
  import('@/pages/marketplace').then((m) => ({
    default: m.SellerProductFormPage,
  }))
);
const MarketplaceSellerOrdersPage = lazy(() =>
  import('@/pages/marketplace').then((m) => ({
    default: m.SellerOrdersPage,
  }))
);
const MarketplaceSellerOrderDetailPage = lazy(() =>
  import('@/pages/marketplace').then((m) => ({
    default: m.SellerOrderDetailPage,
  }))
);
const MarketplaceSellerDeliveriesPage = lazy(() =>
  import('@/pages/marketplace').then((m) => ({
    default: m.SellerDeliveriesPage,
  }))
);

// ═══════════════════════════════════════════════════════════════
// LAZY IMPORTS — Admin branch
// ═══════════════════════════════════════════════════════════════

const AdminPortalWithShell = lazy(() =>
  import('@/features/admin/portal').then((m) => ({ default: m.AdminPortalWithShell }))
);

// ═══════════════════════════════════════════════════════════════
// LAZY IMPORTS — Employee branch
// ═══════════════════════════════════════════════════════════════

const EmployeePortalWithShell = lazy(() =>
  import('@/features/employee/portal').then((m) => ({
    default: m.EmployeePortalWithShell,
  }))
);
const EmployeeTasksPage = lazy(() =>
  import('@/pages/employee/EmployeeTasksPage').then((m) => ({
    default: m.EmployeeTasksPage,
  }))
);
const EmployeeProgressPage = lazy(() =>
  import('@/pages/employee/EmployeeProgressPage').then((m) => ({
    default: m.EmployeeProgressPage,
  }))
);
const EmployeePayrollPage = lazy(() =>
  import('@/pages/employee/EmployeePayrollPage').then((m) => ({
    default: m.EmployeePayrollPage,
  }))
);
const EmployeeWorkspacePage = lazy(() =>
  import('@/pages/employee/EmployeeWorkspacePage').then((m) => ({
    default: m.EmployeeWorkspacePage,
  }))
);
const EmployeeSeasonWorkspaceLayout = lazy(() =>
  import('@/pages/employee/EmployeeSeasonWorkspaceLayout').then((m) => ({
    default: m.EmployeeSeasonWorkspaceLayout,
  }))
);
const EmployeeProfilePage = lazy(() =>
  import('@/pages/employee/EmployeeProfilePage').then((m) => ({
    default: m.EmployeeProfilePage,
  }))
);
const EmployeeSettingsPage = lazy(() =>
  import('@/pages/employee/EmployeeSettingsPage').then((m) => ({
    default: m.EmployeeSettingsPage,
  }))
);

const UserGuidePage = lazy(() =>
  import('@/pages/shared/UserGuidePage').then((m) => ({ default: m.UserGuidePage }))
);

// ═══════════════════════════════════════════════════════════════
// SHARED IMPORTS — ErrorBoundary + SeasonProvider (needed eagerly for wrappers)
// ═══════════════════════════════════════════════════════════════

import { ErrorBoundary } from '@/shared/ui';
import { SeasonProvider } from '@/shared/contexts';

// ═══════════════════════════════════════════════════════════════
// ROOT REDIRECT
// ═══════════════════════════════════════════════════════════════

function RootRedirect() {
  const { isAuthenticated, getUserRole } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/sign-in" replace />;
  }

  const role = getUserRole();
  if (role === 'admin') return <Navigate to="/admin/dashboard" replace />;
  if (role === 'farmer') return <Navigate to="/farmer/dashboard" replace />;
  if (role === 'employee') return <Navigate to="/employee/tasks" replace />;
  if (role === 'buyer') return <Navigate to="/marketplace" replace />;

  return <Navigate to="/sign-in" replace />;
}

// ═══════════════════════════════════════════════════════════════
// LEGACY SEASON REDIRECT
// ═══════════════════════════════════════════════════════════════

function LegacySeasonModuleRedirect({
  modulePath,
}: {
  modulePath: 'tasks' | 'expenses' | 'field-logs' | 'harvest' | 'reports' | 'labor-management';
}) {
  const { selectedSeasonId } = useSeason();

  if (!selectedSeasonId) {
    return <Navigate to="/farmer/seasons" replace />;
  }

  return (
    <Navigate
      to={`/farmer/seasons/${selectedSeasonId}/workspace/${modulePath}`}
      replace
    />
  );
}

// ═══════════════════════════════════════════════════════════════
// LAYOUT WRAPPERS
// ═══════════════════════════════════════════════════════════════

/**
 * PublicLayoutWrapper — wraps public/marketplace routes with
 * buyer-scoped CartProvider. Dashboard routes are excluded from
 * this provider so they never subscribe to cart state.
 */
function PublicLayoutWrapper() {
  return (
    <CartProvider>
      <Outlet />
    </CartProvider>
  );
}

// ═══════════════════════════════════════════════════════════════
// APP ROUTES
// ═══════════════════════════════════════════════════════════════

/**
 * AppRoutes Component
 *
 * Defines all application routes with:
 * - Lazy-loaded domain branches for code splitting
 * - Suspense boundaries at each domain branch
 * - Role-based protection via ProtectedRoute
 * - Route-level ErrorBoundary for each portal
 * - SeasonProvider for farmer routes
 * - CartProvider scoped to public routes only
 * - Strict layout separation between public and dashboard
 */
export function AppRoutes() {
  return (
    <Suspense fallback={<RouteSuspenseFallback />}>
      <Routes>
        {/* ━━━ Auth Routes ━━━ */}
        <Route path="/sign-in" element={<SignInPage />} />
        <Route path="/sign-up" element={<SignUpPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/signin" element={<Navigate to="/sign-in" replace />} />
        <Route path="/signup" element={<Navigate to="/sign-up" replace />} />
        <Route path="/trace/:slug" element={<PublicTracePage />} />
        <Route
          path="/chat"
          element={(
            <ProtectedRoute requireAuth>
              <ChatPage />
            </ProtectedRoute>
          )}
        />

        {/* ━━━ Public Layout Branch ━━━ */}
        <Route element={<PublicLayoutWrapper />}>
          {/* Marketplace public + authenticated buyer-capability routes */}
          <Route path="/marketplace" element={<MarketplacePublicLayout />}>
            <Route index element={<MarketHomePage />} />
            <Route path="products" element={<MarketplaceProductListPage />} />
            <Route path="products/:slug" element={<MarketplaceProductDetailPage />} />
            <Route path="products/:slug/trace" element={<MarketplaceProductTraceabilityPage />} />
            <Route path="farms" element={<MarketplaceFarmsDiscoveryPage />} />
            <Route path="farms/:farmId" element={<MarketplaceFarmStorePage />} />
            <Route
              path="traceability"
              element={(
                <ProtectedRoute requiredRole="buyer">
                  <BuyerTraceabilityPage />
                </ProtectedRoute>
              )}
            />
            <Route
              path="cart"
              element={(
                <ProtectedRoute requiredRole="buyer">
                  <CartPage />
                </ProtectedRoute>
              )}
            />
            <Route
              path="checkout"
              element={(
                <ProtectedRoute requiredRole="buyer">
                  <CheckoutPage />
                </ProtectedRoute>
              )}
            />
            <Route
              path="orders"
              element={(
                <ProtectedRoute requiredRole="buyer">
                  <MarketplaceMyOrdersPage />
                </ProtectedRoute>
              )}
            />
            <Route
              path="orders/:id"
              element={(
                <ProtectedRoute requiredRole="buyer">
                  <MarketplaceOrderDetailPage />
                </ProtectedRoute>
              )}
            />
            <Route
              path="profile"
              element={(
                <ProtectedRoute requiredRole="buyer">
                  <BuyerProfileLayout />
                </ProtectedRoute>
              )}
            >
              <Route index element={<Navigate to="info" replace />} />
              <Route path="info" element={<PersonalInfoPage />} />
              <Route path="addresses" element={<AddressBookPage />} />
              <Route path="security" element={<SecurityPage />} />
            </Route>
          </Route>
          <Route path="/buyer/*" element={<Navigate to="/marketplace" replace />} />
        </Route>

        {/* ━━━ Dashboard Layout Branch: Farmer ━━━ */}
        <Route
          path="/farmer"
          element={
            <ProtectedRoute requiredRole="farmer">
              <ErrorBoundary>
                <SeasonProvider>
                  <FarmerPortalWithShell />
                </SeasonProvider>
              </ErrorBoundary>
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<FarmerDashboard />} />
          <Route path="marketplace-workspace" element={<Navigate to="/farmer/marketplace-dashboard" replace />} />
          <Route path="marketplace-dashboard" element={<MarketplaceSellerDashboardPage />} />
          <Route path="marketplace-products" element={<MarketplaceSellerProductsPage />} />
          <Route path="marketplace-products/:id" element={<MarketplaceSellerProductDetailPage />} />
          <Route path="marketplace-products/new" element={<MarketplaceSellerProductFormPage />} />
          <Route path="marketplace-products/:id/edit" element={<MarketplaceSellerProductFormPage />} />
          <Route path="marketplace-orders" element={<MarketplaceSellerOrdersPage />} />
          <Route path="marketplace-orders/:id" element={<MarketplaceSellerOrderDetailPage />} />
          <Route path="marketplace-deliveries" element={<MarketplaceSellerDeliveriesPage />} />
          <Route path="search" element={<FarmerSearchPage />} />

          {/* Farm Management */}
          <Route path="farms">
            <Route index element={<FarmsListPage />} />
            <Route path=":id" element={<FarmDetailPage />} />
            <Route path=":farmId/certification" element={<CertificationPage />} />
            <Route path=":farmId/self-assessment" element={<SelfAssessmentPage />} />
            <Route path=":farmId/nonconformities" element={<NonconformityManagementPage />} />
          </Route>

          {/* Season Workspace */}
          <Route path="plots" element={<PlotManagement />} />
          <Route path="seasons">
            <Route index element={<SeasonManagement />} />
            <Route path=":seasonId/workspace" element={<SeasonWorkspaceLayout />}>
              <Route index element={<SeasonWorkspaceOverview />} />
              <Route path="tasks" element={<TaskWorkspace />} />
              <Route path="expenses" element={<ExpenseManagement />} />
              <Route path="field-logs" element={<FieldLogsPage />} />
              <Route path="disease" element={<DiseaseTrackingPage />} />
              <Route path="harvest" element={<HarvestManagement />} />
              <Route path="labor-management" element={<LaborManagementPage />} />
              {/* <Route path="nutrient-inputs" element={<SeasonNutrientInputsWorkspace />} /> */}
              {/* <Route path="irrigation-water-analyses" element={<SeasonIrrigationWaterAnalysesWorkspace />} /> */}
              {/* <Route path="soil-tests" element={<SeasonSoilTestsWorkspace />} /> */}
              <Route path="reports" element={<SeasonReportsWorkspace />} />
              <Route path="production-diary" element={<ProductionDiaryWorkspace />} />
            </Route>
          </Route>

          {/* Legacy season module redirects */}
          <Route path="tasks" element={<LegacySeasonModuleRedirect modulePath="tasks" />} />
          <Route path="crops" element={<CropManagement />} />
          <Route path="expenses" element={<LegacySeasonModuleRedirect modulePath="expenses" />} />
          <Route path="harvest" element={<LegacySeasonModuleRedirect modulePath="harvest" />} />
          <Route path="suppliers-supplies" element={<SupplyManagementPage />} />
          <Route path="labor-management" element={<LegacySeasonModuleRedirect modulePath="labor-management" />} />
          <Route path="reports" element={<LegacySeasonModuleRedirect modulePath="reports" />} />
          <Route path="documents" element={<Documents />} />
          <Route path="farm-documents" element={<FarmDocumentsPage />} />
          <Route path="field-logs" element={<LegacySeasonModuleRedirect modulePath="field-logs" />} />
          <Route path="inventory" element={<Navigate to="/farmer/suppliers-supplies" replace />} />
          <Route path="product-warehouse" element={<ProductWarehousePage />} />

          <Route path="notifications" element={<NotificationsPage />} />
          <Route path="farms-plots" element={<Navigate to="/farmer/farms" replace />} />
          <Route path="ai-assistant" element={<AiAssistantPage />} />
          <Route path="profile" element={<FarmerProfile />} />
          <Route path="settings" element={<FarmerPreferences />} />
          <Route path="user-guide" element={<UserGuidePage />} />
        </Route>

        {/* ━━━ Dashboard Layout Branch: Admin ━━━ */}
        <Route
          path="/admin/*"
          element={
            <ProtectedRoute requiredRole="admin">
              <ErrorBoundary>
                <AdminPortalWithShell />
              </ErrorBoundary>
            </ProtectedRoute>
          }
        />

        {/* ━━━ Dashboard Layout Branch: Employee ━━━ */}
        <Route
          path="/employee"
          element={
            <ProtectedRoute requiredRole="employee">
              <ErrorBoundary>
                <EmployeePortalWithShell />
              </ErrorBoundary>
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="tasks" replace />} />
          <Route path="tasks" element={<EmployeeTasksPage />} />
          <Route path="progress" element={<EmployeeProgressPage />} />
          <Route path="payroll" element={<EmployeePayrollPage />} />
          <Route path="workspace" element={<EmployeeWorkspacePage />} />
          <Route path="seasons/:seasonId/workspace" element={<EmployeeSeasonWorkspaceLayout />}>
            <Route index element={<Navigate to="field-logs" replace />} />
            <Route path="field-logs" element={<FieldLogsPage />} />
            <Route path="disease" element={<DiseaseTrackingPage />} />
          </Route>
          <Route path="profile" element={<EmployeeProfilePage />} />
          <Route path="settings" element={<EmployeeSettingsPage />} />
          <Route path="user-guide" element={<UserGuidePage />} />
        </Route>

        {/* ━━━ Root + Catch-all ━━━ */}
        <Route path="/" element={<RootRedirect />} />
        <Route path="*" element={<Navigate to="/sign-in" replace />} />
      </Routes>
    </Suspense>
  );
}
