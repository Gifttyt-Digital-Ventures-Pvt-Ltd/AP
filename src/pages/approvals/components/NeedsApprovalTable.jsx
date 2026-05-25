import React from 'react';
import { Button } from '../../../components/ui/button';
import { CheckCircle, XCircle } from 'lucide-react';
import AppDataTable from '../../../components/common/AppDataTable';
import { TableCell, TableRow } from '../../../components/ui/table';

const needsApprovalTableHeader = [
  { key: 'vendor_name', title: 'Vendor' },
  { key: 'amount', title: 'Amount', cellClassName: "font-['JetBrains_Mono'] font-semibold" },
  { key: 'approval', title: 'Approval' },
  { key: 'payment_date', title: 'Payment date', cellClassName: 'text-sm text-muted-foreground' },
  { key: 'due_date', title: 'Due date', cellClassName: 'text-sm text-muted-foreground' },
  { key: 'invoice_date', title: 'Invoice date', cellClassName: 'text-sm text-muted-foreground' },
  { key: 'action', title: 'Action', headerClassName: 'text-right', cellClassName: 'text-right' },
];

// Table of invoices that require current user's approval action.
const NeedsApprovalTable = ({
  myPendingInvoices,
  getApprovalProgress,
  safeFormatDate,
  handleApprovalAction,
  canApproveInvoices,
}) => {
  const renderNeedsApprovalRow = (invoice, rowIndex, headers) => {
    const progress = getApprovalProgress(invoice);

    return (
      <TableRow key={invoice.id ?? rowIndex} data-testid={`approval-row-${invoice.id}`}>
        {headers.map((header) => {
          let value;

          switch (header.key) {
            case 'amount':
              value = `${invoice.amount.toLocaleString()} ${invoice.currency}`;
              break;
            case 'approval':
              value = (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">
                    {progress.approved}/{progress.total} approved
                  </span>
                  <div className="flex gap-1">
                    {Array.from({ length: progress.total }).map((_, i) => (
                      <div
                        key={i}
                        className={`h-2 w-2 rounded-full ${i < progress.approved ? 'bg-emerald-500' : 'bg-gray-300'}`}
                      />
                    ))}
                  </div>
                </div>
              );
              break;
            case 'payment_date':
              value = safeFormatDate(invoice.payment_date || invoice.paymentDate);
              break;
            case 'due_date':
              value = safeFormatDate(invoice.due_date || invoice.dueDate);
              break;
            case 'invoice_date':
              value = safeFormatDate(invoice.invoice_date || invoice.invoiceDate);
              break;
            case 'action':
              value = (
                <div className="flex justify-end gap-2">
                  <Button
                    size="sm"
                    onClick={() => handleApprovalAction(invoice, (invoice.status === 'Pending Checker' || invoice.status === 'PENDING_CHECKER') ? 'Checked' : 'Approved')}
                    data-testid={`approve-button-${invoice.id}`}
                    disabled={!canApproveInvoices}
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    {(invoice.status === 'Pending Checker' || invoice.status === 'PENDING_CHECKER') ? 'Verify' : 'Approve'}
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleApprovalAction(invoice, 'Rejected')}
                    data-testid={`reject-button-${invoice.id}`}
                    disabled={!canApproveInvoices}
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Reject
                  </Button>
                </div>
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
  };

  return (
  <div className="bg-card border border-border rounded-lg shadow-sm overflow-hidden" data-testid="needs-approval-table">
    <AppDataTable
      tableHeader={needsApprovalTableHeader}
      tableData={myPendingInvoices}
      renderRow={renderNeedsApprovalRow}
      emptyMessage="No invoices need your approval"
      emptyTestId="no-approvals"
    />
  </div>
  );
};

export default NeedsApprovalTable;
