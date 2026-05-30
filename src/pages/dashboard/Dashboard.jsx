import React from 'react';
import { useDashboardData } from './hooks/useDashboardData';
import DashboardLoadingState from './components/DashboardLoadingState';
import DashboardHeader from './components/DashboardHeader';
import DashboardStatsGrid from './components/DashboardStatsGrid';
import PaymentProgressCard from './components/PaymentProgressCard';
import SpendingTrendChart from './components/SpendingTrendChart';
import InvoiceStatusDistributionChart from './components/InvoiceStatusDistributionChart';
import QuickActionsCard from './components/QuickActionsCard';
import ApprovalBottleneckCard from './components/ApprovalBottleneckCard';
import PaymentBatchesCard from './components/PaymentBatchesCard';
import RecentInvoicesCard from './components/RecentInvoicesCard';
import TopVendorsCard from './components/TopVendorsCard';
import PendingApprovalsAlert from './components/PendingApprovalsAlert';
import InvoiceStatusSummaryCard from './components/InvoiceStatusSummaryCard';
import PaymentSummaryCard from './components/PaymentSummaryCard';

const Dashboard = () => {
  const {
    stats,
    charts,
    bottleneck,
    recentInvoices,
    pendingApprovals,
    paymentBatchStats,
    showPaymentBatches,
    loading,
    refreshing,
    isError,
    fetchAllData,
    approvalRate,
    corporateName,
    headerName,
    pendingValue,
    paidValue,
    totalValue,
    paidPercentage,
    currencies,
    selectedCurrency,
    setSelectedCurrency,
    formatFullCurrency,
    formatCompactCurrency,
  } = useDashboardData();

  if (loading) {
    return <DashboardLoadingState />;
  }

  if (isError && !stats) {
    return (
      <div className="space-y-6" data-testid="dashboard-page">
        <DashboardHeader
          headerName={headerName}
          corporateName={corporateName}
          onRefresh={fetchAllData}
          refreshing={refreshing}
          currencies={currencies}
          selectedCurrency={selectedCurrency}
          onCurrencyChange={setSelectedCurrency}
        />
        <div className="flex min-h-[40vh] items-center justify-center rounded-xl border border-border bg-card/50">
          <p className="text-sm text-muted-foreground">
            Unable to load dashboard data. Please try again.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div data-testid="dashboard-page" className="space-y-6">
      <DashboardHeader
        headerName={headerName}
        corporateName={corporateName}
        onRefresh={fetchAllData}
        refreshing={refreshing}
        currencies={currencies}
        selectedCurrency={selectedCurrency}
        onCurrencyChange={setSelectedCurrency}
      />

      <DashboardStatsGrid
        stats={stats}
        approvalRate={approvalRate}
        totalValue={totalValue}
        formatCompactCurrency={formatCompactCurrency}
      />

      <PaymentProgressCard
        paidValue={paidValue}
        totalValue={totalValue}
        paidPercentage={paidPercentage}
        pendingValue={pendingValue}
        formatFullCurrency={formatFullCurrency}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SpendingTrendChart
          monthlyTrend={charts?.monthly_trend}
          formatCompactCurrency={formatCompactCurrency}
          formatFullCurrency={formatFullCurrency}
        />
        <InvoiceStatusDistributionChart statusDistribution={charts?.status_distribution} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <QuickActionsCard showPaymentBatches={showPaymentBatches} />
        <ApprovalBottleneckCard
          bottleneckAnalysis={bottleneck?.stages}
          avgProcessingDays={bottleneck?.avg_processing_days || 0}
        />
        {showPaymentBatches && (
          <PaymentBatchesCard
            paymentBatchStats={paymentBatchStats}
            formatCompactCurrency={formatCompactCurrency}
          />
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RecentInvoicesCard
          invoices={recentInvoices}
          formatFullCurrency={formatFullCurrency}
        />
        <TopVendorsCard
          vendors={charts?.top_vendors}
          formatFullCurrency={formatFullCurrency}
        />
      </div>

      <PendingApprovalsAlert
        pendingApprovals={pendingApprovals}
        formatFullCurrency={formatFullCurrency}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <InvoiceStatusSummaryCard stats={stats} />
        <PaymentSummaryCard stats={stats} formatFullCurrency={formatFullCurrency} />
      </div>
    </div>
  );
};

export default Dashboard;
