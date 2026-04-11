import React from 'react';
import { Button } from '../../../components/ui/button';

// Pending tab with summary card and pending invoice table.
const PendingPaymentsTab = ({
  invoices,
  filteredPendingInvoices,
  totalPendingAmount,
  handleBulkRelease,
  safeFormatDate,
}) => (
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

    <div className="bg-card border border-border rounded-lg shadow-sm overflow-hidden">
      <table className="w-full" data-testid="pending-invoices-table">
        <thead className="border-b border-border bg-muted/50">
          <tr>
            <th className="p-4 text-left text-sm font-medium">Invoice #</th>
            <th className="p-4 text-left text-sm font-medium">Vendor</th>
            <th className="p-4 text-left text-sm font-medium">Amount</th>
            <th className="p-4 text-left text-sm font-medium">Invoice Date</th>
            <th className="p-4 text-left text-sm font-medium">Due Date</th>
            <th className="p-4 text-left text-sm font-medium">Status</th>
          </tr>
        </thead>
        <tbody>
          {filteredPendingInvoices.map((invoice) => (
            <tr
              key={invoice.id}
              className="border-b border-border hover:bg-muted/50 transition-colors"
              data-testid={`pending-invoice-row-${invoice.id}`}
            >
              <td className="p-4 font-['JetBrains_Mono'] font-medium">{invoice.invoice_number}</td>
              <td className="p-4">{invoice.vendor_name}</td>
              <td className="p-4 font-['JetBrains_Mono'] font-semibold">
                {'\u20B9'}{invoice.amount.toLocaleString('en-IN')}
              </td>
              <td className="p-4 text-sm text-muted-foreground">{safeFormatDate(invoice.invoice_date)}</td>
              <td className="p-4 text-sm text-muted-foreground">{safeFormatDate(invoice.due_date)}</td>
              <td className="p-4">
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border bg-blue-100 text-blue-800 border-blue-200">
                  Pending Payment
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {filteredPendingInvoices.length === 0 && (
        <div className="text-center py-8 text-muted-foreground" data-testid="no-pending-payments">
          No pending payments. All invoices need approval first.
        </div>
      )}
    </div>
  </>
);

export default PendingPaymentsTab;
