import { lazy, Suspense, useEffect, useRef } from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate, Outlet, useLocation, useParams } from "react-router";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { CreditErrorProvider } from "./contexts/CreditErrorContext";
import {
  LogoutConfirmationProvider,
  useLogoutConfirmation,
} from "./contexts/LogoutConfirmationContext";
import { RBACProvider, useRBAC } from "./contexts/RBACContext";
import SessionTimeout from "./components/SessionTimeout";
import { Toaster } from "./components/ui/sonner";
import { Layout } from "./components/Layout";
import AccessDeniedState from "./components/common/AccessDeniedState";
import AppErrorBoundary from "./components/common/AppErrorBoundary";
import { redirectToOriginLogin } from "./utils/authRedirect";
import { AP_HISTORY_INITIALIZED, completeApLogout } from "./utils/logoutFlow";
import { resolveDefaultAccessibleRoute } from "./constants/rbacPolicy";
const Login = lazy(() => import("./pages/login/Login"));
const Dashboard = lazy(() => import("./pages/dashboard/Dashboard"));
const Vendors = lazy(() => import("./pages/vendors/Vendors"));
const InvoicesPage = lazy(() => import("./pages/invoices/InvoicesPage"));
const Approvals = lazy(() => import("./pages/approvals/Approvals"));
const Payments = lazy(() => import("./pages/payments/Payments"));
const ConnectedBanking = lazy(() => import("./pages/banking/ConnectedBanking"));
const UserRoles = lazy(() => import("./pages/user-roles/UserRoles"));
const Profile = lazy(() => import("./pages/profile/Profile"));
const PurchaseOrdersPage = lazy(() => import("./pages/purchase-orders/PurchaseOrdersPage"));
const OrderTrackingPage = lazy(() => import("./pages/order-tracking/OrderTrackingPage"));
const GoodsReceipt = lazy(() => import("./pages/goods-receipt/GoodsReceipt"));
const InvoiceMatching = lazy(() => import("./pages/invoice-matching/InvoiceMatching"));
const PaymentBatches = lazy(() => import("./pages/payment-batches/PaymentBatches"));
const Notifications = lazy(() => import("./pages/notifications/Notifications"));
const CampaignsPage = lazy(() => import("./pages/campaigns/CampaignsPage"));
const Settings = lazy(() => import("./pages/settings/Settings"));
const TaxManagement = lazy(() => import("./pages/tax-management/TaxManagement"));
const Reports = lazy(() => import("./pages/reports/Reports"));
const AuditTrail = lazy(() => import("./pages/audit-trail/AuditTrail"));
const ConnectionSettings = lazy(() => import("./pages/integrations/components/ConnectionSettings"));
const ConnectionWizard = lazy(() => import("./pages/integrations/components/ConnectionWizard"));
const GmailIntegrationPage = lazy(() => import("./pages/integrations/components/GmailIntegrationPage"));
const IntegrationLanding = lazy(() => import("./pages/integrations/components/IntegrationLanding"));
const ManageSyncedDataRoute = lazy(() => import("./pages/integrations/components/ManageSyncedDataRoute"));
const MappingEditor = lazy(() => import("./pages/integrations/components/MappingEditor"));
const ObjectReview = lazy(() => import("./pages/integrations/components/ObjectReview"));
const ProviderSyncDashboardRoute = lazy(() => import("./pages/integrations/components/ProviderSyncDashboardRoute"));
const SyncLogs = lazy(() => import("./pages/integrations/components/SyncLogs"));
const TallyIntegrationPage = lazy(() => import("./pages/integrations/components/TallyIntegrationPage"));
const ZohoIntegrationPage = lazy(() => import("./pages/integrations/components/ZohoIntegrationPage"));
const Accounting = lazy(() => import("./pages/accounting/Accounting"));

const PageFallback = () => (
  <div className="min-h-[60vh] rounded-xl border border-border bg-card/50 flex items-center justify-center">
    <div className="text-center px-6">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mx-auto"></div>
      <p className="mt-3 text-muted-foreground">Loading page...</p>
    </div>
  </div>
);

const withPageFallback = (page) => (
  <Suspense fallback={<PageFallback />}>{page}</Suspense>
);

const LegacyIntegrationConnectRedirect = () => {
  const { provider } = useParams();
  const location = useLocation();
  return <Navigate to={`/integrations/connect/${provider}${location.search || ""}`} replace />;
};

