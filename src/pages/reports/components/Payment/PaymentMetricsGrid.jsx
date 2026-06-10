import React from 'react';
import { CreditCard, DollarSign, CheckCircle, FileText } from 'lucide-react';
import MetricCard from '../MetricCard';

const PaymentMetricsGrid = ({ summary, batchMetrics, formatCurrency, formatFullCurrency }) => (
  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
    <MetricCard
      title="Total Payments"
      value={summary.total_payments}
      subtitle={formatFullCurrency(summary.total_amount)}
      icon={CreditCard}
      color="text-indigo-600"
    />
    <MetricCard
      title="Avg Payment"
      value={formatCurrency(summary.avg_payment)}
      icon={DollarSign}
      color="text-green-600"
    />
    <MetricCard
      title="Batch Success Rate"
      value={`${batchMetrics.success_rate}%`}
      subtitle={`${batchMetrics.successful_items}/${batchMetrics.total_items_processed} items`}
      icon={CheckCircle}
      color={batchMetrics.success_rate >= 80 ? 'text-green-600' : 'text-yellow-600'}
    />
    <MetricCard
      title="Batches Completed"
      value={batchMetrics.completed_batches}
      subtitle={`${batchMetrics.failed_batches} failed`}
      icon={FileText}
      color="text-blue-600"
    />
  </div>
);

export default PaymentMetricsGrid;
