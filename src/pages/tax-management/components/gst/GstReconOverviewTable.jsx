import React from 'react';
import AppDataTable from '../../../../components/common/AppDataTable';
import { Button } from '../../../../components/ui/button';
import { TableCell, TableRow } from '../../../../components/ui/table';
import { formatCurrency, formatDate } from '../../utils/taxFormatting';
import { cn } from '../../../../lib/utils';
import {
  GstReconDifferBadge,
  GstReconStatusChip,
  GstPortalSourceTag,
  getReconRowClassName,
  isPortalOnlyRow,
} from './gstReconTableHelpers';

// FE §2.2 — the 8 Overview table columns, in spec order.
const gstOverviewTableHeader = [
  { key: 'sNo', title: 'S.No.' },
  { key: 'invoiceNo', title: 'Invoice Number', cellClassName: 'font-medium' },
  { key: 'vendorName', title: 'Vendor Name', cellClassName: 'max-w-[200px] truncate' },
  { key: 'invoiceDate', title: 'Invoice Date' },
  { key: 'invoiceAmount', title: 'Invoice Amount' },
  { key: 'gstAmount', title: 'GST Amount' },
  { key: 'status', title: 'Reconciliation Status' },
  { key: 'view', title: 'Actions' },
];

/**
 * GST Overview table (FE §2.2), built on the shared `AppDataTable` (same component/API
 * AllInvoicesTable.jsx uses) instead of a hand-rolled Table.
 *
 * Structure mirrors Approvals > All: a bounded-height card whose row body scrolls internally
 * with a sticky header, and a pagination footer docked at the bottom (outside the scrolling
 * area) rather than scrolling away with the rows. `tableContainerClassName="overflow-visible"`
 * neutralizes AppDataTable's own default `overflow-auto` wrapper, which would otherwise
 * intercept `position: sticky` before it reaches this component's own scroll div (verified
 * empirically). `headClassName` adds sticky positioning on the `<th>` cells themselves
 * (alongside AppDataTable's own thead-level sticky) for reliable cross-browser stickiness.
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
}) => {
  const renderRow = (row, index, headers) => (
    <TableRow key={row.id ?? index} className={getReconRowClassName(row)}>
      {headers.map((header) => {
        let value;

        switch (header.key) {
          case 'sNo':
            value = row.sNo;
            break;
          case 'invoiceNo':
            value = (
              <span className="inline-flex items-center">
                {row.invoiceNo || '-'}
                {isPortalOnlyRow(row) ? <GstPortalSourceTag /> : null}
              </span>
            );
            break;
          case 'vendorName':
            value = row.vendorName || '-';
            break;
          case 'invoiceDate':
            value = formatDate(row.invoiceDate);
            break;
          case 'invoiceAmount':
            value = formatCurrency(row.invoiceAmount);
            break;
          case 'gstAmount':
            value = formatCurrency(row.gstAmount);
            break;
          case 'status':
            value = (
              <span className="inline-flex items-center">
                <GstReconStatusChip status={row.status} />
                <GstReconDifferBadge differBadge={row.differBadge} statusSource={row.statusSource} />
              </span>
            );
            break;
          case 'view':
            value = (
              <Button type="button" variant="outline" size="sm" onClick={() => onView?.(row)}>
                View
              </Button>
            );
            break;
          default:
            value = row?.[header.key] ?? '-';
        }

        return (
          <TableCell
            key={header.key}
            className={cn('border border-border', header.cellClassName)}
          >
            {value}
          </TableCell>
        );
      })}
    </TableRow>
  );

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-lg border border-border bg-card shadow-sm">
      <div className="min-h-0 flex-1 overflow-x-auto overflow-y-auto scrollbar-thin-muted">
        <AppDataTable
          tableHeader={gstOverviewTableHeader}
          tableData={rows}
          renderRow={renderRow}
          rowKey="id"
          emptyMessage={emptyMessage}
          tableContainerClassName="overflow-visible"
          headClassName="[&_th]:sticky [&_th]:top-0 [&_th]:z-10"
          bordered
        />
      </div>

      <div className="mt-auto flex shrink-0 items-center justify-between border-t px-4 py-3 text-xs text-muted-foreground">
        <span>
          Page {page} of {totalPages}
        </span>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={loading || page <= 1}
            onClick={onPreviousPage}
          >
            Previous
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={loading || page >= totalPages}
            onClick={onNextPage}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
};

export default GstReconOverviewTable;
