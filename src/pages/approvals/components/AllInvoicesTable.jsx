import React from 'react';
import AppDataTable from '../../../components/common/AppDataTable';
import { TableCell, TableRow } from '../../../components/ui/table';

const allInvoicesTableHeader = [
  { key: 'invoice_number', title: 'Invoice #', cellClassName: "font-['JetBrains_Mono'] font-medium" },
  { key: 'vendor_name', title: 'Vendor' },
  { key: 'amount', title: 'Amount', cellClassName: "font-['JetBrains_Mono'] font-semibold" },
  { key: 'status', title: 'Status' },
  { key: 'created_by_name', title: 'Created By', cellClassName: 'text-sm text-muted-foreground' },
];

// Full invoice list table for audit visibility across all statuses.
const AllInvoicesTable = ({ allInvoices, getStatusBadgeClass, formatStatus }) => {
  const renderAllInvoiceRow = (invoice, rowIndex, headers) => (
    <TableRow key={invoice.id ?? rowIndex}>
      {headers.map((header) => {
        let value;

        switch (header.key) {
          case 'amount':
            value = `${invoice.amount.toLocaleString()} ${invoice.currency}`;
            break;
          case 'status':
            value = (
              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getStatusBadgeClass(invoice.status)}`}>
                {formatStatus(invoice.status)}
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
