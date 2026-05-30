import React from 'react';
import { Button } from '../../../components/ui/button';
import { RefreshCw } from 'lucide-react';
import CurrencySelector from '../../../components/common/CurrencySelector';

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
      <Button variant="outline" onClick={onRefresh} disabled={refreshing} data-testid="refresh-btn">
        <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
        Refresh
      </Button>
    </div>
  </div>
);

export default DashboardHeader;
