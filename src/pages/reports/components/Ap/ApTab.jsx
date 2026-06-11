import React from 'react';
import ApMetricsGrid from './ApMetricsGrid';
import InvoiceAgingChart from './InvoiceAgingChart';
import InvoiceVolumeTrendChart from './InvoiceVolumeTrendChart';
import BottleneckAnalysisChart from './BottleneckAnalysisChart';

const ApTab = ({ apData, formatCurrency, formatFullCurrency }) => {
  if (!apData) return null;

  return (
    <>
      <ApMetricsGrid
        processingMetrics={apData.processing_metrics}
        bottleneckAnalysis={apData.bottleneck_analysis}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <InvoiceAgingChart
          agingReport={apData.aging_report}
          formatCurrency={formatCurrency}
          formatFullCurrency={formatFullCurrency}
        />
        <InvoiceVolumeTrendChart
          volumeTrend={apData.volume_trend}
          formatFullCurrency={formatFullCurrency}
        />
      </div>

      <BottleneckAnalysisChart
        bottleneckAnalysis={apData.bottleneck_analysis}
        formatFullCurrency={formatFullCurrency}
      />
    </>
  );
};

export default ApTab;
