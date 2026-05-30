import React from 'react';
import PaymentMetricsGrid from './PaymentMetricsGrid';
import PaymentMethodsChart from './PaymentMethodsChart';
import CashFlowProjectionChart from './CashFlowProjectionChart';
import PaymentVolumeTrendChart from './PaymentVolumeTrendChart';

const PaymentTab = ({ paymentData, formatCurrency, formatFullCurrency }) => {
  if (!paymentData) return null;

  return (
    <>
      <PaymentMetricsGrid
        summary={paymentData.summary}
        batchMetrics={paymentData.batch_metrics}
        formatCurrency={formatCurrency}
        formatFullCurrency={formatFullCurrency}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <PaymentMethodsChart
          paymentMethods={paymentData.payment_methods}
          formatFullCurrency={formatFullCurrency}
        />
        <CashFlowProjectionChart
          cashFlowProjection={paymentData.cash_flow_projection}
          formatCurrency={formatCurrency}
          formatFullCurrency={formatFullCurrency}
        />
      </div>

      <PaymentVolumeTrendChart
        paymentTrend={paymentData.payment_trend}
        formatCurrency={formatCurrency}
        formatFullCurrency={formatFullCurrency}
      />
    </>
  );
};

export default PaymentTab;
