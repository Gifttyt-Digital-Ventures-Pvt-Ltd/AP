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
    apData,
    vendorData,
    taxData,
    paymentData,
    canViewExecutiveReports,
    canViewApReports,
    canViewVendorReports,
    canViewTaxReports,
    canViewPaymentReports,
  } = useReportsData();

  if (loading && !executiveData) {
    return <ReportsLoadingState />;
  }

  const formatterProps = { formatCurrency, formatFullCurrency };

  return (
    <div className="space-y-6" data-testid="reports-page">
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
      />

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <ReportsTabsList
          canViewExecutiveReports={canViewExecutiveReports}
          canViewApReports={canViewApReports}
          canViewVendorReports={canViewVendorReports}
          canViewTaxReports={canViewTaxReports}
          canViewPaymentReports={canViewPaymentReports}
        />

        {canViewExecutiveReports && (
          <TabsContent value="executive" className="space-y-6">
            <ExecutiveTab executiveData={executiveData} {...formatterProps} />
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
      </Tabs>
    </div>
  );
};

export default Reports;
