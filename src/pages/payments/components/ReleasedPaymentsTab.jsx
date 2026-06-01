import React from 'react';
import AppDataTable from '../../../components/common/AppDataTable';
import { TableCell, TableRow } from '../../../components/ui/table';

const releasedPaymentTableHeader = [
  { key: 'invoice_number', title: 'Invoice #', cellClassName: "font-['JetBrains_Mono'] font-medium" },
  { key: 'vendor_name', title: 'Vendor' },
  { key: 'amount', title: 'Amount', cellClassName: "font-['JetBrains_Mono'] font-semibold" },
  { key: 'payment_date', title: 'Payment Date', cellClassName: 'text-sm text-muted-foreground' },
  { key: 'payment_method', title: 'Method', cellClassName: 'text-sm' },
  { key: 'reference_number', title: 'Reference', cellClassName: "text-sm font-['JetBrains_Mono']" },
];

// Released tab table for completed payment records.
const ReleasedPaymentsTab = ({ filteredPayments, safeFormatDate }) => {
  const renderReleasedPaymentRow = (payment, rowIndex, headers) => (
    <TableRow key={payment.id ?? rowIndex} data-testid={`payment-row-${payment.id}`}>
      {headers.map((header) => {
        let value;

        switch (header.key) {
          case 'amount':
            value = `₹${Number(payment.amount || 0).toLocaleString('en-IN')}`;
            break;
          case 'payment_date':
            value = safeFormatDate(payment.payment_date);
            break;
          case 'reference_number':
            value = payment.reference_number || '-';
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
  <div className="bg-card border border-border rounded-lg shadow-sm overflow-hidden" data-testid="payments-table">
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
