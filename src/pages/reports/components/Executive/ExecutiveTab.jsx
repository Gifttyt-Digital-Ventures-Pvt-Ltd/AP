import React from "react";
import ExecutiveMetricsGrid from "./ExecutiveMetricsGrid";
import SpendingTrendChart from "./SpendingTrendChart";
import StatusDistributionChart from "./StatusDistributionChart";
import BranchCostAnalysisCard from "./BranchCostAnalysisCard";
import TopVendorsChart from "./TopVendorsChart";

const ExecutiveTab = ({
  executiveData,
  branchCostData,
  branchCostLoading = false,
  branchCostPeriod,
  onBranchCostPeriodChange,
  branchCostPagination,
  onBranchCostPageChange,
  showBranchCostAnalysis = false,
  formatCurrency,
  formatFullCurrency,
}) => {
  if (!executiveData) return null;

  return (
    <>
      <ExecutiveMetricsGrid
        keyMetrics={executiveData.key_metrics}
        formatCurrency={formatCurrency}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SpendingTrendChart
          monthlyTrend={executiveData.monthly_trend}
          formatCurrency={formatCurrency}
          formatFullCurrency={formatFullCurrency}
        />
        <StatusDistributionChart
          statusDistribution={executiveData.status_distribution}
        />
      </div>

      {showBranchCostAnalysis ? (
        <BranchCostAnalysisCard
          branchCostData={branchCostData}
          isLoading={branchCostLoading}
          formatFullCurrency={formatFullCurrency}
          period={branchCostPeriod}
          onPeriodChange={onBranchCostPeriodChange}
          pagination={branchCostPagination}
          onPageChange={onBranchCostPageChange}
        />
      ) : null}

      {/* <TopVendorsChart
        topVendors={executiveData.top_vendors}
        formatCurrency={formatCurrency}
        formatFullCurrency={formatFullCurrency}
      /> */}
    </>
  );
};

export default ExecutiveTab;
