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
import { OrgBranchCell, VendorWithBranchCell } from '../../../components/common/BranchTableCells';
import { cn } from '../../../lib/utils';

const baseReleasedPaymentTableHeader = [
  { key: 'invoiceNumber', title: 'Invoice #', headerClassName: 'bg-muted text-foreground', cellClassName: "  font-medium" },
  { key: 'orgBranch', title: 'Branch', headerClassName: 'bg-muted text-foreground', cellClassName: 'text-sm' },
  { key: 'vendorName', title: 'Vendor', headerClassName: 'bg-muted text-foreground' },
  { key: 'amount', title: 'Amount', headerClassName: 'bg-muted text-foreground', cellClassName: "  font-semibold" },
  { key: 'paymentDate', title: 'Payment Date', headerClassName: 'bg-muted text-foreground', cellClassName: 'text-sm text-muted-foreground' },
  { key: 'payment_method', title: 'Method', headerClassName: 'bg-muted text-foreground', cellClassName: 'text-sm' },
  { key: 'reference_number', title: 'Reference', headerClassName: 'bg-muted text-foreground', cellClassName: "text-sm  " },
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
}) => {
  const { showIntegrationColumn } = useZohoIntegrationActive();
  const releasedPaymentTableHeader = useMemo(() => {
    const headers = showBranchField
      ? baseReleasedPaymentTableHeader
      : baseReleasedPaymentTableHeader.filter((header) => header.key !== 'orgBranch');
    return withIntegrationTableHeader(headers, showIntegrationColumn).map((column) =>
      column.key === 'integration'
        ? { ...column, headerClassName: 'bg-muted text-foreground text-left' }
        : column,
    );
  }, [showBranchField, showIntegrationColumn]);

  const renderReleasedPaymentRow = (payment, rowIndex, headers) => (
    <TableRow key={payment.id ?? rowIndex} data-testid={`payment-row-${payment?.id ?? 'unknown'}`}>
      {headers.map((header) => {
        let value;

        switch (header.key) {
          case 'amount': {
            const invoice = resolvePaymentInvoice?.(payment);
            value = invoice
              ? formatInvoiceAmount(invoice, payment.amount || 0)
              : formatCurrency(payment.amount || 0, payment.currency || 'INR');
            break;
          }
          case 'paymentDate':
            value = safeFormatDate(payment.paymentDate);
            break;
          case 'vendorName': {
            const invoice = resolvePaymentInvoice?.(payment);
            value = <VendorWithBranchCell record={invoice || payment} vendorName={payment.vendorName} />;
            break;
          }
          case 'orgBranch': {
            const invoice = resolvePaymentInvoice?.(payment);
            value = <OrgBranchCell record={invoice || payment} />;
            break;
          }
          case 'reference_number':
            value = payment.reference_number || '-';
            break;
          case 'integration':
            value = <IntegrationSourceBadge record={payment} />;
            break;
          case 'actions':
            value = (
              <div className="flex justify-start gap-1">
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
              </div>
            );
            break;
          default:
            value = payment?.[header.key] || '-';
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
    <div
      className="flex h-full min-h-0 flex-col overflow-hidden rounded-lg border border-border bg-card shadow-sm"
      data-testid="payments-table"
    >
      <div className="min-h-0 flex-1 overflow-x-auto overflow-y-auto scrollbar-thin-muted">
        <AppDataTable
          tableHeader={releasedPaymentTableHeader}
          tableData={filteredPayments}
          renderRow={renderReleasedPaymentRow}
          tableClassName="min-w-[1000px]"
          tableContainerClassName="overflow-visible"
          headClassName="border-b border-border bg-muted shadow-sm"
          stickyHeader
          bordered
          emptyMessage='No payments released yet. Click "Release All Payments" to process pending invoices.'
          emptyTestId="no-payments"
        />
      </div>
      <div className="mt-auto flex shrink-0 border-t border-border p-4">
        <p className="text-sm text-muted-foreground" data-testid="released-payments-table-summary">
          {filteredPayments.length === totalPayments
            ? `Showing ${filteredPayments.length.toLocaleString('en-IN')} released payment${filteredPayments.length === 1 ? '' : 's'}`
            : `Showing ${filteredPayments.length.toLocaleString('en-IN')} of ${totalPayments.toLocaleString('en-IN')} released payments`}
        </p>
      </div>
    </div>
  );
};

export default ReleasedPaymentsTab;
