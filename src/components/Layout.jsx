import React, { useState, useEffect, useRef, createContext, useContext } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useRBAC } from '../contexts/RBACContext';
import {
  useGetCorporateDetailsQuery,
  useGetCorporateUserDetailsQuery,
} from '../Services/apis/corporateApi';
import { redirectToOriginLogin } from '../utils/authRedirect';
import { Button } from './ui/button';
import {
  LayoutDashboard,
  Users,
  FileText,
  CheckCircle,
  CreditCard,
  Settings,
  LogOut,
  Menu,
  X,
  Building2,
  Shield,
  ArrowLeftRight,
  ShoppingCart,
  Package,
  Calculator,
  Link2,
  Layers,
  Bell,
  BarChart3,
  History,
  Megaphone
} from 'lucide-react';

// Context to control sidebar visibility from child components
const SidebarContext = createContext({
  hideSidebar: false,
  setHideSidebar: () => {}
});

export const useSidebar = () => useContext(SidebarContext);

export const Layout = ({ children }) => {
  const { user, logout } = useAuth();
  const { canAccessRoute, isLoaded: rbacLoaded } = useRBAC();
  const { data: corporateContext = null } = useGetCorporateDetailsQuery();
  const { data: corporateUserContext = null } = useGetCorporateUserDetailsQuery();
  const navigate = useNavigate();
  const location = useLocation();
  const mainContentRef = useRef(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [hideSidebar, setHideSidebar] = useState(false);
  const corporateName = String(corporateContext?.corporate?.name || '').trim();
  const userName =
    String(corporateUserContext?.corporateUser?.name || '').trim() ||
    String(user?.name || '').trim();
  const sidebarPrimaryName = corporateName || userName || 'User';
  const sidebarSecondaryLabel = userName;

  const menuItems = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
    { icon: ShoppingCart, label: 'Purchase Orders', path: '/purchase-orders' },
    { icon: Package, label: 'Goods Receipt', path: '/goods-receipt' },
    { icon: FileText, label: 'Invoices', path: '/invoices' },
    { icon: Link2, label: 'Invoice Matching', path: '/invoice-matching' },
    { icon: ArrowLeftRight, label: 'Transactions', path: '/transactions' },
    { icon: CheckCircle, label: 'Approvals', path: '/approvals' },
    { icon: CreditCard, label: 'Payments', path: '/payments' },
    { icon: Layers, label: 'Payment Batches', path: '/payment-batches' },
    { icon: Users, label: 'Vendors', path: '/vendors' },
    { icon: Megaphone, label: 'Campaigns', path: '/campaigns' },
    { icon: Calculator, label: 'Tax Management', path: '/tax-management' },
    { icon: BarChart3, label: 'Reports', path: '/reports' },
    { icon: History, label: 'Audit Trail', path: '/audit-trail' },
    { icon: Building2, label: 'Banking', path: '/banking' },
    { icon: Bell, label: 'Notifications', path: '/notifications' },
    { icon: Shield, label: 'User Roles', path: '/user-roles' },
    { icon: Settings, label: 'Settings', path: '/settings' }
  ];

  const handleLogout = () => {
    logout();
    redirectToOriginLogin();
  };

  const isActive = (path) => location.pathname === path;
  const handleNavigate = (path) => {
    if (location.pathname === path) return;
    navigate(path);
  };

  const canShowNavItem = (path) => {
    if (!rbacLoaded) return false;
    return canAccessRoute(path);
  };

  useEffect(() => {
    if (!mainContentRef.current) return;
    mainContentRef.current.scrollTo({ top: 0, behavior: 'auto' });
  }, [location.pathname]);

  return (
    <SidebarContext.Provider value={{ hideSidebar, setHideSidebar }}>
      <div className="flex h-screen overflow-hidden bg-background" data-testid="layout-container">
        {/* Sidebar - Hidden when hideSidebar is true */}
        {!hideSidebar && (
          <aside
            className={`${
              sidebarOpen ? 'w-64' : 'w-16'
            } border-r border-border bg-card transition-all duration-300 flex flex-col min-h-0`}
            data-testid="sidebar"
          >
            <div className="p-4 border-b border-border flex items-center justify-between">
              {sidebarOpen && (
                <h1 className="text-xl font-bold font-['Manrope'] text-primary" data-testid="app-title">
                  AP Portal
                </h1>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSidebarOpen(!sidebarOpen)}
                data-testid="sidebar-toggle"
              >
                {sidebarOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
              </Button>
            </div>

            <nav className="flex-1 min-h-0 overflow-y-auto scrollbar-none p-4 space-y-2" data-testid="sidebar-nav">
              {menuItems.map((item) => {
                if (!canShowNavItem(item.path)) return null;
                
                const Icon = item.icon;
                return (
                  <button
                    key={item.path}
                    onClick={() => handleNavigate(item.path)}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-md transition-all ${
                      isActive(item.path)
                        ? 'bg-primary text-primary-foreground'
                        : 'hover:bg-accent hover:text-accent-foreground'
                    }`}
                    data-testid={`nav-${item.label.toLowerCase()}`}
                  >
                    <Icon className="h-5 w-5" />
                    {sidebarOpen && <span className="text-sm font-medium">{item.label}</span>}
                  </button>
                );
              })}
            </nav>

            <div className="p-4 border-t border-border">
              {sidebarOpen && (user || corporateName || userName) && (
                <button
                  type="button"
                  onClick={() => handleNavigate('/profile')}
                  className="mb-4 w-full rounded-md px-2 py-2 text-left transition-colors hover:bg-accent/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  data-testid="user-info"
                >
                  <p className="text-sm font-medium">{sidebarPrimaryName}</p>
                  <p className="text-xs text-muted-foreground">{sidebarSecondaryLabel}</p>
                </button>
              )}
              <Button
                variant="ghost"
                className="w-full justify-start"
                onClick={handleLogout}
                data-testid="logout-button"
              >
                <LogOut className="h-5 w-5" />
                {sidebarOpen && <span className="ml-3">Logout</span>}
              </Button>
            </div>
          </aside>
        )}

        {/* Main Content */}
        <main
          ref={mainContentRef}
          className="flex min-h-0 flex-1 flex-col overflow-hidden overscroll-contain"
          data-testid="main-content"
        >
          <div
            className={
              hideSidebar
                ? "flex min-h-0 flex-1 flex-col overflow-y-auto p-4"
                : "flex min-h-0 flex-1 flex-col overflow-y-auto p-6 md:p-8 lg:p-12"
            }
          >
            {children}
          </div>
        </main>
      </div>
    </SidebarContext.Provider>
  );
};
