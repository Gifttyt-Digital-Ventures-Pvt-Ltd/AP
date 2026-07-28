import React, { useMemo } from 'react';
import InvoiceDueDateCell from '../../invoices/components/InvoiceDueDateCell';
import { Ban, Download, Eye, FileSpreadsheet } from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { Checkbox } from '../../../components/ui/checkbox';
import AppDataTable from '../../../components/common/AppDataTable';
import { TableCell, TableRow } from '../../../components/ui/table';
import IntegrationSourceBadge from '../../../components/integrations/IntegrationSourceBadge';
import useZohoIntegrationActive from '../../../hooks/useZohoIntegrationActive';
import { formatCurrency } from '../../../utils/currency';
import { withIntegrationTableHeader } from '../../../utils/integrationProvenance';
import {
  formatInvoiceAmount,
  sumInvoiceAmountsByCurrency,
} from '../../invoices/utils/invoiceAmounts';
import { OrgBranchCell, VendorWithBranchCell } from '../../../components/common/BranchTableCells';
import { cn } from '../../../lib/utils';

const renderCurrencyTotals = (totals, className) => {
  if (totals.length === 0) {
    return <p className={className}>{formatCurrency(0)}</p>;
  }

  if (totals.length === 1) {
    return (
      <p className={className}>
        {formatCurrency(totals[0].total, totals[0].currency)}
      </p>
    );
  }

  return (
    <div className="space-y-1">
      {totals.map(({ currency, total }) => (
        <p key={currency} className={className}>
          {formatCurrency(total, currency)}
        </p>
      ))}
    </div>
  );
};

const basePendingPaymentTableHeader = [
  { key: 'invoiceNumber', title: 'Invoice #', headerClassName: 'bg-muted text-foreground', cellClassName: "  font-medium" },
  { key: 'orgBranch', title: 'Branch', headerClassName: 'bg-muted text-foreground', cellClassName: 'text-sm' },
  { key: 'vendorName', title: 'Vendor', headerClassName: 'bg-muted text-foreground' },
  { key: 'amount', title: 'Amount', headerClassName: 'bg-muted text-foreground', cellClassName: "  font-semibold" },
  { key: 'invoiceDate', title: 'Invoice Date', headerClassName: 'bg-muted text-foreground', cellClassName: 'text-sm text-muted-foreground' },
  { key: 'dueDate', title: 'Due Date', headerClassName: 'bg-muted text-foreground', cellClassName: 'text-sm text-muted-foreground' },
  { key: 'status', title: 'Status', headerClassName: 'bg-muted text-foreground' },
  { key: 'actions', title: 'Actions', headerClassName: 'bg-muted text-foreground text-left', cellClassName: 'text-left' },
];

