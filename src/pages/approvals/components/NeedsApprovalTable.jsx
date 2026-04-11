import React from 'react';
import { Button } from '../../../components/ui/button';
import { CheckCircle, XCircle } from 'lucide-react';

// Table of invoices that require current user's approval action.
const NeedsApprovalTable = ({
  myPendingInvoices,
  getApprovalProgress,
  safeFormatDate,
  handleApprovalAction,
}) => (
  <div className="bg-card border border-border rounded-lg shadow-sm overflow-hidden">
    <table className="w-full" data-testid="needs-approval-table">
      <thead className="border-b border-border bg-muted/50">
        <tr>
          <th className="p-4 text-left text-sm font-medium">Vendor</th>
          <th className="p-4 text-left text-sm font-medium">Amount</th>
          <th className="p-4 text-left text-sm font-medium">Approval</th>
          <th className="p-4 text-left text-sm font-medium">Payment date</th>
          <th className="p-4 text-left text-sm font-medium">Due date</th>
          <th className="p-4 text-left text-sm font-medium">Invoice date</th>
          <th className="p-4 text-right text-sm font-medium">Action</th>
        </tr>
      </thead>
      <tbody>
        {myPendingInvoices.map((invoice) => {
          const progress = getApprovalProgress(invoice);
          return (
            <tr
              key={invoice.id}
              className="border-b border-border hover:bg-muted/50 transition-colors"
              data-testid={`approval-row-${invoice.id}`}
            >
              <td className="p-4">{invoice.vendor_name}</td>
              <td className="p-4 font-['JetBrains_Mono'] font-semibold">
                {invoice.amount.toLocaleString()} {invoice.currency}
              </td>
              <td className="p-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">
                    {progress.approved}/{progress.total} approved
                  </span>
                  <div className="flex gap-1">
                    {Array.from({ length: progress.total }).map((_, i) => (
                      <div
                        key={i}
                        className={`h-2 w-2 rounded-full ${
                          i < progress.approved ? 'bg-emerald-500' : 'bg-gray-300'
                        }`}
                      />
                    ))}
                  </div>
                </div>
              </td>
              <td className="p-4 text-sm text-muted-foreground">{safeFormatDate(invoice.payment_date || invoice.paymentDate)}</td>
              <td className="p-4 text-sm text-muted-foreground">{safeFormatDate(invoice.due_date || invoice.dueDate)}</td>
              <td className="p-4 text-sm text-muted-foreground">{safeFormatDate(invoice.invoice_date || invoice.invoiceDate)}</td>
              <td className="p-4 text-right">
                <div className="flex justify-end gap-2">
                  <Button
                    size="sm"
                    onClick={() => handleApprovalAction(invoice, 'Approved')}
                    data-testid={`approve-button-${invoice.id}`}
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleApprovalAction(invoice, 'Rejected')}
                    data-testid={`reject-button-${invoice.id}`}
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Reject
                  </Button>
                </div>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
    {myPendingInvoices.length === 0 && (
      <div className="text-center py-8 text-muted-foreground" data-testid="no-approvals">
        No invoices need your approval
      </div>
    )}
  </div>
);

export default NeedsApprovalTable;
