import React from 'react';
import { Button } from '../../../components/ui/button';
import AppDataTable from '../../../components/common/AppDataTable';
import { TableCell, TableRow } from '../../../components/ui/table';

const pendingPaymentTableHeader = [
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
  safeFormatDate,
}) => {
  const renderPendingPaymentRow = (invoice, rowIndex, headers) => (
    <TableRow key={invoice.id ?? rowIndex} data-testid={`pending-invoice-row-${invoice.id}`}>
      {headers.map((header) => {
        let value;

        switch (header.key) {
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
        <div className="flex justify-between items-center">
          <div>
            <p className="text-sm font-medium">Total Pending Amount</p>
            <p className="text-2xl font-bold font-['JetBrains_Mono'] text-accent">
              {'\u20B9'}{totalPendingAmount.toLocaleString('en-IN')}
            </p>
          </div>
          <Button onClick={handleBulkRelease} size="lg">
            Release All Payments
          </Button>
        </div>
      </div>
    )}

    <div className="bg-card border border-border rounded-lg shadow-sm overflow-hidden" data-testid="pending-invoices-table">
      <AppDataTable
        tableHeader={pendingPaymentTableHeader}
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
