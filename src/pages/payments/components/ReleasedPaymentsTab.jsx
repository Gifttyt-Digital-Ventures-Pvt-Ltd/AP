import React from 'react';

// Released tab table for completed payment records.
const ReleasedPaymentsTab = ({ filteredPayments, safeFormatDate }) => (
  <div className="bg-card border border-border rounded-lg shadow-sm overflow-hidden">
    <table className="w-full" data-testid="payments-table">
      <thead className="border-b border-border bg-muted/50">
        <tr>
          <th className="p-4 text-left text-sm font-medium">Invoice #</th>
          <th className="p-4 text-left text-sm font-medium">Vendor</th>
          <th className="p-4 text-left text-sm font-medium">Amount</th>
          <th className="p-4 text-left text-sm font-medium">Payment Date</th>
          <th className="p-4 text-left text-sm font-medium">Method</th>
          <th className="p-4 text-left text-sm font-medium">Reference</th>
        </tr>
      </thead>
      <tbody>
        {filteredPayments.map((payment) => (
          <tr
            key={payment.id}
            className="border-b border-border hover:bg-muted/50 transition-colors"
            data-testid={`payment-row-${payment.id}`}
          >
            <td className="p-4 font-['JetBrains_Mono'] font-medium">{payment.invoice_number}</td>
            <td className="p-4">{payment.vendor_name}</td>
            <td className="p-4 font-['JetBrains_Mono'] font-semibold">
              {'\u20B9'}{payment.amount.toLocaleString('en-IN')}
            </td>
            <td className="p-4 text-sm text-muted-foreground">{safeFormatDate(payment.payment_date)}</td>
            <td className="p-4 text-sm">{payment.payment_method}</td>
            <td className="p-4 text-sm font-['JetBrains_Mono']">{payment.reference_number || '-'}</td>
          </tr>
        ))}
      </tbody>
    </table>
    {filteredPayments.length === 0 && (
      <div className="text-center py-8 text-muted-foreground" data-testid="no-payments">
        No payments released yet. Click "Release All Payments" to process pending invoices.
      </div>
    )}
  </div>
);

export default ReleasedPaymentsTab;
