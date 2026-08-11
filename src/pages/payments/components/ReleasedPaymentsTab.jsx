import React, { useMemo } from 'react';
import { Download, Eye } from 'lucide-react';
import { Button } from '../../../components/ui/button';
import AppDataTable from '../../../components/common/AppDataTable';
import { TableCell, TableRow } from '../../../components/ui/table';
import IntegrationSourceBadge from '../../../components/integrations/IntegrationSourceBadge';
import useZohoIntegrationActive from '../../../hooks/useZohoIntegrationActive';
import { formatCurrency } from '../../../utils/currency';
import { withIntegrationTableHeader } from '../../../utils/integrationProvenance';
import { formatInvoiceAmount } from '../../invoices/utils/invoiceAmounts';
import { cn } from '../../../lib/utils';
import { getPayableDisplayLabel } from '../utils/payableRows';

const clippedText = (value) => {
  const text = String(value || '-');
  return (
    <span className="block min-w-0 truncate" title={text}>
      {text}
    </span>
  );
};

const getBranchLabel = (record = {}) => {
  const name = record.branchName ?? record.branch_name ?? '';
  const code = record.branchCode ?? record.branch_code ?? '';
  if (name && code) return `${name} (${code})`;
  return name || code || '-';
};

const getVendorLabel = (record = {}, fallbackVendorName) => {
  const name = fallbackVendorName ?? record.vendorName ?? record.vendor_name ?? '-';
  const branchName = record.vendorBranchName ?? record.vendor_branch_name ?? '';
  const branchCode = record.vendorBranchCode ?? record.vendor_branch_code ?? '';
  const branch = branchName && branchCode ? `${branchName} (${branchCode})` : branchName || branchCode;
  return branch ? `${name} - ${branch}` : name;
};

const baseReleasedPaymentTableHeader = [
  { key: 'invoiceNumber', title: 'Invoice #', headerClassName: 'bg-muted text-foreground text-left', cellClassName: 'font-medium text-left' },
  { key: 'batchId', title: 'Batch', headerClassName: 'bg-muted text-foreground text-left', cellClassName: 'font-medium text-left' },
  { key: 'orgBranch', title: 'Branch', headerClassName: 'bg-muted text-foreground text-left', cellClassName: 'text-sm text-left' },
  { key: 'vendorName', title: 'Vendor', headerClassName: 'bg-muted text-foreground text-left' },
  { key: 'amount', title: 'Amount', headerClassName: 'bg-muted text-foreground text-left', cellClassName: 'font-semibold text-left' },
  { key: 'paymentDate', title: 'Payment Date', headerClassName: 'bg-muted text-foreground text-left', cellClassName: 'text-sm text-muted-foreground text-left' },
  { key: 'payment_method', title: 'Method', headerClassName: 'bg-muted text-foreground text-left', cellClassName: 'text-sm text-left' },
  { key: 'reference_number', title: 'Reference', headerClassName: 'bg-muted text-foreground text-left', cellClassName: 'text-sm text-left' },
  { key: 'actions', title: 'Actions', headerClassName: 'bg-muted text-foreground text-left', cellClassName: 'text-left' },
];

