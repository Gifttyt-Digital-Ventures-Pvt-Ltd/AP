import React from 'react';
import { Clock, FileText, CreditCard } from 'lucide-react';
import MetricCard from '../MetricCard';

const ApMetricsGrid = ({ processingMetrics, bottleneckAnalysis = [] }) => (
  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
    <MetricCard
      title="Avg Processing Time"
      value={`${processingMetrics.avg_processing_days} days`}
      subtitle={`${processingMetrics.total_processed} invoices processed`}
      icon={Clock}
      color="text-blue-600"
    />
    {bottleneckAnalysis.map((stage, idx) => (
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
);

export default ApMetricsGrid;
