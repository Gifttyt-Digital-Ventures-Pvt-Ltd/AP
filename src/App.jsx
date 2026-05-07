import { lazy, Suspense, useEffect } from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate, Outlet, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { RBACProvider, useRBAC } from "./contexts/RBACContext";
import SessionTimeout from "./components/SessionTimeout";
import { Toaster } from "./components/ui/sonner";
import { Layout } from "./components/Layout";
import AccessDeniedState from "./components/common/AccessDeniedState";
import Login from "./pages/login/Login";
import Dashboard from "./pages/dashboard/Dashboard";
import Vendors from "./pages/vendors/Vendors";
import InvoicesPage from "./pages/invoices/InvoicesPage";
import Approvals from "./pages/approvals/Approvals";
import Payments from "./pages/payments/Payments";
import Banking from "./pages/banking/Banking";
import UserRoles from "./pages/user-roles/UserRoles";
import TransactionsPage from "./pages/transactions/TransactionsPage";
import PurchaseOrdersPage from "./pages/purchase-orders/PurchaseOrdersPage";
import GoodsReceipt from "./pages/goods-receipt/GoodsReceipt";
import InvoiceMatching from "./pages/invoice-matching/InvoiceMatching";
import PaymentBatches from "./pages/payment-batches/PaymentBatches";
import Notifications from "./pages/notifications/Notifications";
const loadSettingsPage = () => import("./pages/settings/Settings");
const loadTaxManagementPage = () => import("./pages/tax-management/TaxManagement");
const loadReportsPage = () => import("./pages/reports/Reports");

const Settings = lazy(loadSettingsPage);
const TaxManagement = lazy(loadTaxManagementPage);
const Reports = lazy(loadReportsPage);

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
    return <Navigate to="/login" replace />;
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

function AppContent() {
  useEffect(() => {
    const preloadRoutes = () => {
      loadSettingsPage();
      loadTaxManagementPage();
      loadReportsPage();
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
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/vendors" element={<Vendors />} />
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
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
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
              <AppContent />
            </RBACProvider>
          </SessionTimeout>
        </AuthProvider>
      </BrowserRouter>
    </div>
  );
}

export default App;
