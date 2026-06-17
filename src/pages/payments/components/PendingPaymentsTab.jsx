import React, { useMemo } from 'react';
import { Download, Eye } from 'lucide-react';
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
  { key: 'invoiceNumber', title: 'Invoice #', cellClassName: "  font-medium" },
  { key: 'vendorName', title: 'Vendor' },
  { key: 'amount', title: 'Amount', cellClassName: "  font-semibold" },
  { key: 'invoiceDate', title: 'Invoice Date', cellClassName: 'text-sm text-muted-foreground' },
  { key: 'dueDate', title: 'Due Date', cellClassName: 'text-sm text-muted-foreground' },
  { key: 'status', title: 'Status' },
  { key: 'actions', title: 'Actions', headerClassName: 'text-left', cellClassName: 'text-left' },
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
  canRecordPayment = false,
  safeFormatDate,
  handleViewInvoice,
  handleDownloadInvoice,
}) => {
  const { showIntegrationColumn } = useZohoIntegrationActive();
  const pendingPaymentTableHeader = useMemo(
    () => withIntegrationTableHeader(basePendingPaymentTableHeader, showIntegrationColumn),
    [showIntegrationColumn],
  );
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
          case 'invoiceNumber':
            value = showRecordPaymentSelection ? (
              <div className="flex items-center gap-2">
                <div onClick={(event) => event.stopPropagation()}>
                  <Checkbox
                    checked={selectedInvoiceIds.includes(invoice.id)}
                    onCheckedChange={() => onToggleInvoice?.(invoice.id)}
                    data-testid={`pending-invoice-select-${invoice.id}`}
                  />
                </div>
                <span>{invoice.invoiceNumber || '-'}</span>
              </div>
            ) : (
              invoice.invoiceNumber || '-'
            );
            break;
          case 'amount':
            value = formatInvoiceAmount(invoice, invoice.amount || 0);
            break;
          case 'invoiceDate':
            value = safeFormatDate(invoice.invoiceDate);
            break;
          case 'dueDate':
            value = safeFormatDate(invoice.dueDate);
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
                  data-testid={`view-pending-invoice-${invoice.id}`}
                  title="View Invoice"
                  className="h-8 w-8 p-0"
                >
                  <Eye className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDownloadInvoice?.(invoice)}
                  data-testid={`download-pending-invoice-${invoice.id}`}
                  title="Download Invoice"
                  className="h-8 w-8 p-0"
                >
                  <Download className="h-4 w-4" />
                </Button>
              </div>
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
              {renderCurrencyTotals(
                totalPendingByCurrency,
                "text-2xl font-bold   text-primary",
              )}
              {showRecordPaymentSelection && selectedInvoiceIds.length > 0 && (
                <div className="mt-1 text-sm text-muted-foreground">
                  Selected {selectedInvoiceIds.length} invoice
                  {selectedInvoiceIds.length === 1 ? '' : 's'}
                  {selectedTotalByCurrency.length === 1 ? (
                    <>
                      {' '}
                      ·{' '}
                      <span className="  font-medium text-foreground">
                        {formatCurrency(
                          selectedTotalByCurrency[0].total,
                          selectedTotalByCurrency[0].currency,
                        )}
                      </span>
                    </>
                  ) : (
                    <div className="mt-1 space-y-0.5   font-medium text-foreground">
                      {selectedTotalByCurrency.map(({ currency, total }) => (
                        <p key={currency}>{formatCurrency(total, currency)}</p>
                      ))}
                    </div>
                  )}
                </div>
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
        </div>
      )}

      <div
        className="bg-card border border-border rounded-lg shadow-sm overflow-hidden"
        data-testid="pending-invoices-table"
      >
        <AppDataTable
          tableHeader={pendingPaymentTableHeader}
          tableData={filteredPendingInvoices}
          renderRow={renderPendingPaymentRow}
          showCheckbox={showRecordPaymentSelection}
          isChecked={allSelected}
          onSelectAllChange={onSelectAllInvoices}
          emptyMessage="No pending payments. All invoices need approval first."
          emptyTestId="no-pending-payments"
        />
      </div>
    </>
  );
};

export default PendingPaymentsTab;
