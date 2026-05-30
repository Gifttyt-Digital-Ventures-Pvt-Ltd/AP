import React from 'react';
import { DollarSign, FileText, CheckCircle, Clock, Receipt } from 'lucide-react';
import MetricCard from '../MetricCard';

const ExecutiveMetricsGrid = ({ keyMetrics, formatCurrency }) => (
  <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
    <MetricCard
      title="Total Spend"
      value={formatCurrency(keyMetrics.total_spend)}
      subtitle={`${keyMetrics.total_invoices} invoices`}
      icon={DollarSign}
      color="text-indigo-600"
    />
    <MetricCard
      title="Paid"
      value={formatCurrency(keyMetrics.paid_spend)}
      icon={CheckCircle}
      color="text-green-600"
    />
    <MetricCard
      title="Pending"
      value={formatCurrency(keyMetrics.pending_spend)}
      icon={Clock}
      color="text-yellow-600"
    />
    <MetricCard
      title="Avg Invoice"
      value={formatCurrency(keyMetrics.avg_invoice_value)}
      icon={Receipt}
      color="text-blue-600"
    />
    <MetricCard
      title="Invoices"
      value={keyMetrics.total_invoices}
      icon={FileText}
      color="text-purple-600"
    />
  </div>
);

export default ExecutiveMetricsGrid;
