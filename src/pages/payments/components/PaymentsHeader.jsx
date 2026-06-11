import React from 'react';
import { Button } from '../../../components/ui/button';
import CurrencySelector from '../../../components/common/CurrencySelector';
import RefreshButton from '../../../components/common/RefreshButton';

// Page header with global payment actions.
const PaymentsHeader = ({
  invoicesCount,
  handleBulkRelease,
  canBulkRelease,
  paymentDialog,
  batchDialogTrigger,
  currencies = [],
  selectedCurrency,
  onCurrencyChange,
  onRefresh,
  refreshing = false,
}) => (
  <div className="flex flex-col gap-4 mb-8 lg:flex-row lg:items-center lg:justify-between">
    <div>
      <h1 className="text-4xl md:text-5xl font-bold font-['Manrope'] text-primary mb-2" data-testid="payments-title">
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
      {invoicesCount > 0 && canBulkRelease && (
        <Button
          variant="default"
          onClick={handleBulkRelease}
          data-testid="bulk-release-button"
          className="bg-accent hover:bg-accent/90"
        >
          Release All Payments ({invoicesCount})
        </Button>
      )}
      {batchDialogTrigger}
      {paymentDialog}
    </div>
  </div>
);

export default PaymentsHeader;
