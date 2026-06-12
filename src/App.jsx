import { lazy, Suspense, useEffect, useRef, useState } from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate, Outlet, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { CreditErrorProvider } from "./contexts/CreditErrorContext";
import { RBACProvider, useRBAC } from "./contexts/RBACContext";
import SessionTimeout from "./components/SessionTimeout";
import { Toaster } from "./components/ui/sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "./components/ui/alert-dialog";
import { Layout } from "./components/Layout";
import AccessDeniedState from "./components/common/AccessDeniedState";
import { redirectToOriginLogin } from "./utils/authRedirect";
import { resolveDefaultAccessibleRoute } from "./constants/rbacPolicy";
import Login from "./pages/login/Login";
import Dashboard from "./pages/dashboard/Dashboard";
import Vendors from "./pages/vendors/Vendors";
import InvoicesPage from "./pages/invoices/InvoicesPage";
import Approvals from "./pages/approvals/Approvals";
import Payments from "./pages/payments/Payments";
import Banking from "./pages/banking/Banking";
import UserRoles from "./pages/user-roles/UserRoles";
import Profile from "./pages/profile/Profile";
import TransactionsPage from "./pages/transactions/TransactionsPage";
import PurchaseOrdersPage from "./pages/purchase-orders/PurchaseOrdersPage";
import GoodsReceipt from "./pages/goods-receipt/GoodsReceipt";
import InvoiceMatching from "./pages/invoice-matching/InvoiceMatching";
import PaymentBatches from "./pages/payment-batches/PaymentBatches";
import Notifications from "./pages/notifications/Notifications";
import CampaignsPage from "./pages/campaigns/CampaignsPage";
const loadSettingsPage = () => import("./pages/settings/Settings");
const loadTaxManagementPage = () => import("./pages/tax-management/TaxManagement");
const loadReportsPage = () => import("./pages/reports/Reports");
const loadAuditTrailPage = () => import("./pages/audit-trail/AuditTrail");
const loadIntegrationsPage = () => import("./pages/integrations/IntegrationsPage");

const Settings = lazy(loadSettingsPage);
const TaxManagement = lazy(loadTaxManagementPage);
const Reports = lazy(loadReportsPage);
const AuditTrail = lazy(loadAuditTrailPage);
const IntegrationsPage = lazy(loadIntegrationsPage);

const PageFallback = () => (
  <div className="min-h-[60vh] rounded-xl border border-border bg-card/50 flex items-center justify-center">
    <div className="text-center px-6">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mx-auto"></div>
      <p className="mt-3 text-muted-foreground">Loading page...</p>
    </div>
  </div>
);

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

  const canVisitPage = canAccessRoute(location.pathname);

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

const getCurrentHistoryPath = () =>
  `${window.location.pathname}${window.location.search}${window.location.hash}`;

