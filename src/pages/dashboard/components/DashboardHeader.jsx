import React from 'react';
import CurrencySelector from '../../../components/common/CurrencySelector';
import RefreshButton from '../../../components/common/RefreshButton';

const DashboardHeader = ({
  headerName,
  corporateName,
  onRefresh,
  refreshing,
  currencies,
  selectedCurrency,
  onCurrencyChange,
}) => (
  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
    <div>
      <h1 className="text-2xl md:text-3xl font-bold text-primary mb-1" data-testid="dashboard-title">
        Welcome back, {headerName}
      </h1>
      <p className="text-muted-foreground">
        {corporateName
          ? `${corporateName} · Here's what's happening with your accounts payable today`
          : "Here's what's happening with your accounts payable today"}
      </p>
    </div>
    <div className="flex flex-wrap items-center gap-3">
      <CurrencySelector
        currencies={currencies}
        value={selectedCurrency}
        onChange={onCurrencyChange}
        variant="inline"
        id="dashboard-currency-filter"
      />
      <RefreshButton onClick={onRefresh} refreshing={refreshing} data-testid="refresh-btn">
        Refresh
      </RefreshButton>
    </div>
  </div>
);

export default DashboardHeader;
