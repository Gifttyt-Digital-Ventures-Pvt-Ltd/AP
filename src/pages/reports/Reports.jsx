import React from 'react';
import { Tabs, TabsContent } from '../../components/ui/tabs';
import ReportsHeader from './components/ReportsHeader';
import ReportsLoadingState from './components/ReportsLoadingState';
import ReportsTabsList from './components/ReportsTabsList';
import ExecutiveTab from './components/Executive/ExecutiveTab';
import ApTab from './components/Ap/ApTab';
import VendorTab from './components/Vendor/VendorTab';
import TaxTab from './components/Tax/TaxTab';
import PaymentTab from './components/Payment/PaymentTab';
import ExportsTab from './components/Exports/ExportsTab';
import { useReportsData } from './hooks/useReportsData';

const Reports = () => {
  const {
    activeTab,
    setActiveTab,
    dateRange,
    setDateRange,
    customDays,
    setCustomDays,
    currencies,
    selectedCurrency,
    setSelectedCurrency,
    formatCurrency,
    formatFullCurrency,
    loading,
    fetchAllData,
    executiveData,
    branchCostData,
    branchCostLoading,
    branchCostPeriod,
    setBranchCostPeriod,
    branchCostPage,
    setBranchCostPage,
    branchCostPagination,
    isBranchCostAnalysisEnabled,
    apData,
    vendorData,
    taxData,
    paymentData,
    canViewExecutiveReports,
    canViewApReports,
    canViewVendorReports,
    canViewTaxReports,
    canViewPaymentReports,
    canViewExportReports,
  } = useReportsData();

  if (loading && !executiveData) {
    return <ReportsLoadingState />;
  }

  const formatterProps = { formatCurrency, formatFullCurrency };

  return (
    // Bounded-height flex chain (mirrors Approvals.jsx / GST Overview / Invoice Matching) so
    // the Exports tab's table can scroll internally with a sticky header. Other tabs are
    // unaffected: their content just overflows this chain and the page falls back to its
    // normal whole-page scroll for them, same as before.
    <div className="flex h-full min-h-0 flex-col gap-6" data-testid="reports-page">
      <div className="shrink-0">
        <ReportsHeader
          dateRange={dateRange}
          setDateRange={setDateRange}
          customDays={customDays}
          setCustomDays={setCustomDays}
          fetchAllData={fetchAllData}
          loading={loading}
          currencies={currencies}
          selectedCurrency={selectedCurrency}
          onCurrencyChange={setSelectedCurrency}
          hideControls={activeTab === 'exports'}
        />
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex min-h-0 flex-1 flex-col gap-6">
        <ReportsTabsList
          canViewExecutiveReports={canViewExecutiveReports}
          canViewApReports={canViewApReports}
          canViewVendorReports={canViewVendorReports}
          canViewTaxReports={canViewTaxReports}
          canViewPaymentReports={canViewPaymentReports}
          canViewExportReports={canViewExportReports}
        />

        {canViewExecutiveReports && (
          <TabsContent value="executive" className="space-y-6">
            <ExecutiveTab
              executiveData={executiveData}
              branchCostData={branchCostData}
              branchCostLoading={branchCostLoading}
              branchCostPeriod={branchCostPeriod}
              onBranchCostPeriodChange={setBranchCostPeriod}
              branchCostPagination={branchCostPagination}
              onBranchCostPageChange={setBranchCostPage}
              showBranchCostAnalysis={isBranchCostAnalysisEnabled}
              {...formatterProps}
            />
          </TabsContent>
        )}

        {canViewApReports && (
          <TabsContent value="ap" className="space-y-6">
            <ApTab apData={apData} {...formatterProps} />
          </TabsContent>
        )}

        {canViewVendorReports && (
          <TabsContent value="vendor" className="space-y-6">
            <VendorTab vendorData={vendorData} {...formatterProps} />
          </TabsContent>
        )}

        {canViewTaxReports && (
          <TabsContent value="tax" className="space-y-6">
            <TaxTab taxData={taxData} {...formatterProps} />
          </TabsContent>
        )}

        {canViewPaymentReports && (
          <TabsContent value="payment" className="space-y-6">
            <PaymentTab paymentData={paymentData} {...formatterProps} />
          </TabsContent>
        )}

        {canViewExportReports && (
          <TabsContent value="exports" className="flex min-h-0 flex-1 flex-col">
            <ExportsTab currencies={currencies} />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
};

export default Reports;