// Pending tab with summary card and pending invoice table.
const PendingPaymentsTab = ({
  invoices,
  filteredPendingInvoices,
  handleBulkRelease,
  canBulkRelease = true,
  showRecordPaymentSelection = false,
  selectedInvoiceIds = [],
  onToggleInvoice,
  onSelectAllInvoices,
  onOpenRecordPayment,
  onOpenInvoiceReport,
  canRecordPayment = false,
  canDownloadInvoiceReport = false,
  safeFormatDate,
  handleViewInvoice,
  handleDownloadInvoice,
  canCancelInvoice,
  handleCancelInvoice,
  showBranchField = false,
}) => {
  const { showIntegrationColumn } = useZohoIntegrationActive();
  const pendingPaymentTableHeader = useMemo(() => {
    const headers = showBranchField
      ? basePendingPaymentTableHeader
      : basePendingPaymentTableHeader.filter((header) => header.key !== 'orgBranch');
    return withIntegrationTableHeader(headers, showIntegrationColumn).map((column) =>
      column.key === 'integration'
        ? { ...column, headerClassName: 'bg-muted text-foreground text-left' }
        : column,
    );
  }, [showBranchField, showIntegrationColumn]);
  const selectedInvoices = invoices.filter((invoice) => selectedInvoiceIds.includes(invoice.id));
  const totalPendingByCurrency = useMemo(
    () => sumInvoiceAmountsByCurrency(invoices),
    [invoices],
  );
  const selectedTotalByCurrency = useMemo(
    () => sumInvoiceAmountsByCurrency(selectedInvoices),
    [selectedInvoices],
  );
  const allSelected = invoices.length > 0 && selectedInvoiceIds.length === invoices.length;

  const renderPendingPaymentRow = (invoice, rowIndex, headers) => (
    <TableRow
      key={invoice.id ?? rowIndex}
      data-testid={`pending-invoice-row-${invoice?.id ?? 'unknown'}`}
      className={
        showRecordPaymentSelection && selectedInvoiceIds.includes(invoice.id) ? 'bg-primary/10' : ''
      }
      onClick={
        showRecordPaymentSelection ? () => onToggleInvoice?.(invoice.id) : undefined
      }
    >
      {headers.map((header) => {
        let value;

        switch (header.key) {
          case 'invoiceNumber':
            value = showRecordPaymentSelection ? (
              <div className="flex items-center gap-2">
                <div onClick={(event) => event.stopPropagation()}>
                  <Checkbox
                    checked={selectedInvoiceIds.includes(invoice.id)}
                    onCheckedChange={() => onToggleInvoice?.(invoice.id)}
                    data-testid={`pending-invoice-select-${invoice?.id ?? 'unknown'}`}
                  />
                </div>
                <span>{invoice.invoiceNumber || '-'}</span>
              </div>
            ) : (
              invoice.invoiceNumber || '-'
            );
            break;
          case 'vendorName':
            value = <VendorWithBranchCell record={invoice} />;
            break;
          case 'orgBranch':
            value = <OrgBranchCell record={invoice} />;
            break;
          case 'amount':
            value = formatInvoiceAmount(invoice, invoice.amount || 0);
            break;
          case 'invoiceDate':
            value = safeFormatDate(invoice.invoiceDate);
            break;
          case 'dueDate':
            value = (
              <InvoiceDueDateCell
                invoice={invoice}
                formattedDueDate={safeFormatDate(invoice.dueDate)}
              />
            );
            break;
          case 'status':
            value = (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border bg-blue-100 text-blue-800 border-blue-200">
                Pending Payment
              </span>
            );
            break;
          case 'integration':
            value = <IntegrationSourceBadge record={invoice} />;
            break;
          case 'actions':
            value = (
              <div
                className="flex justify-start gap-1"
                onClick={(event) => event.stopPropagation()}
              >
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleViewInvoice?.(invoice)}
                  data-testid={`view-pending-invoice-${invoice?.id ?? 'unknown'}`}
                  title="View Invoice"
                  className="h-8 w-8 p-0"
                >
                  <Eye className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDownloadInvoice?.(invoice)}
                  data-testid={`download-pending-invoice-${invoice?.id ?? 'unknown'}`}
                  title="Download Invoice"
                  className="h-8 w-8 p-0"
                >
                  <Download className="h-4 w-4" />
                </Button>
                {canCancelInvoice?.(invoice) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleCancelInvoice?.(invoice)}
                    data-testid={`cancel-pending-invoice-${invoice?.id ?? 'unknown'}`}
                    title="Cancel Invoice"
                    className="h-8 w-8 p-0"
                  >
                    <Ban className="h-4 w-4 text-destructive" />
                  </Button>
                )}
              </div>
            );
            break;
          default:
            value = invoice?.[header.key] || '-';
        }

        return (
          <TableCell
            key={header.key}
            className={cn('border border-table-border', header.cellClassName)}
          >
            {value}
          </TableCell>
        );
      })}
    </TableRow>
  );

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      {invoices.length > 0 && (
        <div className="shrink-0 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-accent/30 bg-accent/10 px-3 py-2">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <span className="text-xs font-medium text-muted-foreground">Total Pending</span>
            {renderCurrencyTotals(totalPendingByCurrency, 'text-lg font-bold text-primary')}
            {showRecordPaymentSelection && selectedInvoiceIds.length > 0 && (
              <span className="text-xs text-muted-foreground">
                · {selectedInvoiceIds.length} selected
                {selectedTotalByCurrency.length === 1 ? (
                  <>
                    {' '}
                    ({formatCurrency(
                      selectedTotalByCurrency[0].total,
                      selectedTotalByCurrency[0].currency,
                    )})
                  </>
                ) : null}
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {canDownloadInvoiceReport && (
              <Button
                variant="outline"
                size="sm"
                onClick={onOpenInvoiceReport}
                data-testid="open-pending-payment-report-dialog"
              >
                <FileSpreadsheet className="mr-2 h-4 w-4" />
                Download report
              </Button>
            )}

            {canBulkRelease && (
              <Button onClick={handleBulkRelease} size="sm" data-testid="pending-tab-bulk-release-button">
                Release All Payments
              </Button>
            )}

            {showRecordPaymentSelection && canRecordPayment && (
              <Button
                size="sm"
                onClick={onOpenRecordPayment}
                disabled={selectedInvoiceIds.length === 0}
                data-testid="open-record-payment-dialog"
              >
                Record Payment
              </Button>
            )}
          </div>
        </div>
      )}

      <div
        className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-border bg-card shadow-sm"
        data-testid="pending-invoices-table"
      >
        <div className="min-h-0 flex-1 overflow-x-auto overflow-y-auto scrollbar-thin-muted">
          <AppDataTable
            tableHeader={pendingPaymentTableHeader}
            tableData={filteredPendingInvoices}
            renderRow={renderPendingPaymentRow}
            showCheckbox={showRecordPaymentSelection}
            isChecked={allSelected}
            onSelectAllChange={onSelectAllInvoices}
            tableClassName="min-w-[1100px]"
            tableContainerClassName="overflow-visible"
            headClassName="border-b border-border bg-muted shadow-sm"
            stickyHeader
            bordered
            emptyMessage="No pending payments. All invoices need approval first."
            emptyTestId="no-pending-payments"
          />
        </div>
        <div className="mt-auto flex shrink-0 border-t border-border p-4">
          <p className="text-sm text-muted-foreground" data-testid="pending-payments-table-summary">
            {filteredPendingInvoices.length === invoices.length
              ? `Showing ${filteredPendingInvoices.length.toLocaleString('en-IN')} pending invoice${filteredPendingInvoices.length === 1 ? '' : 's'}`
              : `Showing ${filteredPendingInvoices.length.toLocaleString('en-IN')} of ${invoices.length.toLocaleString('en-IN')} pending invoices`}
          </p>
        </div>
      </div>
    </div>
  );
};

export default PendingPaymentsTab;