// Released tab table for completed payment records.
const ReleasedPaymentsTab = ({
  filteredPayments,
  totalPayments = 0,
  safeFormatDate,
  resolvePaymentInvoice,
  handleViewPaymentInvoice,
  handleDownloadPaymentInvoice,
  showBranchField = false,
  showBatchField = false,
  paginationFooter = null,
}) => {
  const { showIntegrationColumn } = useZohoIntegrationActive();
  const releasedPaymentTableHeader = useMemo(() => {
    const headers = baseReleasedPaymentTableHeader.filter((header) => {
      if (header.key === 'orgBranch') return showBranchField;
      if (header.key === 'batchId') return showBatchField;
      return true;
    });
    return withIntegrationTableHeader(headers, showIntegrationColumn).map((column) =>
      column.key === 'integration'
        ? { ...column, headerClassName: 'bg-muted text-foreground text-left' }
        : column,
    );
  }, [showBatchField, showBranchField, showIntegrationColumn]);

  const renderReleasedPaymentRow = (payment, rowIndex, headers) => (
    <TableRow key={payment.id ?? rowIndex} data-testid={`payment-row-${payment?.id ?? 'unknown'}`}>
      {headers.map((header) => {
        let value;

        switch (header.key) {
          case 'amount': {
            const invoice = resolvePaymentInvoice?.(payment);
            const amount = invoice
              ? formatInvoiceAmount(invoice, payment.amount || 0)
              : formatCurrency(payment.amount || 0, payment.currency || 'INR');
            value = (
              <div className="space-y-0.5">
                {clippedText(amount)}
                {payment.hasAdvanceAdjustment ? (
                  <div className="text-xs text-muted-foreground">
                    Advance Adjusted: -{formatCurrency(
                      payment.advanceAdjustedTotal ?? 0,
                      payment.currency || 'INR',
                    )}
                  </div>
                ) : null}
                {Number(payment.actualInrAmount ?? payment.actual_inr_amount) > 0 ? (
                  <div className="text-xs text-muted-foreground">
                    Actual INR Amount: {formatCurrency(
                      payment.actualInrAmount ?? payment.actual_inr_amount,
                      'INR',
                    )}
                  </div>
                ) : null}
              </div>
            );
            break;
          }
          case 'invoiceNumber':
            value = (
              <div className="min-w-0">
                {payment.sourceType && payment.sourceType !== 'INVOICE' ? (
                  <span className="mb-0.5 inline-flex rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-semibold text-slate-700">
                    {payment.sourceType}
                  </span>
                ) : null}
                {clippedText(getPayableDisplayLabel(payment))}
              </div>
            );
            break;
          case 'paymentDate':
            value = clippedText(safeFormatDate(payment.paymentDate));
            break;
          case 'vendorName': {
            const invoice = resolvePaymentInvoice?.(payment);
            value = clippedText(getVendorLabel(invoice || payment, payment.vendorName));
            break;
          }
          case 'orgBranch': {
            const invoice = resolvePaymentInvoice?.(payment);
            value = clippedText(getBranchLabel(invoice || payment));
            break;
          }
          case 'reference_number':
            value = clippedText(payment.reference_number);
            break;
          case 'integration':
            value = <IntegrationSourceBadge record={payment} />;
            break;
          case 'actions':
            value = (
              <div className="flex justify-start gap-1">
                {payment.sourceType === 'INVOICE' ? (
                  <>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleViewPaymentInvoice?.(payment)}
                      data-testid={`view-payment-invoice-${payment?.id ?? 'unknown'}`}
                      title="View Invoice"
                      className="h-8 w-8 p-0"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDownloadPaymentInvoice?.(payment)}
                      data-testid={`download-payment-invoice-${payment?.id ?? 'unknown'}`}
                      title="Download Invoice"
                      className="h-8 w-8 p-0"
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                  </>
                ) : (
                  <span className="text-xs text-muted-foreground">Read only</span>
                )}
              </div>
            );
            break;
          default:
            value = clippedText(payment?.[header.key]);
        }

        return (
          <TableCell
            key={header.key}
            className={cn('max-w-[180px] overflow-hidden whitespace-nowrap border border-table-border text-left align-middle', header.cellClassName)}
          >
            {value}
          </TableCell>
        );
      })}
    </TableRow>
  );

  return (
    <div
      className="flex h-full min-h-0 flex-col overflow-hidden rounded-lg border border-border bg-card shadow-sm"
      data-testid="payments-table"
    >
      <div className="min-h-0 flex-1 overflow-x-auto overflow-y-auto scrollbar-thin-muted">
        <AppDataTable
          tableHeader={releasedPaymentTableHeader}
          tableData={filteredPayments}
          renderRow={renderReleasedPaymentRow}
          tableClassName="min-w-[1000px] table-fixed"
          tableContainerClassName="overflow-visible"
          headClassName="border-b border-border bg-muted shadow-sm"
          stickyHeader
          emptyMessage="No payments released yet."
          emptyTestId="no-payments"
        />
      </div>
      {paginationFooter || (
        <div className="mt-auto flex shrink-0 border-t border-border p-4">
          <p className="text-sm text-muted-foreground" data-testid="released-payments-table-summary">
            {filteredPayments.length === totalPayments
              ? `Showing ${filteredPayments.length.toLocaleString('en-IN')} released payment${filteredPayments.length === 1 ? '' : 's'}`
              : `Showing ${filteredPayments.length.toLocaleString('en-IN')} of ${totalPayments.toLocaleString('en-IN')} released payments`}
          </p>
        </div>
      )}
    </div>
  );
};

export default ReleasedPaymentsTab;