const BrowserBackLogoutGuard = () => {
  const { user, logout, loading } = useAuth();
  const location = useLocation();
  const [showLogoutPrompt, setShowLogoutPrompt] = useState(false);
  const previousPathRef = useRef("");
  const allowingLogoutRef = useRef(false);
  const guardArmedRef = useRef(false);

  useEffect(() => {
    previousPathRef.current = getCurrentHistoryPath();
  }, [location.pathname, location.search, location.hash]);

  useEffect(() => {
    if (loading || !user || typeof window === "undefined") return undefined;

    if (!guardArmedRef.current) {
      window.history.pushState(
        { ...(window.history.state || {}), apBackLogoutGuard: true },
        "",
        window.location.href,
      );
      previousPathRef.current = getCurrentHistoryPath();
      guardArmedRef.current = true;
    }

    const handlePopState = () => {
      if (allowingLogoutRef.current) return;

      const nextPath = getCurrentHistoryPath();
      const previousPath = previousPathRef.current;

      if (nextPath !== previousPath) {
        previousPathRef.current = nextPath;
        return;
      }

      setShowLogoutPrompt(true);
      window.history.pushState(
        { ...(window.history.state || {}), apBackLogoutGuard: true },
        "",
        window.location.href,
      );
    };

    window.addEventListener("popstate", handlePopState);
    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, [loading, user]);

  if (!user) return null;

  const stayLoggedIn = () => {
    setShowLogoutPrompt(false);
    previousPathRef.current = getCurrentHistoryPath();
  };

  const confirmLogout = () => {
    allowingLogoutRef.current = true;
    logout();
    redirectToOriginLogin();
  };

  return (
    <AlertDialog open={showLogoutPrompt} onOpenChange={setShowLogoutPrompt}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Log out?</AlertDialogTitle>
          <AlertDialogDescription>
            Going back will take you to the login page and log you out of the AP Portal.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={stayLoggedIn}>Stay logged in</AlertDialogCancel>
          <AlertDialogAction onClick={confirmLogout}>Log out</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

function AppContent() {
  useEffect(() => {
    const preloadRoutes = () => {
      loadSettingsPage();
      loadTaxManagementPage();
      loadReportsPage();
      loadAuditTrailPage();
      loadIntegrationsPage();
    };

    if (typeof window !== "undefined" && "requestIdleCallback" in window) {
      const idleHandle = window.requestIdleCallback(preloadRoutes, { timeout: 2000 });
      return () => {
        window.cancelIdleCallback?.(idleHandle);
      };
    }

    const timer = window.setTimeout(preloadRoutes, 1200);
    return () => {
      window.clearTimeout(timer);
    };
  }, []);

  return (
    <>
      <BrowserBackLogoutGuard />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/vendors" element={<Vendors />} />
          <Route path="/campaigns" element={<CampaignsPage />} />
          <Route path="/invoices" element={<InvoicesPage />} />
          <Route path="/approvals" element={<Approvals />} />
          <Route path="/payments" element={<Payments />} />
          <Route path="/banking" element={<Banking />} />
          <Route
            path="/settings"
            element={
              <Suspense fallback={<PageFallback />}>
                <Settings />
              </Suspense>
            }
          />
          <Route path="/user-roles" element={<UserRoles />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/transactions" element={<TransactionsPage />} />
          <Route path="/purchase-orders" element={<PurchaseOrdersPage />} />
          <Route path="/goods-receipt" element={<GoodsReceipt />} />
          <Route
            path="/tax-management"
            element={
              <Suspense fallback={<PageFallback />}>
                <TaxManagement />
              </Suspense>
            }
          />
          <Route path="/invoice-matching" element={<InvoiceMatching />} />
          <Route path="/payment-batches" element={<PaymentBatches />} />
          <Route path="/notifications" element={<Notifications />} />
          <Route
            path="/reports"
            element={
              <Suspense fallback={<PageFallback />}>
                <Reports />
              </Suspense>
            }
          />
          <Route
            path="/audit-trail"
            element={
              <Suspense fallback={<PageFallback />}>
                <AuditTrail />
              </Suspense>
            }
          />
          <Route
            path="/integrations"
            element={
              <Suspense fallback={<PageFallback />}>
                <IntegrationsPage />
              </Suspense>
            }
          />
          <Route
            path="/integrations/connect/:provider"
            element={
              <Suspense fallback={<PageFallback />}>
                <IntegrationsPage />
              </Suspense>
            }
          />
          <Route
            path="/integrations/:connectionId"
            element={
              <Suspense fallback={<PageFallback />}>
                <IntegrationsPage />
              </Suspense>
            }
          />
          <Route
            path="/integrations/:connectionId/mapping"
            element={
              <Suspense fallback={<PageFallback />}>
                <IntegrationsPage />
              </Suspense>
            }
          />
          <Route
            path="/integrations/:connectionId/objects/:object"
            element={
              <Suspense fallback={<PageFallback />}>
                <IntegrationsPage />
              </Suspense>
            }
          />
          <Route
            path="/integrations/:connectionId/logs"
            element={
              <Suspense fallback={<PageFallback />}>
                <IntegrationsPage />
              </Suspense>
            }
          />
          <Route path="/" element={<DefaultProtectedRoute />} />
        </Route>
      </Routes>
      <Toaster position="top-right" />
    </>
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
                <AppContent />
              </CreditErrorProvider>
            </RBACProvider>
          </SessionTimeout>
        </AuthProvider>
      </BrowserRouter>
    </div>
  );
}

export default App;
