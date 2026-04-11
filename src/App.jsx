import { lazy, Suspense, useEffect } from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import SessionTimeout from "./components/SessionTimeout";
import { Toaster } from "./components/ui/sonner";
import { Layout } from "./components/Layout";
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
const Settings = lazy(() => import("./pages/settings/Settings"));
const TaxManagement = lazy(() => import("./pages/tax-management/TaxManagement"));
const Reports = lazy(() => import("./pages/reports/Reports"));

const PageFallback = () => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="text-center">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mx-auto"></div>
      <p className="mt-3 text-muted-foreground">Loading page...</p>
    </div>
  </div>
);

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
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

  return <Layout>{children}</Layout>;
};

function AppContent() {
  return (
    <>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/vendors"
          element={
            <ProtectedRoute>
              <Vendors />
            </ProtectedRoute>
          }
        />
        <Route
          path="/invoices"
          element={
            <ProtectedRoute>
              <InvoicesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/approvals"
          element={
            <ProtectedRoute>
              <Approvals />
            </ProtectedRoute>
          }
        />
        <Route
          path="/payments"
          element={
            <ProtectedRoute>
              <Payments />
            </ProtectedRoute>
          }
        />
        <Route
          path="/banking"
          element={
            <ProtectedRoute>
              <Banking />
            </ProtectedRoute>
          }
        />
        <Route
          path="/settings"
          element={
            <ProtectedRoute>
              <Suspense fallback={<PageFallback />}>
                <Settings />
              </Suspense>
            </ProtectedRoute>
          }
        />
        <Route
          path="/user-roles"
          element={
            <ProtectedRoute>
              <UserRoles />
            </ProtectedRoute>
          }
        />
        <Route
          path="/transactions"
          element={
            <ProtectedRoute>
              <TransactionsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/purchase-orders"
          element={
            <ProtectedRoute>
              <PurchaseOrdersPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/goods-receipt"
          element={
            <ProtectedRoute>
              <GoodsReceipt />
            </ProtectedRoute>
          }
        />
        <Route
          path="/tax-management"
          element={
            <ProtectedRoute>
              <Suspense fallback={<PageFallback />}>
                <TaxManagement />
              </Suspense>
            </ProtectedRoute>
          }
        />
        <Route
          path="/invoice-matching"
          element={
            <ProtectedRoute>
              <InvoiceMatching />
            </ProtectedRoute>
          }
        />
        <Route
          path="/payment-batches"
          element={
            <ProtectedRoute>
              <PaymentBatches />
            </ProtectedRoute>
          }
        />
        <Route
          path="/notifications"
          element={
            <ProtectedRoute>
              <Notifications />
            </ProtectedRoute>
          }
        />
        <Route
          path="/reports"
          element={
            <ProtectedRoute>
              <Suspense fallback={<PageFallback />}>
                <Reports />
              </Suspense>
            </ProtectedRoute>
          }
        />
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
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
            <AppContent />
          </SessionTimeout>
        </AuthProvider>
      </BrowserRouter>
    </div>
  );
}

export default App;
