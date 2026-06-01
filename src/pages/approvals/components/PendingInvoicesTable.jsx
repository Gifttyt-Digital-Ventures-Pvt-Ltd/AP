import React from 'react';
import { Eye } from 'lucide-react';
import AppDataTable from '../../../components/common/AppDataTable';
import { Button } from '../../../components/ui/button';
import { TableCell, TableRow } from '../../../components/ui/table';
import { formatCurrency } from '../../../utils/currency';

const pendingInvoicesTableHeader = [
  { key: 'vendor_name', title: 'Vendor' },
  { key: 'amount', title: 'Amount', cellClassName: "  font-semibold" },
  { key: 'status', title: 'Status' },
  { key: 'due_date', title: 'Due date', cellClassName: 'text-sm text-muted-foreground' },
  { key: 'actions', title: 'Actions', headerClassName: 'text-left', cellClassName: 'text-left' },
];

// Table for pending approvals currently owned by other roles.
const PendingInvoicesTable = ({
  otherPendingInvoices,
  getStatusBadgeClass,
  formatStatus,
  safeFormatDate,
  handleViewInvoice,
}) => {
  const renderPendingInvoiceRow = (invoice, rowIndex, headers) => (
    <TableRow key={invoice.id ?? rowIndex}>
      {headers.map((header) => {
        let value;

        switch (header.key) {
          case 'amount':
            value = formatCurrency(invoice.amount, invoice.currency);
            break;
          case 'status':
            value = (
              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getStatusBadgeClass(invoice.status)}`}>
                {formatStatus(invoice.status)}
              </span>
            );
            break;
          case 'due_date':
            value = safeFormatDate(invoice.due_date || invoice.dueDate);
            break;
          case 'actions':
            value = (
              <div
                className="flex justify-start gap-1"
                onClick={(event) => event.stopPropagation()}
              >
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleViewInvoice?.(invoice)}
                  data-testid={`view-pending-invoice-${invoice.id}`}
                  title="View Invoice"
                  className="h-8 w-8 p-0"
                >
                  <Eye className="h-4 w-4" />
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

  return (
  <div className="bg-card border border-border rounded-lg shadow-sm overflow-hidden">
    <AppDataTable
      tableHeader={pendingInvoicesTableHeader}
      tableData={otherPendingInvoices}
      renderRow={renderPendingInvoiceRow}
      emptyMessage="No pending invoices"
    />
  </div>
  );
};

export default PendingInvoicesTable;
