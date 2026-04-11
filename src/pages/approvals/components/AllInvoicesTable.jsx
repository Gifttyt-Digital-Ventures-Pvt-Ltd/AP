import React from 'react';

// Full invoice list table for audit visibility across all statuses.
const AllInvoicesTable = ({ allInvoices, getStatusBadgeClass, formatStatus }) => (
  <div className="bg-card border border-border rounded-lg shadow-sm overflow-hidden">
    <table className="w-full">
      <thead className="border-b border-border bg-muted/50">
        <tr>
          <th className="p-4 text-left text-sm font-medium">Invoice #</th>
          <th className="p-4 text-left text-sm font-medium">Vendor</th>
          <th className="p-4 text-left text-sm font-medium">Amount</th>
          <th className="p-4 text-left text-sm font-medium">Status</th>
          <th className="p-4 text-left text-sm font-medium">Created By</th>
        </tr>
      </thead>
      <tbody>
        {allInvoices.map((invoice) => (
          <tr key={invoice.id} className="border-b border-border hover:bg-muted/50 transition-colors">
            <td className="p-4 font-['JetBrains_Mono'] font-medium">{invoice.invoice_number}</td>
            <td className="p-4">{invoice.vendor_name}</td>
            <td className="p-4 font-['JetBrains_Mono'] font-semibold">
              {invoice.amount.toLocaleString()} {invoice.currency}
            </td>
            <td className="p-4">
              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getStatusBadgeClass(invoice.status)}`}>
                {formatStatus(invoice.status)}
              </span>
            </td>
            <td className="p-4 text-sm text-muted-foreground">{invoice.created_by_name}</td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

export default AllInvoicesTable;
