import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useRBAC } from '../../contexts/RBACContext';
import {
  useGetCorporateDetailsQuery,
  useGetCorporateUserDetailsQuery,
} from '../../Services/apis/corporateApi';
import {
  useGetDashboardStatsQuery,
  useGetExecutiveDashboardQuery,
  useGetApReportsQuery,
} from '../../Services/apis/dashboardReportsApi';
import { useGetInvoicesQuery } from '../../Services/apis/invoicesVendorsApi';
import { useGetPurchaseOrdersQuery } from '../../Services/apis/purchaseOrdersMasterDataApi';
import { useGetPaymentBatchStatsQuery } from '../../Services/apis/paymentBatchesApi';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Progress } from '../../components/ui/progress';
import { toast } from 'sonner';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import {
  FileText,
  Users,
  CheckCircle,
  IndianRupee,
  TrendingUp,
  TrendingDown,
  Clock,
  AlertTriangle,
  ArrowRight,
  ShoppingCart,
  Package,
  CreditCard,
  Calculator,
  Building2,
  RefreshCw,
  Loader2,
  Receipt,
  Layers,
  BarChart3,
  Bell
} from 'lucide-react';

const COLORS = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#3b82f6', '#8b5cf6'];
const STATUS_COLORS = {
  'Pending Checker': '#f59e0b',
  'Pending Approver': '#f97316',
  'Pending Payment': '#3b82f6',
  'Amount Released': '#22c55e',
  'Rejected': '#ef4444',
  'Draft': '#6b7280'
};

const formatCurrency = (amount) => {
  if (amount >= 10000000) return `\u20B9${(amount / 10000000).toFixed(2)}Cr`;
  if (amount >= 100000) return `\u20B9${(amount / 100000).toFixed(2)}L`;
  if (amount >= 1000) return `\u20B9${(amount / 1000).toFixed(1)}K`;
  return `\u20B9${amount?.toFixed(0) || 0}`;
};

