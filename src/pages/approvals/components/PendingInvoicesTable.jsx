import React from "react";
import InvoiceDueDateCell from "../../invoices/components/InvoiceDueDateCell";
import { Eye } from "lucide-react";
import AppDataTable from "../../../components/common/AppDataTable";
import ClippedTextWithTooltip from "../../../components/common/ClippedTextWithTooltip";
import { Button } from "../../../components/ui/button";
import { TableCell, TableRow } from "../../../components/ui/table";
import { formatCurrency } from "../../../utils/currency";

const pendingInvoicesTableHeader = [
  { key: "vendorName", title: "Vendor" },
  { key: "amount", title: "Amount", cellClassName: "  font-semibold" },
  { key: "approval", title: "Approval" },
  { key: "status", title: "Status" },
  {
    key: "dueDate",
    title: "Due date",
    cellClassName: "text-sm text-muted-foreground",
  },
  {
    key: "actions",
    title: "Actions",
    headerClassName: "text-center",
    cellClassName: "text-left",
  },
];

// Table for pending approvals currently owned by other roles.
const PendingInvoicesTable = ({
  otherPendingInvoices,
  getStatusBadgeClass,
  formatStatus,
  getApprovalProgress,
  safeFormatDate,
  handleViewInvoice,
  handleOpenInvoiceHistory,
}) => {
  const renderPendingInvoiceRow = (invoice, rowIndex, headers) => {
    const progress = getApprovalProgress(invoice);

    return (
      <TableRow key={invoice.id ?? rowIndex}>
        {headers.map((header) => {
          let value;

          switch (header.key) {
            case "amount":
              value = formatCurrency(invoice.amount, invoice.currency);
              break;
            case "approval":
              value = (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-auto p-0 text-sm text-muted-foreground underline underline-offset-4"
                  onClick={() => handleOpenInvoiceHistory?.(invoice)}
                  data-testid={`pending-approval-history-${invoice.id}`}
                >
                  {progress.approved}/{progress.total} steps
                </Button>
              );
              break;
            case "vendorName":
              value = <ClippedTextWithTooltip text={invoice.vendorName} />;
              break;
            case "status":
              value = (
                <span
                  className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getStatusBadgeClass(invoice.status)}`}
                >
                  {formatStatus(invoice.status)}
                </span>
              );
              break;
            case "dueDate":
              value = (
                <InvoiceDueDateCell
                  invoice={invoice}
                  formattedDueDate={safeFormatDate(invoice.dueDate || invoice.dueDate)}
                />
              );
              break;
            case "actions":
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
              value = invoice?.[header.key] || "-";
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
