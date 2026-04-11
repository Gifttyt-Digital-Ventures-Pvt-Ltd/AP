import React from 'react';

// Table for pending approvals currently owned by other roles.
const PendingInvoicesTable = ({ otherPendingInvoices, getStatusBadgeClass, formatStatus, safeFormatDate }) => (
  <div className="bg-card border border-border rounded-lg shadow-sm overflow-hidden">
    <table className="w-full">
      <thead className="border-b border-border bg-muted/50">
        <tr>
          <th className="p-4 text-left text-sm font-medium">Vendor</th>
          <th className="p-4 text-left text-sm font-medium">Amount</th>
          <th className="p-4 text-left text-sm font-medium">Status</th>
          <th className="p-4 text-left text-sm font-medium">Due date</th>
        </tr>
      </thead>
      <tbody>
        {otherPendingInvoices.map((invoice) => (
          <tr key={invoice.id} className="border-b border-border hover:bg-muted/50 transition-colors">
            <td className="p-4">{invoice.vendor_name}</td>
            <td className="p-4 font-['JetBrains_Mono'] font-semibold">
              {invoice.amount.toLocaleString()} {invoice.currency}
            </td>
            <td className="p-4">
              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getStatusBadgeClass(invoice.status)}`}>
                {formatStatus(invoice.status)}
              </span>
            </td>
            <td className="p-4 text-sm text-muted-foreground">{safeFormatDate(invoice.due_date || invoice.dueDate)}</td>
          </tr>
        ))}
      </tbody>
    </table>
    {otherPendingInvoices.length === 0 && <div className="text-center py-8 text-muted-foreground">No pending invoices</div>}
  </div>
);

export default PendingInvoicesTable;
