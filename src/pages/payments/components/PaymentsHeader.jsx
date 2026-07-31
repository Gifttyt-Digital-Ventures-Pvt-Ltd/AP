import React from 'react';
import CurrencySelector from '../../../components/common/CurrencySelector';
import RefreshButton from '../../../components/common/RefreshButton';

// Page header with global payment actions.
const PaymentsHeader = ({
  currencies = [],
  selectedCurrency,
  onCurrencyChange,
  onRefresh,
  refreshing = false,
}) => (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
    <div>
      <h1 className="text-3xl md:text-4xl font-bold font-['Manrope'] text-primary mb-1" data-testid="payments-title">
        Payments
      </h1>
      <p className="text-muted-foreground">Track and release payments</p>
    </div>
    <div className="flex flex-wrap items-center gap-3">
      <CurrencySelector
        currencies={currencies}
        value={selectedCurrency}
        onChange={onCurrencyChange}
        variant="inline"
        id="payments-currency-filter"
      />
      <RefreshButton onClick={onRefresh} refreshing={refreshing}>
        Refresh
      </RefreshButton>
    </div>
  </div>
);

export default PaymentsHeader;