const ProtectedRoute = () => {
  const { user, loading } = useAuth();
  const { isLoaded: rbacLoaded, canAccessRoute } = useRBAC();
  const location = useLocation();

  useEffect(() => {
    if (!loading && rbacLoaded && !user) {
      redirectToOriginLogin();
    }
  }, [loading, rbacLoaded, user]);

  if (loading || !rbacLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const settingsIntegrationRedirect =
    location.pathname === "/settings" &&
    new URLSearchParams(location.search).get("tab") === "integrations";
  const canVisitPage =
    canAccessRoute(location.pathname) ||
    (settingsIntegrationRedirect && canAccessRoute("/integrations"));

  return (
    <Layout>
      {canVisitPage ? (
        <Outlet />
      ) : (
        <AccessDeniedState description="You do not have the required permissions to access this page. Contact your administrator if this seems incorrect." />
      )}
    </Layout>
  );
};

const DefaultProtectedRoute = () => {
  const { canAccessRoute } = useRBAC();
  const defaultRoute = resolveDefaultAccessibleRoute(canAccessRoute);

  if (!defaultRoute) {
    return (
      <AccessDeniedState description="You do not have access to any AP Portal pages. Contact your administrator if this seems incorrect." />
    );
  }

  return <Navigate to={defaultRoute} replace />;
};

const AP_EXIT_BOUNDARY_STATE = "apBackLogoutExitBoundary";
const AP_CURRENT_ENTRY_STATE = "apBackLogoutCurrentEntry";

const LOGOUT_CONFIRMATION_DESCRIPTION =
  "Going back will take you to the login page and log you out of the AP Portal.";

const getApExitBoundaryState = (state = {}, guardId) => {
  const {
    [AP_CURRENT_ENTRY_STATE]: _currentEntry,
    ...safeState
  } = state || {};

  return {
    ...safeState,
    [AP_EXIT_BOUNDARY_STATE]: guardId,
  };
};

const getApCurrentEntryState = (state = {}, guardId) => {
  const {
    [AP_EXIT_BOUNDARY_STATE]: _exitBoundary,
    ...safeState
  } = state || {};

  return {
    ...safeState,
    [AP_CURRENT_ENTRY_STATE]: guardId,
  };
};

const BrowserBackLogoutGuard = () => {
  const { user, logout, loading } = useAuth();
  const { requestLogoutConfirmation } = useLogoutConfirmation();
  const allowingLogoutRef = useRef(false);
  const guardArmedRef = useRef(false);
  const confirmationPendingRef = useRef(false);
  const guardIdRef = useRef(
    `ap-logout-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  );

  useEffect(() => {
    if (loading || !user || typeof window === "undefined") return undefined;

    if (!guardArmedRef.current) {
      const hasInitializedBoundary =
        sessionStorage.getItem(AP_HISTORY_INITIALIZED) === "true";

      if (!hasInitializedBoundary) {
        const currentState = window.history.state || {};
        window.history.replaceState(
          getApExitBoundaryState(currentState, guardIdRef.current),
          "",
          window.location.href,
        );
        window.history.pushState(
          getApCurrentEntryState(currentState, guardIdRef.current),
          "",
          window.location.href,
        );
        sessionStorage.setItem(AP_HISTORY_INITIALIZED, "true");
      }

      guardArmedRef.current = true;
    }

    const handlePopState = async (event) => {
      if (allowingLogoutRef.current) return;

      const isApExitBoundary =
        Boolean(event.state?.[AP_EXIT_BOUNDARY_STATE]);

      if (isApExitBoundary) {
        window.history.pushState(
          getApCurrentEntryState(event.state, guardIdRef.current),
          "",
          window.location.href,
        );

        if (confirmationPendingRef.current) return;
        confirmationPendingRef.current = true;

        const confirmed = await requestLogoutConfirmation({
          description: LOGOUT_CONFIRMATION_DESCRIPTION,
        });
        confirmationPendingRef.current = false;

        if (confirmed) {
          allowingLogoutRef.current = true;
          completeApLogout(logout);
        }
      }
    };

    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, [loading, logout, requestLogoutConfirmation, user]);

  if (!user) return null;
  return null;
};

function AppContent() {
  return (
    <AppErrorBoundary>
      <BrowserBackLogoutGuard />
      <Routes>
        <Route path="/login" element={withPageFallback(<Login />)} />
        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={withPageFallback(<Dashboard />)} />
          <Route path="/vendors" element={withPageFallback(<Vendors />)} />
          <Route path="/campaigns" element={withPageFallback(<CampaignsPage />)} />
          <Route path="/invoices" element={withPageFallback(<InvoicesPage />)} />
          <Route path="/approvals" element={withPageFallback(<Approvals />)} />
          <Route path="/payments" element={withPageFallback(<Payments />)} />
          <Route path="/banking" element={withPageFallback(<ConnectedBanking />)} />
          <Route path="/settings" element={withPageFallback(<Settings />)} />
          <Route path="/settings/integrations" element={<Navigate to="/integrations" replace />} />
          <Route
            path="/settings/notifications"
            element={<Navigate to="/settings?tab=notifications" replace />}
          />
          <Route path="/settings/integrations/gmail" element={<Navigate to="/integrations/gmail" replace />} />
          <Route path="/settings/integrations/zoho" element={<Navigate to="/integrations/erp/zoho" replace />} />
          <Route path="/settings/integrations/tally" element={<Navigate to="/integrations/erp/tally" replace />} />
          <Route path="/user-roles" element={withPageFallback(<UserRoles />)} />
          <Route path="/profile" element={withPageFallback(<Profile />)} />
          <Route path="/purchase-orders" element={withPageFallback(<PurchaseOrdersPage />)} />
          <Route path="/order-tracking" element={withPageFallback(<OrderTrackingPage />)} />
          <Route path="/goods-receipt" element={withPageFallback(<GoodsReceipt />)} />
          <Route path="/tax-management" element={withPageFallback(<TaxManagement />)} />
          <Route path="/invoice-matching" element={withPageFallback(<InvoiceMatching />)} />
          <Route path="/payment-batches" element={withPageFallback(<PaymentBatches />)} />
          <Route path="/notifications" element={withPageFallback(<Notifications />)} />
          <Route path="/reports" element={withPageFallback(<Reports />)} />
          <Route path="/audit-trail" element={withPageFallback(<AuditTrail />)} />
          <Route path="/integrations" element={withPageFallback(<IntegrationLanding />)} />
          <Route path="/integrations/gmail" element={withPageFallback(<GmailIntegrationPage />)} />
          <Route path="/integrations/erp/zoho" element={withPageFallback(<ZohoIntegrationPage />)} />
          <Route
            path="/integrations/erp/zoho/dashboard"
            element={withPageFallback(<ProviderSyncDashboardRoute provider="ZOHO_BOOKS" />)}
          />
          <Route path="/integrations/erp/tally" element={withPageFallback(<TallyIntegrationPage />)} />
          <Route path="/integrations/erp/tally/dashboard" element={withPageFallback(<TallyIntegrationPage />)} />
          <Route path="/integrations/connect/:provider" element={withPageFallback(<ConnectionWizard />)} />
          <Route path="/accounting" element={withPageFallback(<Accounting />)} />
          <Route path="/accounting/chart-of-accounts" element={withPageFallback(<Accounting />)} />
          <Route path="/accounting/ledger-explorer" element={withPageFallback(<Accounting />)} />
          <Route path="/accounting/ledger-explorer/:ledgerId" element={withPageFallback(<Accounting />)} />
          <Route path="/accounts-payable/integrations/connect/:provider" element={<LegacyIntegrationConnectRedirect />} />
          <Route path="/accounts-payables/integrations/connect/:provider" element={<LegacyIntegrationConnectRedirect />} />
          <Route path="/integrations/:connectionId/mapping" element={withPageFallback(<MappingEditor />)} />
          <Route path="/integrations/:connectionId/objects/:object" element={withPageFallback(<ObjectReview />)} />
          <Route path="/integrations/:connectionId/logs" element={withPageFallback(<SyncLogs />)} />
          <Route path="/integrations/:connectionId/settings" element={withPageFallback(<ConnectionSettings />)} />
          <Route path="/integrations/:connectionId/sync-data" element={withPageFallback(<ManageSyncedDataRoute />)} />
          <Route path="/integrations/:connectionId/sync-data/:categoryCode" element={withPageFallback(<ManageSyncedDataRoute />)} />
          <Route path="/integration/:connectionId/sync-data" element={withPageFallback(<ManageSyncedDataRoute />)} />
          <Route path="/integration/:connectionId/sync-data/:categoryCode" element={withPageFallback(<ManageSyncedDataRoute />)} />
          <Route path="/" element={<DefaultProtectedRoute />} />
        </Route>
      </Routes>
      <Toaster position="top-right" />
    </AppErrorBoundary>
  );
}

function App() {
  const baseUrl = import.meta.env.BASE_URL || "/";
  const normalizedBase = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
  const routerBasename = normalizedBase || "/";

  return (
    <div className="App">
      <BrowserRouter basename={routerBasename}>
        <AuthProvider>
          <SessionTimeout>
            <RBACProvider>
              <CreditErrorProvider>
                <LogoutConfirmationProvider>
                  <AppContent />
                </LogoutConfirmationProvider>
              </CreditErrorProvider>
            </RBACProvider>
          </SessionTimeout>
        </AuthProvider>
      </BrowserRouter>
    </div>
  );
}

export default App;