const formatFullCurrency = (amount) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount || 0);
};

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-3 border rounded-lg shadow-lg text-sm">
        <p className="font-medium">{label}</p>
        {payload.map((entry, index) => (
          <p key={index} style={{ color: entry.color }}>
            {entry.name}: {typeof entry.value === 'number' && entry.value > 100 
              ? formatFullCurrency(entry.value) 
              : entry.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

const Dashboard = () => {
  const { user } = useAuth();
  const { isPaymentBatchesFeatureEnabled } = useRBAC();
  const { data: corporateContext = null } = useGetCorporateDetailsQuery();
  const { data: corporateUserContext = null } = useGetCorporateUserDetailsQuery();
  const navigate = useNavigate();
  const {
    data: stats = null,
    isLoading: statsLoading,
    isFetching: statsFetching,
    refetch: refetchStats,
  } = useGetDashboardStatsQuery();
  const {
    data: executiveData = null,
    isLoading: executiveLoading,
    isFetching: executiveFetching,
    refetch: refetchExecutiveDashboard,
  } = useGetExecutiveDashboardQuery({ days: 30 });
  const {
    data: apData = null,
    isLoading: apLoading,
    isFetching: apFetching,
    refetch: refetchApReports,
  } = useGetApReportsQuery({ days: 30 });
  const {
    data: recentInvoicesData = [],
    isLoading: invoicesLoading,
    isFetching: invoicesFetching,
    refetch: refetchInvoices,
  } = useGetInvoicesQuery({ limit: 5 });
  const {
    data: pendingApprovalsData = [],
    isLoading: pendingApprovalsLoading,
    isFetching: pendingApprovalsFetching,
    refetch: refetchPendingApprovals,
  } = useGetInvoicesQuery({ status: 'Pending Approver' });
  const {
    data: recentPOsData = [],
    isLoading: purchaseOrdersLoading,
    isFetching: purchaseOrdersFetching,
    refetch: refetchPurchaseOrders,
  } = useGetPurchaseOrdersQuery({ limit: 5 });
  const {
    data: paymentBatchStats = null,
    isLoading: batchStatsLoading,
    isFetching: batchStatsFetching,
    refetch: refetchPaymentBatchStats,
  } = useGetPaymentBatchStatsQuery(undefined, { skip: !isPaymentBatchesFeatureEnabled });

  const recentInvoices = Array.isArray(recentInvoicesData)
    ? recentInvoicesData.slice(0, 5)
    : [];
  const recentPOs = Array.isArray(recentPOsData) ? recentPOsData.slice(0, 5) : [];
  const pendingApprovals = Array.isArray(pendingApprovalsData)
    ? pendingApprovalsData.slice(0, 5)
    : [];

  const loading =
    statsLoading ||
    executiveLoading ||
    apLoading ||
    invoicesLoading ||
    pendingApprovalsLoading ||
    purchaseOrdersLoading ||
    (isPaymentBatchesFeatureEnabled && batchStatsLoading);
  const refreshing =
    statsFetching ||
    executiveFetching ||
    apFetching ||
    invoicesFetching ||
    pendingApprovalsFetching ||
    purchaseOrdersFetching ||
    (isPaymentBatchesFeatureEnabled && batchStatsFetching);

  const fetchAllData = async () => {
    try {
      await Promise.all([
        refetchStats(),
        refetchExecutiveDashboard(),
        refetchApReports(),
        refetchInvoices(),
        refetchPendingApprovals(),
        refetchPurchaseOrders(),
        refetchPaymentBatchStats(),
      ]);
    } catch (error) {
      console.error('Error refreshing dashboard data:', error);
      toast.error('Failed to refresh dashboard data');
    }
  };

  const getStatusBadgeVariant = (status) => {
    switch (status) {
      case 'Amount Released': return 'default';
      case 'Pending Payment': return 'secondary';
      case 'Pending Approver': case 'Pending Checker': return 'outline';
      case 'Rejected': return 'destructive';
      default: return 'outline';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Calculate additional metrics
  const approvalRate = stats?.total_invoices > 0 
    ? ((stats.paid_invoices / stats.total_invoices) * 100).toFixed(1) 
    : 0;
  const corporateName = String(corporateContext?.corporate?.name || '').trim();
  const resolvedUserName =
    String(corporateUserContext?.corporateUser?.name || '').trim() ||
    String(user?.name || '').trim();
  const headerName = resolvedUserName || 'User';
  
  const pendingValue = stats?.pending_amount || 0;
  const paidValue = stats?.paid_amount || 0;
  const totalValue = stats?.total_amount || 0;
  const paidPercentage = totalValue > 0 ? (paidValue / totalValue) * 100 : 0;

  return (
    <div data-testid="dashboard-page" className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-primary mb-1" data-testid="dashboard-title">
            Welcome back, {headerName}
          </h1>
          <p className="text-muted-foreground">
            {corporateName
              ? `${corporateName} · Here's what's happening with your accounts payable today`
              : "Here's what's happening with your accounts payable today"}
          </p>
        </div>
        <Button variant="outline" onClick={fetchAllData} disabled={refreshing} data-testid="refresh-btn">
          <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Key Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4" data-testid="stats-grid">
        <Card className="bg-gradient-to-br from-indigo-50 to-white border-indigo-100">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-indigo-100">
                <FileText className="h-5 w-5 text-indigo-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Invoices</p>
                <p className="text-xl font-bold text-indigo-600" data-testid="stat-value-0">{stats?.total_invoices || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-yellow-50 to-white border-yellow-100">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-yellow-100">
                <Clock className="h-5 w-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Pending Approval</p>
                <p className="text-xl font-bold text-yellow-600" data-testid="stat-value-1">{stats?.pending_approvals || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-white border-green-100">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Paid</p>
                <p className="text-xl font-bold text-green-600">{stats?.paid_invoices || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-50 to-white border-blue-100">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100">
                <IndianRupee className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Value</p>
                <p className="text-xl font-bold text-blue-600" data-testid="stat-value-2">{formatCurrency(totalValue)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-emerald-50 to-white border-emerald-100">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-100">
                <Users className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Vendors</p>
                <p className="text-xl font-bold text-emerald-600" data-testid="stat-value-3">{stats?.vendors_count || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-white border-purple-100">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-100">
                <TrendingUp className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Completion Rate</p>
                <p className="text-xl font-bold text-purple-600">{approvalRate}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Payment Progress Card */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold">Payment Progress</h3>
              <p className="text-sm text-muted-foreground">Track your payment completion</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-green-600">{formatFullCurrency(paidValue)}</p>
              <p className="text-sm text-muted-foreground">of {formatFullCurrency(totalValue)} paid</p>
            </div>
          </div>
          <Progress value={paidPercentage} className="h-3" />
          <div className="flex justify-between mt-2 text-sm">
            <span className="text-green-600">Paid: {paidPercentage.toFixed(1)}%</span>
            <span className="text-yellow-600">Pending: {formatFullCurrency(pendingValue)}</span>
          </div>
        </CardContent>
      </Card>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Spending Trend */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Spending Trend (Last 6 Months)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {executiveData?.monthly_trend?.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={executiveData.monthly_trend}>
                  <defs>
                    <linearGradient id="colorSpend" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tickFormatter={formatCurrency} tick={{ fontSize: 11 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="amount"
                    stroke="#6366f1"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorSpend)"
                    name="Spend"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[220px] flex items-center justify-center text-muted-foreground">
                No spending data available
              </div>
            )}
          </CardContent>
        </Card>

        {/* Invoice Status Distribution */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              Invoice Status Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            {executiveData?.status_distribution?.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={executiveData.status_distribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                    label={({ name, percent }) => `${name.split(' ')[0]} (${(percent * 100).toFixed(0)}%)`}
                    labelLine={{ stroke: '#6b7280', strokeWidth: 1 }}
                  >
                    {executiveData.status_distribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={STATUS_COLORS[entry.name] || COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[220px] flex items-center justify-center text-muted-foreground">
                No invoice data available
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions & Bottleneck Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Actions */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button 
              variant="outline" 
              className="w-full justify-start" 
              onClick={() => navigate('/invoices')}
              data-testid="quick-action-invoices"
            >
              <FileText className="h-4 w-4 mr-3 text-indigo-600" />
              Upload Invoice
              <ArrowRight className="h-4 w-4 ml-auto" />
            </Button>
            <Button 
              variant="outline" 
              className="w-full justify-start" 
              onClick={() => navigate('/purchase-orders')}
              data-testid="quick-action-po"
            >
              <ShoppingCart className="h-4 w-4 mr-3 text-blue-600" />
              Create Purchase Order
              <ArrowRight className="h-4 w-4 ml-auto" />
            </Button>
            <Button 
              variant="outline" 
              className="w-full justify-start" 
              onClick={() => navigate('/vendors')}
              data-testid="quick-action-vendor"
            >
              <Building2 className="h-4 w-4 mr-3 text-emerald-600" />
              Add New Vendor
              <ArrowRight className="h-4 w-4 ml-auto" />
            </Button>
            {isPaymentBatchesFeatureEnabled && (
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => navigate('/payments')}
                data-testid="quick-action-batch"
              >
                <Layers className="h-4 w-4 mr-3 text-purple-600" />
                Create Payment Batch
                <ArrowRight className="h-4 w-4 ml-auto" />
              </Button>
            )}
            <Button 
              variant="outline" 
              className="w-full justify-start" 
              onClick={() => navigate('/reports')}
              data-testid="quick-action-reports"
            >
              <BarChart3 className="h-4 w-4 mr-3 text-orange-600" />
              View Reports
              <ArrowRight className="h-4 w-4 ml-auto" />
            </Button>
          </CardContent>
        </Card>

        {/* Approval Bottleneck */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-600" />
              Approval Bottleneck
            </CardTitle>
          </CardHeader>
          <CardContent>
            {apData?.bottleneck_analysis?.length > 0 ? (
              <div className="space-y-4">
                {apData.bottleneck_analysis.map((stage, idx) => (
                  <div key={idx}>
                    <div className="flex justify-between text-sm mb-1">
                      <span>{stage.stage}</span>
                      <span className={`font-semibold ${stage.count > 5 ? 'text-red-600' : stage.count > 2 ? 'text-yellow-600' : 'text-green-600'}`}>
                        {stage.count} invoices
                      </span>
                    </div>
                    <Progress 
                      value={Math.min((stage.count / 10) * 100, 100)} 
                      className={`h-2 ${stage.count > 5 ? '[&>div]:bg-red-500' : stage.count > 2 ? '[&>div]:bg-yellow-500' : '[&>div]:bg-green-500'}`}
                    />
                  </div>
                ))}
                <p className="text-xs text-muted-foreground mt-2">
                  Processing time: ~{apData.processing_metrics?.avg_processing_days || 0} days avg
                </p>
              </div>
            ) : (
              <div className="text-center text-muted-foreground py-4">
                No bottleneck data available
              </div>
            )}
          </CardContent>
        </Card>

        {isPaymentBatchesFeatureEnabled && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Layers className="h-5 w-5 text-purple-600" />
                Payment Batches
              </CardTitle>
            </CardHeader>
            <CardContent>
              {paymentBatchStats ? (
                <div className="space-y-3">
                  <div className="flex justify-between items-center p-2 bg-muted rounded">
                    <span className="text-sm">Total Batches</span>
                    <span className="font-semibold">{paymentBatchStats.total_batches || 0}</span>
                  </div>
                  <div className="flex justify-between items-center p-2 bg-yellow-50 rounded">
                    <span className="text-sm">Pending</span>
                    <Badge variant="outline" className="bg-yellow-100 text-yellow-700">
                      {paymentBatchStats.pending?.count ?? paymentBatchStats.pending ?? 0}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center p-2 bg-green-50 rounded">
                    <span className="text-sm">Completed</span>
                    <Badge variant="outline" className="bg-green-100 text-green-700">
                      {paymentBatchStats.completed?.count || 0}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center p-2 bg-blue-50 rounded">
                    <span className="text-sm">Total Processed</span>
                    <span className="font-semibold text-blue-600">
                      {formatCurrency(paymentBatchStats.completed?.amount || 0)}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="text-center text-muted-foreground py-4">
                  No batch data available
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Recent Activity Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Invoices */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex justify-between items-center">
              <CardTitle className="text-lg">Recent Invoices</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => navigate('/invoices')}>
                View All <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {recentInvoices.length > 0 ? (
              <div className="space-y-3">
                {recentInvoices.map((invoice, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <Receipt className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">{invoice.invoice_number || 'N/A'}</p>
                        <p className="text-xs text-muted-foreground">{invoice.vendor_name || 'Unknown Vendor'}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-sm">{formatFullCurrency(invoice.amount)}</p>
                      <Badge variant={getStatusBadgeVariant(invoice.status)} className="text-xs">
                        {invoice.status?.split(' ')[0] || 'Unknown'}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center text-muted-foreground py-8">
                No recent invoices
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Vendors */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex justify-between items-center">
              <CardTitle className="text-lg">Top Vendors by Spend</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => navigate('/vendors')}>
                View All <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {executiveData?.top_vendors?.length > 0 ? (
              <div className="space-y-3">
                {executiveData.top_vendors.slice(0, 5).map((vendor, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-sm font-semibold text-emerald-700">
                        {idx + 1}
                      </div>
                      <p className="font-medium text-sm">{vendor.name}</p>
                    </div>
                    <p className="font-semibold text-sm text-emerald-600">{formatFullCurrency(vendor.amount)}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center text-muted-foreground py-8">
                No vendor data available
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Pending Approvals Alert */}
      {pendingApprovals.length > 0 && (
        <Card className="border-yellow-200 bg-yellow-50/50">
          <CardHeader className="pb-3">
            <div className="flex justify-between items-center">
              <CardTitle className="text-lg flex items-center gap-2">
                <Bell className="h-5 w-5 text-yellow-600" />
                Pending Your Approval ({pendingApprovals.length})
              </CardTitle>
              <Button variant="outline" size="sm" onClick={() => navigate('/approvals')}>
                Review All <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {pendingApprovals.slice(0, 3).map((invoice, idx) => (
                <div key={idx} className="p-3 bg-white rounded-lg border border-yellow-200">
                  <div className="flex justify-between items-start mb-2">
                    <p className="font-medium text-sm">{invoice.invoice_number}</p>
                    <Badge variant="outline" className="bg-yellow-100 text-yellow-700 text-xs">
                      Pending
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mb-1">{invoice.vendor_name}</p>
                  <p className="font-semibold">{formatFullCurrency(invoice.amount)}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Invoice Status Summary (Original Logic Preserved) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Invoice Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center p-2 bg-emerald-50 rounded">
                <span className="text-sm">Approved</span>
                <span className="font-semibold text-emerald-600">
                  {stats?.approved_invoices || 0}
                </span>
              </div>
              <div className="flex justify-between items-center p-2 bg-blue-50 rounded">
                <span className="text-sm">Amount Released</span>
                <span className="font-semibold text-blue-600">
                  {stats?.paid_invoices || 0}
                </span>
              </div>
              <div className="flex justify-between items-center p-2 bg-yellow-50 rounded">
                <span className="text-sm">Pending Payment</span>
                <span className="font-semibold text-yellow-600">
                  {stats?.approved_invoices || 0}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Payment Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center p-2 bg-muted rounded">
                <span className="text-sm">Total Amount</span>
                <span className="font-semibold">
                  {formatFullCurrency(stats?.total_amount || 0)}
                </span>
              </div>
              <div className="flex justify-between items-center p-2 bg-blue-50 rounded">
                <span className="text-sm">Amount Released</span>
                <span className="font-semibold text-blue-600">
                  {formatFullCurrency(stats?.paid_amount || 0)}
                </span>
              </div>
              <div className="flex justify-between items-center p-2 bg-yellow-50 rounded">
                <span className="text-sm">Pending Payment</span>
                <span className="font-semibold text-yellow-600">
                  {formatFullCurrency(stats?.pending_amount || 0)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
