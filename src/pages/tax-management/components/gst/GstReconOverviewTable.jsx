import React from 'react';
import { Button } from '../../../../components/ui/button';
import { TaxCompactTable, TaxPagination } from '../TaxUi';
import { formatCurrency, formatDate } from '../../utils/taxFormatting';
import {
  GstReconDifferBadge,
  GstReconStatusChip,
  GstPortalSourceTag,
  getReconRowClassName,
  isPortalOnlyRow,
} from './gstReconTableHelpers';

// FE §2.2 — the 8 Overview table columns, in spec order.
// `onView` is a plain callback prop; no navigation/routing decision is made here (deferred).
const buildColumns = (onView) => [
  {
    key: 'sNo',
    title: 'S.No.',
    render: (row) => row.sNo,
  },
  {
    key: 'invoiceNo',
    title: 'Invoice Number',
    cellClassName: 'font-medium',
    render: (row) => (
      <span className="inline-flex items-center">
        {row.invoiceNo || '-'}
        {isPortalOnlyRow(row) ? <GstPortalSourceTag /> : null}
      </span>
    ),
  },
  {
    key: 'vendorName',
    title: 'Vendor Name',
    render: (row) => row.vendorName || '-',
  },
  {
    key: 'invoiceDate',
    title: 'Invoice Date',
    render: (row) => formatDate(row.invoiceDate),
  },
  {
    key: 'invoiceAmount',
    title: 'Invoice Amount',
    render: (row) => formatCurrency(row.invoiceAmount),
  },
  {
    key: 'gstAmount',
    title: 'GST Amount',
    render: (row) => formatCurrency(row.gstAmount),
  },
  {
    key: 'status',
    title: 'Reconciliation Status',
    render: (row) => (
      <span className="inline-flex items-center">
        <GstReconStatusChip status={row.status} />
        <GstReconDifferBadge differBadge={row.differBadge} statusSource={row.statusSource} />
      </span>
    ),
  },
  {
    key: 'view',
    title: 'Actions',
    render: (row) => (
      <Button type="button" variant="outline" size="sm" onClick={() => onView?.(row)}>
        View
      </Button>
    ),
  },
];

/**
 * GST Overview table (FE §2.2). Purely presentational — all data and callbacks arrive via props,
 * no API calls, no hooks, no internal state.
 */
const GstReconOverviewTable = ({
  rows = [],
  page = 1,
  totalPages = 1,
  loading = false,
  onPreviousPage,
  onNextPage,
  onView,
  emptyMessage = 'No invoices found for the selected filters.',
}) => (
  <>
    <TaxCompactTable
      columns={buildColumns(onView)}
      rows={rows}
      getRowKey={(row) => row.id}
      getRowClassName={(row) => getReconRowClassName(row)}
      emptyMessage={emptyMessage}
    />
    <TaxPagination
      page={page}
      totalPages={totalPages}
      loading={loading}
      onPrevious={onPreviousPage}
      onNext={onNextPage}
    />
  </>
);

export default GstReconOverviewTable;
