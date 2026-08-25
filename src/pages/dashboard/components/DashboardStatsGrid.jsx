import React from "react";
import {
  FileText,
  Clock,
  CheckCircle,
  IndianRupee,
  Users,
  TrendingUp,
} from "lucide-react";
import DashboardMetricCard from "./DashboardMetricCard";
import InvoiceAvailabilityCard from "../../../components/billing/InvoiceAvailabilityCard";

const DashboardStatsGrid = ({
  stats,
  totalValue,
  approvalRate,
  formatCompactCurrency,
  invoiceUsageSummary,
  showInvoiceAvailability,
}) => (
  <div
    className={`grid grid-cols-2 md:grid-cols-3 lg:${showInvoiceAvailability ? "grid-cols-6" : "grid-cols-5"} gap-4`}
    data-testid="stats-grid"
  >
    <DashboardMetricCard
      icon={FileText}
      label="Total Invoices"
      value={stats?.total_invoices || 0}
      cardClassName="bg-gradient-to-br from-indigo-50 to-white border-indigo-100"
      iconWrapperClassName="bg-indigo-100"
      iconClassName="text-indigo-600"
      valueClassName="text-indigo-600"
      testId="stat-value-0"
    />
    <DashboardMetricCard
      icon={Clock}
      label="Pending Approval"
      value={stats?.pending_approvals || 0}
      cardClassName="bg-gradient-to-br from-yellow-50 to-white border-yellow-100"
      iconWrapperClassName="bg-yellow-100"
      iconClassName="text-yellow-600"
      valueClassName="text-yellow-600"
      testId="stat-value-1"
    />
    <DashboardMetricCard
      icon={CheckCircle}
      label="Paid"
      value={stats?.paid_invoices || 0}
      cardClassName="bg-gradient-to-br from-green-50 to-white border-green-100"
      iconWrapperClassName="bg-green-100"
      iconClassName="text-green-600"
      valueClassName="text-green-600"
    />
    <DashboardMetricCard
      icon={IndianRupee}
      label="Total Value"
      value={formatCompactCurrency(totalValue)}
      cardClassName="bg-gradient-to-br from-blue-50 to-white border-blue-100"
      iconWrapperClassName="bg-blue-100"
      iconClassName="text-blue-600"
      valueClassName="text-blue-600"
      testId="stat-value-2"
    />
    <DashboardMetricCard
      icon={Users}
      label="Vendors"
      value={stats?.vendors_count || 0}
      cardClassName="bg-gradient-to-br from-emerald-50 to-white border-emerald-100"
      iconWrapperClassName="bg-emerald-100"
      iconClassName="text-emerald-600"
      valueClassName="text-emerald-600"
      testId="stat-value-3"
    />
    {/* <DashboardMetricCard
      icon={TrendingUp}
      label="Completion Rate"
      value={`${approvalRate}%`}
      cardClassName="bg-gradient-to-br from-purple-50 to-white border-purple-100"
      iconWrapperClassName="bg-purple-100"
      iconClassName="text-purple-600"
      valueClassName="text-purple-600"
    /> */}
    {showInvoiceAvailability && (
      <InvoiceAvailabilityCard
        summary={invoiceUsageSummary}
        className="h-full"
      />
    )}
  </div>
);

export default DashboardStatsGrid;
