import React, { useMemo } from 'react';
import { Button } from '../../../components/ui/button';
import { Checkbox } from '../../../components/ui/checkbox';
import AppDataTable from '../../../components/common/AppDataTable';
import { TableCell, TableRow } from '../../../components/ui/table';

const basePendingPaymentTableHeader = [
  { key: 'invoice_number', title: 'Invoice #', cellClassName: "font-['JetBrains_Mono'] font-medium" },
  { key: 'vendor_name', title: 'Vendor' },
  { key: 'amount', title: 'Amount', cellClassName: "font-['JetBrains_Mono'] font-semibold" },
  { key: 'invoice_date', title: 'Invoice Date', cellClassName: 'text-sm text-muted-foreground' },
  { key: 'due_date', title: 'Due Date', cellClassName: 'text-sm text-muted-foreground' },
  { key: 'status', title: 'Status' },
];

// Pending tab with summary card and pending invoice table.
const PendingPaymentsTab = ({
  invoices,
  filteredPendingInvoices,
  totalPendingAmount,
  handleBulkRelease,
  canBulkRelease = true,
  showRecordPaymentSelection = false,
  selectedInvoiceIds = [],
  onToggleInvoice,
  onSelectAllInvoices,
  onOpenRecordPayment,
  canRecordPayment = false,
  safeFormatDate,
}) => {
  const tableHeader = useMemo(
    () =>
      showRecordPaymentSelection
        ? [{ key: 'select', title: '', headerClassName: 'w-[48px]' }, ...basePendingPaymentTableHeader]
        : basePendingPaymentTableHeader,
    [showRecordPaymentSelection],
  );

  const selectedInvoices = invoices.filter((invoice) => selectedInvoiceIds.includes(invoice.id));
  const selectedTotal = selectedInvoices.reduce((sum, invoice) => sum + (invoice.amount || 0), 0);
  const allSelected = invoices.length > 0 && selectedInvoiceIds.length === invoices.length;

  const renderPendingPaymentRow = (invoice, rowIndex, headers) => (
    <TableRow
      key={invoice.id ?? rowIndex}
      data-testid={`pending-invoice-row-${invoice.id}`}
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
          case 'select':
            value = (
              <div onClick={(event) => event.stopPropagation()}>
                <Checkbox
                  checked={selectedInvoiceIds.includes(invoice.id)}
                  onCheckedChange={() => onToggleInvoice?.(invoice.id)}
                  data-testid={`pending-invoice-select-${invoice.id}`}
                />
              </div>
            );
            break;
          case 'amount':
            value = `₹${Number(invoice.amount || 0).toLocaleString('en-IN')}`;
            break;
          case 'invoice_date':
            value = safeFormatDate(invoice.invoice_date);
            break;
          case 'due_date':
            value = safeFormatDate(invoice.due_date);
            break;
          case 'status':
            value = (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border bg-blue-100 text-blue-800 border-blue-200">
                Pending Payment
              </span>
            );
            break;
          default:
            value = invoice?.[header.key] || '-';
        }

        return (
          <TableCell key={header.key} className={header.cellClassName}>
            {value}
          </TableCell>
        );
      })}
    </TableRow>
  );

  return (
    <>
      {invoices.length > 0 && (
        <div className="bg-accent/10 border border-accent/30 rounded-lg p-4 mb-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium">Total Pending Amount</p>
              <p className="text-2xl font-bold font-['JetBrains_Mono'] text-accent">
                {'\u20B9'}{totalPendingAmount.toLocaleString('en-IN')}
              </p>
              {showRecordPaymentSelection && selectedInvoiceIds.length > 0 && (
                <p className="mt-1 text-sm text-muted-foreground">
                  Selected {selectedInvoiceIds.length} invoice
                  {selectedInvoiceIds.length === 1 ? '' : 's'} ·{' '}
                  <span className="font-['JetBrains_Mono'] font-medium text-foreground">
                    {'\u20B9'}{selectedTotal.toLocaleString('en-IN')}
                  </span>
                </p>
              )}
            </div>

            {canBulkRelease && (
              <Button onClick={handleBulkRelease} size="lg" data-testid="pending-tab-bulk-release-button">
                Release All Payments
              </Button>
            )}

            {showRecordPaymentSelection && canRecordPayment && (
              <Button
                size="lg"
                onClick={onOpenRecordPayment}
                disabled={selectedInvoiceIds.length === 0}
                data-testid="open-record-payment-dialog"
              >
                Record Payment
              </Button>
            )}
          </div>

          {showRecordPaymentSelection && invoices.length > 0 && (
            <div className="mt-3 flex justify-end">
              <Button type="button" variant="outline" size="sm" onClick={onSelectAllInvoices}>
                {allSelected ? 'Deselect All' : 'Select All'}
              </Button>
            </div>
          )}
        </div>
      )}

      <div
        className="bg-card border border-border rounded-lg shadow-sm overflow-hidden"
        data-testid="pending-invoices-table"
      >
        <AppDataTable
          tableHeader={tableHeader}
          tableData={filteredPendingInvoices}
          renderRow={renderPendingPaymentRow}
          emptyMessage="No pending payments. All invoices need approval first."
          emptyTestId="no-pending-payments"
        />
      </div>
    </>
  );
};

export default PendingPaymentsTab;
