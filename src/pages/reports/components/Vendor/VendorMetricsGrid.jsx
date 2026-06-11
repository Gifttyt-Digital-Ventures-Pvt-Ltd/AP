import React from 'react';
import { Building2, Users, DollarSign, Receipt } from 'lucide-react';
import MetricCard from '../MetricCard';

const VendorMetricsGrid = ({ summary, formatCurrency }) => (
  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
    <MetricCard
      title="Total Vendors"
      value={summary.total_vendors}
      icon={Building2}
      color="text-indigo-600"
    />
    <MetricCard
      title="Active Vendors"
      value={summary.active_vendors}
      subtitle="with transactions"
      icon={Users}
      color="text-green-600"
    />
    <MetricCard
      title="Total Spend"
      value={formatCurrency(summary.total_spend)}
      icon={DollarSign}
      color="text-blue-600"
    />
    <MetricCard
      title="Avg per Vendor"
      value={formatCurrency(summary.total_spend / (summary.active_vendors || 1))}
      icon={Receipt}
      color="text-purple-600"
    />
  </div>
);

export default VendorMetricsGrid;
