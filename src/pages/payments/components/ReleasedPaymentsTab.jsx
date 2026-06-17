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

const baseReleasedPaymentTableHeader = [
  { key: 'invoiceNumber', title: 'Invoice #', cellClassName: "  font-medium" },
  { key: 'vendorName', title: 'Vendor' },
  { key: 'amount', title: 'Amount', cellClassName: "  font-semibold" },
  { key: 'paymentDate', title: 'Payment Date', cellClassName: 'text-sm text-muted-foreground' },
  { key: 'payment_method', title: 'Method', cellClassName: 'text-sm' },
  { key: 'reference_number', title: 'Reference', cellClassName: "text-sm  " },
  { key: 'actions', title: 'Actions', headerClassName: 'text-left', cellClassName: 'text-left' },
];

// Released tab table for completed payment records.
const ReleasedPaymentsTab = ({
  filteredPayments,
  safeFormatDate,
  resolvePaymentInvoice,
  handleViewPaymentInvoice,
  handleDownloadPaymentInvoice,
}) => {
  const { showIntegrationColumn } = useZohoIntegrationActive();
  const releasedPaymentTableHeader = useMemo(
    () => withIntegrationTableHeader(baseReleasedPaymentTableHeader, showIntegrationColumn),
    [showIntegrationColumn],
  );

  const renderReleasedPaymentRow = (payment, rowIndex, headers) => (
    <TableRow key={payment.id ?? rowIndex} data-testid={`payment-row-${payment.id}`}>
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
                  data-testid={`view-payment-invoice-${payment.id}`}
                  title="View Invoice"
                  className="h-8 w-8 p-0"
                >
                  <Eye className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDownloadPaymentInvoice?.(payment)}
                  data-testid={`download-payment-invoice-${payment.id}`}
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
          <TableCell key={header.key} className={header.cellClassName}>
            {value}
          </TableCell>
        );
      })}
    </TableRow>
  );

  return (
    <div
      className="bg-card border border-border rounded-lg shadow-sm overflow-hidden"
      data-testid="payments-table"
    >
      <AppDataTable
        tableHeader={releasedPaymentTableHeader}
        tableData={filteredPayments}
        renderRow={renderReleasedPaymentRow}
        emptyMessage='No payments released yet. Click "Release All Payments" to process pending invoices.'
        emptyTestId="no-payments"
      />
    </div>
  );
};

export default ReleasedPaymentsTab;
