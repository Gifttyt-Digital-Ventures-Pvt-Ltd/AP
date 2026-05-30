import React from 'react';
import ExecutiveMetricsGrid from './ExecutiveMetricsGrid';
import SpendingTrendChart from './SpendingTrendChart';
import StatusDistributionChart from './StatusDistributionChart';
import TopVendorsChart from './TopVendorsChart';

const ExecutiveTab = ({ executiveData, formatCurrency, formatFullCurrency }) => {
  if (!executiveData) return null;

  return (
    <>
      <ExecutiveMetricsGrid keyMetrics={executiveData.key_metrics} formatCurrency={formatCurrency} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SpendingTrendChart
          monthlyTrend={executiveData.monthly_trend}
          formatCurrency={formatCurrency}
          formatFullCurrency={formatFullCurrency}
        />
        <StatusDistributionChart statusDistribution={executiveData.status_distribution} />
      </div>

      <TopVendorsChart
        topVendors={executiveData.top_vendors}
        formatCurrency={formatCurrency}
        formatFullCurrency={formatFullCurrency}
      />
    </>
  );
};

export default ExecutiveTab;
