import React from 'react';
import { TaxFilterBar, TaxSearchInput, TaxSelect } from '../TaxUi';
import RefreshButton from '../../../../components/common/RefreshButton';
import {
  GST_RECON_OVERVIEW_DATE_FILTERS,
  GST_RECON_OVERVIEW_SOURCE_OPTIONS,
} from '../../data/taxStaticData';

// FE §2.1 status filter options — explicitly excludes MATCHED_MANUAL, unlike the
// 6-value chip config in gstReconTableHelpers.jsx (which is for chip rendering, not this filter).
const GST_RECON_STATUS_FILTER_OPTIONS = [
  { value: 'ALL', label: 'All' },
  { value: 'MATCHED', label: 'Matched' },
  { value: 'MISMATCH', label: 'Mismatch' },
  { value: 'NO_INVOICE_FOUND', label: 'No Invoice Found' },
  { value: 'NOT_IN_GST', label: 'Not in GST' },
  { value: 'NOT_RECONCILED', label: 'Not Reconciled' },
];

/**
 * GST Overview filter bar (FE §2.1) — presentational only.
 * Controlled by parent-supplied value/on-change props; no API or state wiring here.
 */
const GstReconFilterBar = ({
  dateFilter,
  onDateFilterChange,
  source,
  onSourceChange,
  statusFilter,
  onStatusFilterChange,
  search,
  onSearchChange,
  onRefresh,
  refreshing = false,
}) => (
  <TaxFilterBar className="items-end md:grid-cols-5">
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-muted-foreground">Date Filter</label>
      <TaxSelect
        value={dateFilter}
        onValueChange={onDateFilterChange}
        options={GST_RECON_OVERVIEW_DATE_FILTERS}
      />
    </div>

    <div className="space-y-1.5">
      <label className="text-xs font-medium text-muted-foreground">Source</label>
      <TaxSelect
        value={source}
        onValueChange={onSourceChange}
        options={GST_RECON_OVERVIEW_SOURCE_OPTIONS}
      />
    </div>

    <div className="space-y-1.5">
      <label className="text-xs font-medium text-muted-foreground">Status</label>
      <TaxSelect
        value={statusFilter}
        onValueChange={onStatusFilterChange}
        options={GST_RECON_STATUS_FILTER_OPTIONS}
      />
    </div>

    <div className="space-y-1.5">
      <label className="text-xs font-medium text-muted-foreground">Search</label>
      <TaxSearchInput
        value={search}
        onChange={onSearchChange}
        placeholder="Invoice no. / vendor"
      />
    </div>

    <div className="flex items-end">
      <RefreshButton onClick={onRefresh} refreshing={refreshing} className="w-full" />
    </div>
  </TaxFilterBar>
);

export default GstReconFilterBar;
