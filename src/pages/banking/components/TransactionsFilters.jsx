import React from 'react';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { ChevronDown, Search } from 'lucide-react';

// Toolbar with date range filter toggle and transaction search.
const TransactionsFilters = ({
  showDateFilter,
  setShowDateFilter,
  dateFrom,
  setDateFrom,
  dateTo,
  setDateTo,
  searchTerm,
  setSearchTerm,
}) => (
  <>
    <div className="flex items-center justify-between mb-6">
      <h2 className="text-2xl font-semibold font-['Manrope']">Recent Transactions</h2>
      <Button variant="outline" size="sm" onClick={() => setShowDateFilter(!showDateFilter)}>
        Select a Date
        <ChevronDown
          className={`h-4 w-4 ml-2 transition-transform duration-200 ${showDateFilter ? 'rotate-180' : 'rotate-0'}`}
        />
      </Button>
    </div>

    {showDateFilter && (
      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div>
          <label className="text-xs text-muted-foreground">From</label>
          <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="h-9" />
        </div>
        <div>
          <label className="text-xs text-muted-foreground">To</label>
          <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="h-9" />
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setDateFrom('');
            setDateTo('');
          }}
        >
          Clear
        </Button>
      </div>
    )}

    <div className="mb-6">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search Transactions By invoice, ref.no and vendor"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
          data-testid="transaction-search-input"
        />
      </div>
    </div>
  </>
);

export default TransactionsFilters;
