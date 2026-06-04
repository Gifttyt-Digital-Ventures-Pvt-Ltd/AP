import React from 'react';
import { Button } from '../../../components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../components/ui/select';
import { Input } from '../../../components/ui/input';
import { Calendar } from 'lucide-react';
import CurrencySelector from '../../../components/common/CurrencySelector';
import RefreshButton from '../../../components/common/RefreshButton';

// Top controls for date window selection and data refresh.
const ReportsHeader = ({
  dateRange,
  setDateRange,
  customDays,
  setCustomDays,
  fetchAllData,
  loading,
  currencies = [],
  selectedCurrency,
  onCurrencyChange,
}) => (
  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
    <div>
      <h1 className="text-2xl font-bold">Reports & Analytics</h1>
      <p className="text-muted-foreground">Comprehensive insights into your accounts payable</p>
    </div>
    <div className="flex flex-wrap items-center gap-3">
      <CurrencySelector
        currencies={currencies}
        value={selectedCurrency}
        onChange={onCurrencyChange}
        variant="inline"
        id="reports-currency-filter"
      />
      <div className="flex items-center gap-2">
        <Calendar className="h-4 w-4 text-muted-foreground" />
        <Select value={dateRange} onValueChange={setDateRange}>
          <SelectTrigger className="h-10 w-[140px]" data-testid="date-range-select">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Last 7 days</SelectItem>
            <SelectItem value="30">Last 30 days</SelectItem>
            <SelectItem value="90">Last 90 days</SelectItem>
            <SelectItem value="custom">Custom</SelectItem>
          </SelectContent>
        </Select>
        {dateRange === 'custom' && (
          <Input
            type="number"
            placeholder="Days"
            className="h-10 w-20"
            value={customDays}
            onChange={(e) => setCustomDays(e.target.value)}
            data-testid="custom-days-input"
          />
        )}
      </div>
      <RefreshButton onClick={fetchAllData} refreshing={loading}>
        Refresh
      </RefreshButton>
    </div>
  </div>
);

export default ReportsHeader;
