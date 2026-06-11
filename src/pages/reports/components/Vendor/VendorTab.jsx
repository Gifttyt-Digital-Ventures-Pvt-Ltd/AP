import React from 'react';
import VendorMetricsGrid from './VendorMetricsGrid';
import SpendByCategoryChart from './SpendByCategoryChart';
import TopVendorsList from './TopVendorsList';
import VendorSpendComparisonChart from './VendorSpendComparisonChart';

const VendorTab = ({ vendorData, formatCurrency, formatFullCurrency }) => {
  if (!vendorData) return null;

  return (
    <>
      <VendorMetricsGrid summary={vendorData.summary} formatCurrency={formatCurrency} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SpendByCategoryChart
          categoryDistribution={vendorData.category_distribution}
          formatFullCurrency={formatFullCurrency}
        />
        <TopVendorsList
          vendorBreakdown={vendorData.vendor_breakdown}
          formatFullCurrency={formatFullCurrency}
        />
      </div>

      <VendorSpendComparisonChart
        vendorBreakdown={vendorData.vendor_breakdown}
        formatCurrency={formatCurrency}
        formatFullCurrency={formatFullCurrency}
      />
    </>
  );
};

export default VendorTab;
