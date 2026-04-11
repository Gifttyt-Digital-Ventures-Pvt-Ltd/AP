import React, { useState } from 'react';
import {
  useGetExecutiveDashboardQuery,
  useGetApReportsQuery,
  useGetVendorAnalyticsQuery,
  useGetTaxReportsQuery,
  useGetPaymentAnalyticsQuery,
} from '../../Services/apis/dashboardReportsApi';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Badge } from '../../components/ui/badge';
import { toast } from 'sonner';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import {
  DollarSign,
  FileText,
  Users,
  Clock,
  AlertTriangle,
  CheckCircle,
  Loader2,
  BarChart3,
  PieChartIcon,
  Receipt,
  CreditCard,
  Building2,
  Calculator
} from 'lucide-react';
import ReportsHeader from './components/ReportsHeader';
import MetricCard from './components/MetricCard';
import ReportsTooltip from './components/ReportsTooltip';

const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f97316', '#eab308', '#22c55e', '#14b8a6', '#06b6d4', '#3b82f6'];
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

const Reports = () => {
  const [activeTab, setActiveTab] = useState('executive');
  const [dateRange, setDateRange] = useState('30');
  const [customDays, setCustomDays] = useState('');

  const getDays = () => {
    if (dateRange === 'custom' && customDays) {
      return parseInt(customDays);
    }
    return parseInt(dateRange);
  };

  const days = getDays();
  const shouldSkip = !days || Number.isNaN(days) || days <= 0;

  const {
    data: executiveData = null,
    isLoading: executiveLoading,
    isFetching: executiveFetching,
    refetch: refetchExecutiveDashboard,
  } = useGetExecutiveDashboardQuery({ days }, { skip: shouldSkip });
  const {
    data: apData = null,
    isLoading: apLoading,
    isFetching: apFetching,
    refetch: refetchApReports,
  } = useGetApReportsQuery({ days }, { skip: shouldSkip });
  const {
    data: vendorData = null,
    isLoading: vendorLoading,
    isFetching: vendorFetching,
    refetch: refetchVendorAnalytics,
  } = useGetVendorAnalyticsQuery({ days }, { skip: shouldSkip });
  const {
    data: taxData = null,
    isLoading: taxLoading,
    isFetching: taxFetching,
    refetch: refetchTaxReports,
  } = useGetTaxReportsQuery({ days }, { skip: shouldSkip });
  const {
    data: paymentData = null,
    isLoading: paymentLoading,
    isFetching: paymentFetching,
    refetch: refetchPaymentAnalytics,
  } = useGetPaymentAnalyticsQuery({ days }, { skip: shouldSkip });

  const loading =
    executiveLoading ||
    apLoading ||
    vendorLoading ||
    taxLoading ||
    paymentLoading ||
    executiveFetching ||
    apFetching ||
    vendorFetching ||
    taxFetching ||
    paymentFetching;

  const fetchAllData = async () => {
    if (shouldSkip) return;

    try {
      await Promise.all([
        refetchExecutiveDashboard(),
        refetchApReports(),
        refetchVendorAnalytics(),
        refetchTaxReports(),
        refetchPaymentAnalytics(),
      ]);
    } catch (error) {
      console.error('Error refreshing analytics:', error);
      toast.error('Failed to refresh analytics data');
    }
  };

  if (loading && !executiveData) {
    return (
      <div className="min-h-[60vh] rounded-xl border border-border bg-card/50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
          <p className="mt-3 text-sm text-muted-foreground">Loading reports...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="reports-page">
      <ReportsHeader
        dateRange={dateRange}
        setDateRange={setDateRange}
        customDays={customDays}
        setCustomDays={setCustomDays}
        fetchAllData={fetchAllData}
        loading={loading}
      />

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-5 w-full max-w-3xl">
          <TabsTrigger value="executive" data-testid="tab-executive">
            <BarChart3 className="h-4 w-4 mr-2" />
            Executive
          </TabsTrigger>
          <TabsTrigger value="ap" data-testid="tab-ap">
            <FileText className="h-4 w-4 mr-2" />
            AP Reports
          </TabsTrigger>
          <TabsTrigger value="vendor" data-testid="tab-vendor">
            <Building2 className="h-4 w-4 mr-2" />
            Vendors
          </TabsTrigger>
          <TabsTrigger value="tax" data-testid="tab-tax">
            <Calculator className="h-4 w-4 mr-2" />
            Tax
          </TabsTrigger>
          <TabsTrigger value="payment" data-testid="tab-payment">
            <CreditCard className="h-4 w-4 mr-2" />
            Payments
          </TabsTrigger>
        </TabsList>

        {/* Executive Dashboard */}
        <TabsContent value="executive" className="space-y-6">
          {executiveData && (
            <>
              {/* Key Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <MetricCard
                  title="Total Spend"
                  value={formatCurrency(executiveData.key_metrics.total_spend)}
                  subtitle={`${executiveData.key_metrics.total_invoices} invoices`}
                  icon={DollarSign}
                  color="text-indigo-600"
                />
                <MetricCard
                  title="Paid"
                  value={formatCurrency(executiveData.key_metrics.paid_spend)}
                  icon={CheckCircle}
                  color="text-green-600"
                />
                <MetricCard
                  title="Pending"
                  value={formatCurrency(executiveData.key_metrics.pending_spend)}
                  icon={Clock}
                  color="text-yellow-600"
                />
                <MetricCard
                  title="Avg Invoice"
                  value={formatCurrency(executiveData.key_metrics.avg_invoice_value)}
                  icon={Receipt}
                  color="text-blue-600"
                />
                <MetricCard
                  title="Invoices"
                  value={executiveData.key_metrics.total_invoices}
                  icon={FileText}
                  color="text-purple-600"
                />
              </div>

              {/* Charts Row */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Monthly Spending Trend */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Spending Trend</CardTitle>
                    <CardDescription>Monthly spending over the last 6 months</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <AreaChart data={executiveData.monthly_trend}>
                        <defs>
                          <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                        <YAxis tickFormatter={formatCurrency} tick={{ fontSize: 12 }} />
                        <Tooltip content={<ReportsTooltip formatFullCurrency={formatFullCurrency} />} />
                        <Area
                          type="monotone"
                          dataKey="amount"
                          stroke="#6366f1"
                          strokeWidth={2}
                          fillOpacity={1}
                          fill="url(#colorAmount)"
                          name="Amount"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {/* Invoice Status Distribution */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Invoice Status Distribution</CardTitle>
                    <CardDescription>Breakdown by current status</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={executiveData.status_distribution}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={100}
                          paddingAngle={2}
                          dataKey="value"
                          label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                          labelLine={{ stroke: '#6b7280', strokeWidth: 1 }}
                        >
                          {executiveData.status_distribution.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={STATUS_COLORS[entry.name] || COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>

              {/* Top Vendors */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Top Vendors by Spend</CardTitle>
                  <CardDescription>Highest spending vendors in the period</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={executiveData.top_vendors.slice(0, 8)} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis type="number" tickFormatter={formatCurrency} tick={{ fontSize: 12 }} />
                      <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 11 }} />
                      <Tooltip content={<ReportsTooltip formatFullCurrency={formatFullCurrency} />} />
                      <Bar dataKey="amount" fill="#6366f1" radius={[0, 4, 4, 0]} name="Spend" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        {/* AP Reports */}
        <TabsContent value="ap" className="space-y-6">
          {apData && (
            <>
              {/* Processing Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <MetricCard
                  title="Avg Processing Time"
                  value={`${apData.processing_metrics.avg_processing_days} days`}
                  subtitle={`${apData.processing_metrics.total_processed} invoices processed`}
                  icon={Clock}
                  color="text-blue-600"
                />
                {apData.bottleneck_analysis.map((stage, idx) => (
                  <MetricCard
                    key={idx}
                    title={stage.stage}
                    value={stage.count}
                    subtitle="invoices waiting"
                    icon={stage.stage.includes('Payment') ? CreditCard : FileText}
                    color={stage.count > 5 ? 'text-red-600' : 'text-green-600'}
                  />
                ))}
              </div>

              {/* Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Aging Report */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Invoice Aging Report</CardTitle>
                    <CardDescription>Outstanding invoices by days overdue</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={apData.aging_report}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis dataKey="bucket" tick={{ fontSize: 12 }} />
                        <YAxis yAxisId="left" orientation="left" tick={{ fontSize: 12 }} />
                        <YAxis yAxisId="right" orientation="right" tickFormatter={formatCurrency} tick={{ fontSize: 12 }} />
                        <Tooltip content={<ReportsTooltip formatFullCurrency={formatFullCurrency} />} />
                        <Legend />
                        <Bar yAxisId="left" dataKey="count" fill="#6366f1" name="Count" radius={[4, 4, 0, 0]} />
                        <Bar yAxisId="right" dataKey="amount" fill="#22c55e" name="Amount" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {/* Invoice Volume Trend */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Invoice Volume Trend</CardTitle>
                    <CardDescription>Daily invoice submissions</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={apData.volume_trend}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis dataKey="date" tick={{ fontSize: 10 }} angle={-45} textAnchor="end" height={60} />
                        <YAxis tick={{ fontSize: 12 }} />
                        <Tooltip content={<ReportsTooltip formatFullCurrency={formatFullCurrency} />} />
                        <Line type="monotone" dataKey="count" stroke="#6366f1" strokeWidth={2} dot={{ r: 3 }} name="Invoices" />
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>

              {/* Bottleneck Analysis */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Approval Bottleneck Analysis</CardTitle>
                  <CardDescription>Invoices stuck at each stage</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={apData.bottleneck_analysis} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis type="number" tick={{ fontSize: 12 }} />
                      <YAxis type="category" dataKey="stage" width={130} tick={{ fontSize: 12 }} />
                      <Tooltip content={<ReportsTooltip formatFullCurrency={formatFullCurrency} />} />
                      <Bar dataKey="count" name="Invoices" radius={[0, 4, 4, 0]}>
                        {apData.bottleneck_analysis.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.count > 5 ? '#ef4444' : entry.count > 2 ? '#f59e0b' : '#22c55e'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        {/* Vendor Analytics */}
        <TabsContent value="vendor" className="space-y-6">
          {vendorData && (
            <>
              {/* Summary */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <MetricCard
                  title="Total Vendors"
                  value={vendorData.summary.total_vendors}
                  icon={Building2}
                  color="text-indigo-600"
                />
                <MetricCard
                  title="Active Vendors"
                  value={vendorData.summary.active_vendors}
                  subtitle="with transactions"
                  icon={Users}
                  color="text-green-600"
                />
                <MetricCard
                  title="Total Spend"
                  value={formatCurrency(vendorData.summary.total_spend)}
                  icon={DollarSign}
                  color="text-blue-600"
                />
                <MetricCard
                  title="Avg per Vendor"
                  value={formatCurrency(vendorData.summary.total_spend / (vendorData.summary.active_vendors || 1))}
                  icon={Receipt}
                  color="text-purple-600"
                />
              </div>

              {/* Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Category Distribution */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Spend by Category</CardTitle>
                    <CardDescription>Vendor category breakdown</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={vendorData.category_distribution}
                          cx="50%"
                          cy="50%"
                          outerRadius={100}
                          dataKey="amount"
                          label={({ category, percent }) => `${category} (${(percent * 100).toFixed(0)}%)`}
                          labelLine={{ stroke: '#6b7280', strokeWidth: 1 }}
                        >
                          {vendorData.category_distribution.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip content={<ReportsTooltip formatFullCurrency={formatFullCurrency} />} />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {/* Top Vendors Table */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Top Vendors</CardTitle>
                    <CardDescription>By total spend</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3 max-h-[300px] overflow-y-auto">
                      {vendorData.vendor_breakdown.slice(0, 10).map((vendor, idx) => (
                        <div key={idx} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium">
                              {idx + 1}
                            </div>
                            <div>
                              <p className="font-medium text-sm">{vendor.name}</p>
                              <p className="text-xs text-muted-foreground">{vendor.total_invoices} invoices</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-medium">{formatFullCurrency(vendor.total_amount)}</p>
                            <p className="text-xs text-green-600">{formatFullCurrency(vendor.paid_amount)} paid</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Vendor Breakdown Chart */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Vendor Spend Comparison</CardTitle>
                  <CardDescription>Top 10 vendors by spend</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={vendorData.vendor_breakdown.slice(0, 10)}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-45} textAnchor="end" height={80} />
                      <YAxis tickFormatter={formatCurrency} tick={{ fontSize: 12 }} />
                      <Tooltip content={<ReportsTooltip formatFullCurrency={formatFullCurrency} />} />
                      <Legend />
                      <Bar dataKey="paid_amount" stackId="a" fill="#22c55e" name="Paid" radius={[0, 0, 0, 0]} />
                      <Bar dataKey="pending_amount" stackId="a" fill="#f59e0b" name="Pending" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        {/* Tax Reports */}
        <TabsContent value="tax" className="space-y-6">
          {taxData && (
            <>
              {/* GST Section */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Calculator className="h-5 w-5" />
                    GST Summary
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 mb-6">
                    <div className="p-3 bg-muted rounded-lg">
                      <p className="text-xs text-muted-foreground">Taxable Amount</p>
                      <p className="text-lg font-bold">{formatCurrency(taxData.gst.summary.total_taxable)}</p>
                    </div>
                    <div className="p-3 bg-blue-50 rounded-lg">
                      <p className="text-xs text-blue-600">CGST</p>
                      <p className="text-lg font-bold text-blue-700">{formatCurrency(taxData.gst.summary.total_cgst)}</p>
                    </div>
                    <div className="p-3 bg-purple-50 rounded-lg">
                      <p className="text-xs text-purple-600">SGST</p>
                      <p className="text-lg font-bold text-purple-700">{formatCurrency(taxData.gst.summary.total_sgst)}</p>
                    </div>
                    <div className="p-3 bg-orange-50 rounded-lg">
                      <p className="text-xs text-orange-600">IGST</p>
                      <p className="text-lg font-bold text-orange-700">{formatCurrency(taxData.gst.summary.total_igst)}</p>
                    </div>
                    <div className="p-3 bg-indigo-50 rounded-lg">
                      <p className="text-xs text-indigo-600">Total GST</p>
                      <p className="text-lg font-bold text-indigo-700">{formatCurrency(taxData.gst.summary.total_gst)}</p>
                    </div>
                    <div className="p-3 bg-green-50 rounded-lg">
                      <p className="text-xs text-green-600">ITC Eligible</p>
                      <p className="text-lg font-bold text-green-700">{formatCurrency(taxData.gst.summary.itc_eligible)}</p>
                    </div>
                    <div className="p-3 bg-yellow-50 rounded-lg">
                      <p className="text-xs text-yellow-600">ITC Pending</p>
                      <p className="text-lg font-bold text-yellow-700">{formatCurrency(taxData.gst.summary.itc_pending)}</p>
                    </div>
                  </div>

                  {taxData.gst.monthly_trend.length > 0 && (
                    <ResponsiveContainer width="100%" height={250}>
                      <BarChart data={taxData.gst.monthly_trend}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                        <YAxis tickFormatter={formatCurrency} tick={{ fontSize: 12 }} />
                        <Tooltip content={<ReportsTooltip formatFullCurrency={formatFullCurrency} />} />
                        <Legend />
                        <Bar dataKey="cgst" fill="#3b82f6" name="CGST" stackId="a" />
                        <Bar dataKey="sgst" fill="#8b5cf6" name="SGST" stackId="a" />
                        <Bar dataKey="igst" fill="#f97316" name="IGST" stackId="a" />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>

              {/* TDS Section */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Receipt className="h-5 w-5" />
                    TDS Summary
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <div className="p-3 bg-muted rounded-lg">
                      <p className="text-xs text-muted-foreground">Base Amount</p>
                      <p className="text-lg font-bold">{formatCurrency(taxData.tds.summary.total_base_amount)}</p>
                    </div>
                    <div className="p-3 bg-blue-50 rounded-lg">
                      <p className="text-xs text-blue-600">TDS Deducted</p>
                      <p className="text-lg font-bold text-blue-700">{formatCurrency(taxData.tds.summary.total_deducted)}</p>
                    </div>
                    <div className="p-3 bg-green-50 rounded-lg">
                      <p className="text-xs text-green-600">TDS Deposited</p>
                      <p className="text-lg font-bold text-green-700">{formatCurrency(taxData.tds.summary.total_deposited)}</p>
                    </div>
                    <div className="p-3 bg-red-50 rounded-lg">
                      <p className="text-xs text-red-600">Pending Deposit</p>
                      <p className="text-lg font-bold text-red-700">{formatCurrency(taxData.tds.summary.pending_deposit)}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* TDS by Section */}
                    {taxData.tds.section_breakdown.length > 0 && (
                      <div>
                        <h4 className="font-medium mb-3">TDS by Section</h4>
                        <ResponsiveContainer width="100%" height={200}>
                          <BarChart data={taxData.tds.section_breakdown} layout="vertical">
                            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                            <XAxis type="number" tickFormatter={formatCurrency} tick={{ fontSize: 12 }} />
                            <YAxis type="category" dataKey="section" width={80} tick={{ fontSize: 12 }} />
                            <Tooltip content={<ReportsTooltip formatFullCurrency={formatFullCurrency} />} />
                            <Bar dataKey="tds_amount" fill="#6366f1" name="TDS Amount" radius={[0, 4, 4, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    )}

                    {/* TDS Quarterly */}
                    {taxData.tds.quarterly_trend.length > 0 && (
                      <div>
                        <h4 className="font-medium mb-3">Quarterly Trend</h4>
                        <ResponsiveContainer width="100%" height={200}>
                          <BarChart data={taxData.tds.quarterly_trend}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                            <XAxis dataKey="period" tick={{ fontSize: 10 }} />
                            <YAxis tickFormatter={formatCurrency} tick={{ fontSize: 12 }} />
                            <Tooltip content={<ReportsTooltip formatFullCurrency={formatFullCurrency} />} />
                            <Legend />
                            <Bar dataKey="deducted" fill="#3b82f6" name="Deducted" />
                            <Bar dataKey="deposited" fill="#22c55e" name="Deposited" />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        {/* Payment Analytics */}
        <TabsContent value="payment" className="space-y-6">
          {paymentData && (
            <>
              {/* Summary */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <MetricCard
                  title="Total Payments"
                  value={paymentData.summary.total_payments}
                  subtitle={formatFullCurrency(paymentData.summary.total_amount)}
                  icon={CreditCard}
                  color="text-indigo-600"
                />
                <MetricCard
                  title="Avg Payment"
                  value={formatCurrency(paymentData.summary.avg_payment)}
                  icon={DollarSign}
                  color="text-green-600"
                />
                <MetricCard
                  title="Batch Success Rate"
                  value={`${paymentData.batch_metrics.success_rate}%`}
                  subtitle={`${paymentData.batch_metrics.successful_items}/${paymentData.batch_metrics.total_items_processed} items`}
                  icon={CheckCircle}
                  color={paymentData.batch_metrics.success_rate >= 80 ? 'text-green-600' : 'text-yellow-600'}
                />
                <MetricCard
                  title="Batches Completed"
                  value={paymentData.batch_metrics.completed_batches}
                  subtitle={`${paymentData.batch_metrics.failed_batches} failed`}
                  icon={FileText}
                  color="text-blue-600"
                />
              </div>

              {/* Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Payment Methods */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Payment Methods</CardTitle>
                    <CardDescription>Distribution by payment type</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {paymentData.payment_methods.length > 0 ? (
                      <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                          <Pie
                            data={paymentData.payment_methods}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={100}
                            paddingAngle={2}
                            dataKey="amount"
                            label={({ method, percent }) => `${method} (${(percent * 100).toFixed(0)}%)`}
                          >
                            {paymentData.payment_methods.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip content={<ReportsTooltip formatFullCurrency={formatFullCurrency} />} />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                        No payment data available
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Cash Flow Projection */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Cash Flow Projection</CardTitle>
                    <CardDescription>Projected outflows for next 4 weeks</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={paymentData.cash_flow_projection}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis dataKey="week" tick={{ fontSize: 12 }} />
                        <YAxis tickFormatter={formatCurrency} tick={{ fontSize: 12 }} />
                        <Tooltip content={<ReportsTooltip formatFullCurrency={formatFullCurrency} />} />
                        <Bar dataKey="projected_outflow" fill="#ef4444" name="Projected Outflow" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>

              {/* Payment Trend */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Payment Volume Trend</CardTitle>
                  <CardDescription>Daily payment activity</CardDescription>
                </CardHeader>
                <CardContent>
                  {paymentData.payment_trend.length > 0 ? (
                    <ResponsiveContainer width="100%" height={250}>
                      <LineChart data={paymentData.payment_trend}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis dataKey="date" tick={{ fontSize: 10 }} angle={-45} textAnchor="end" height={60} />
                        <YAxis yAxisId="left" orientation="left" tick={{ fontSize: 12 }} />
                        <YAxis yAxisId="right" orientation="right" tickFormatter={formatCurrency} tick={{ fontSize: 12 }} />
                        <Tooltip content={<ReportsTooltip formatFullCurrency={formatFullCurrency} />} />
                        <Legend />
                        <Line yAxisId="left" type="monotone" dataKey="count" stroke="#6366f1" strokeWidth={2} name="Count" />
                        <Line yAxisId="right" type="monotone" dataKey="amount" stroke="#22c55e" strokeWidth={2} name="Amount" />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-[250px] text-muted-foreground">
                      No payment trend data available
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Reports;

