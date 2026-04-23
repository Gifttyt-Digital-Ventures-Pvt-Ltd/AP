import React, { useState, useEffect, useRef, createContext, useContext } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
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
  BarChart3
} from 'lucide-react';

// Context to control sidebar visibility from child components
const SidebarContext = createContext({
  hideSidebar: false,
  setHideSidebar: () => {}
});

export const useSidebar = () => useContext(SidebarContext);

export const Layout = ({ children }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const mainContentRef = useRef(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [hideSidebar, setHideSidebar] = useState(false);

  const menuItems = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard', roles: ['all'] },
    { icon: Users, label: 'Vendors', path: '/vendors', roles: ['all'] },
    { icon: ShoppingCart, label: 'Purchase Orders', path: '/purchase-orders', roles: ['all'] },
    { icon: Package, label: 'Goods Receipt', path: '/goods-receipt', roles: ['all'] },
    { icon: FileText, label: 'Invoices', path: '/invoices', roles: ['all'] },
    { icon: Link2, label: 'Invoice Matching', path: '/invoice-matching', roles: ['all'] },
    { icon: ArrowLeftRight, label: 'Transactions', path: '/transactions', roles: ['all'] },
    { icon: CheckCircle, label: 'Approvals', path: '/approvals', roles: ['Checker', 'Approver', 'Admin'] },
    { icon: CreditCard, label: 'Payments', path: '/payments', roles: ['all'] },
    { icon: Layers, label: 'Payment Batches', path: '/payment-batches', roles: ['Admin', 'Accountant'] },
    { icon: Calculator, label: 'Tax Management', path: '/tax-management', roles: ['Admin', 'Accountant'] },
    { icon: BarChart3, label: 'Reports', path: '/reports', roles: ['Admin', 'Accountant', 'Approver'] },
    { icon: Building2, label: 'Banking', path: '/banking', roles: ['all'] },
    { icon: Bell, label: 'Notifications', path: '/notifications', roles: ['Admin'] },
    { icon: Shield, label: 'User Roles', path: '/user-roles', roles: ['Admin'] },
    { icon: Settings, label: 'Settings', path: '/settings', roles: ['Admin'] }
  ];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isActive = (path) => location.pathname === path;
  const handleNavigate = (path) => {
    if (location.pathname === path) return;
    navigate(path);
  };

  const canAccessRoute = (roles) => {
    if (roles.includes('all')) return true;
    if (!user) return false;
    // Handle both uppercase and title case role formats
    const userRole = user.role;
    return roles.some(role => 
      role.toUpperCase() === userRole.toUpperCase()
    );
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
                <h1 className="text-xl font-bold  text-primary" data-testid="app-title">
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
                if (!canAccessRoute(item.roles)) return null;
                
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
              {sidebarOpen && user && (
                <div className="mb-4" data-testid="user-info">
                  <p className="text-sm font-medium">{user.name}</p>
                  <p className="text-xs text-muted-foreground">{user.role}</p>
                </div>
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
          className="flex-1 min-h-0 overflow-y-auto overscroll-contain"
          data-testid="main-content"
        >
          <div className={hideSidebar ? "p-4 min-h-full" : "p-6 md:p-8 lg:p-12 min-h-full"}>
            {children}
          </div>
        </main>
      </div>
    </SidebarContext.Provider>
  );
};

