import React from 'react';
import { Eye } from 'lucide-react';
import AppDataTable from '../../../components/common/AppDataTable';
import { Button } from '../../../components/ui/button';
import { TableCell, TableRow } from '../../../components/ui/table';
import { formatCurrency } from '../../../utils/currency';

const allInvoicesTableHeader = [
  { key: 'invoice_number', title: 'Invoice #', cellClassName: "  font-medium" },
  { key: 'vendor_name', title: 'Vendor' },
  { key: 'amount', title: 'Amount', cellClassName: "  font-semibold" },
  { key: 'status', title: 'Status' },
  { key: 'created_by_name', title: 'Created By', cellClassName: 'text-sm text-muted-foreground' },
  { key: 'actions', title: 'Actions', headerClassName: 'text-left', cellClassName: 'text-left' },
];

// Full invoice list table for audit visibility across all statuses.
const AllInvoicesTable = ({
  allInvoices,
  getStatusBadgeClass,
  formatStatus,
  handleViewInvoice,
}) => {
  const renderAllInvoiceRow = (invoice, rowIndex, headers) => (
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
                  data-testid={`view-invoice-${invoice.id}`}
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
      tableHeader={allInvoicesTableHeader}
      tableData={allInvoices}
      renderRow={renderAllInvoiceRow}
      emptyMessage="No invoices found"
    />
  </div>
  );
};

export default AllInvoicesTable;
