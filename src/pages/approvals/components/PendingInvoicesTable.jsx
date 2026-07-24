import React from "react";
import InvoiceDueDateCell from "../../invoices/components/InvoiceDueDateCell";
import { Eye } from "lucide-react";
import AppDataTable from "../../../components/common/AppDataTable";
import { OrgBranchCell, VendorWithBranchCell } from "../../../components/common/BranchTableCells";
import { Button } from "../../../components/ui/button";
import { TableCell, TableRow } from "../../../components/ui/table";
import { formatCurrency } from "../../../utils/currency";
import InvoiceDocumentTypeBadge from "../../invoices/components/InvoiceDocumentTypeBadge";
import { cn } from "../../../lib/utils";

const basePendingInvoicesTableHeader = [
  { key: "srNo", title: "Sr. No", headerClassName: "bg-muted text-foreground", cellClassName: "text-sm font-medium" },
  { key: "invoiceNumber", title: "Invoice #", headerClassName: "bg-muted text-foreground", cellClassName: "font-medium" },
  { key: "refNo", title: "Ref No", headerClassName: "bg-muted text-foreground", cellClassName: "font-mono text-sm" },
  { key: "orgBranch", title: "Branch", headerClassName: "bg-muted text-foreground", cellClassName: "text-sm" },
  { key: "vendorName", title: "Vendor", headerClassName: "bg-muted text-foreground" },
  { key: "documentType", title: "Type", headerClassName: "bg-muted text-foreground", cellClassName: "text-sm" },
  { key: "approval", title: "Approval", headerClassName: "bg-muted text-foreground" },
  { key: "amount", title: "Amount", headerClassName: "bg-muted text-foreground", cellClassName: "font-semibold" },
  {
    key: "dueDate",
    title: "Due Date",
    headerClassName: "bg-muted text-foreground",
    cellClassName: "text-sm whitespace-nowrap",
  },
  { key: "status", title: "Status", headerClassName: "bg-muted text-foreground" },
  {
    key: "createdByName",
    title: "Created By",
    headerClassName: "bg-muted text-foreground",
    cellClassName: "text-sm text-muted-foreground",
  },
  {
    key: "paymentDate",
    title: "Payment date",
    headerClassName: "bg-muted text-foreground",
    cellClassName: "text-sm text-muted-foreground",
  },
  {
    key: "actions",
    title: "Actions",
    headerClassName: "bg-muted text-foreground text-left",
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
  showRefNoField = false,
  showBranchField = false,
}) => {
  let tableHeader = showRefNoField
    ? basePendingInvoicesTableHeader
    : basePendingInvoicesTableHeader.filter((header) => header.key !== "refNo");
  if (!showBranchField) {
    tableHeader = tableHeader.filter((header) => header.key !== "orgBranch");
  }

  const renderPendingInvoiceRow = (invoice, rowIndex, headers) => {
    const progress = getApprovalProgress(invoice);

    return (
      <TableRow key={invoice.id ?? rowIndex}>
        {headers.map((header) => {
          let value;

          switch (header.key) {
            case "srNo":
              value = rowIndex + 1;
              break;
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
                  data-testid={`pending-approval-history-${invoice?.id ?? 'unknown'}`}
                >
                  {progress.approved}/{progress.total} steps
                </Button>
              );
              break;
            case "vendorName":
              value = <VendorWithBranchCell record={invoice} />;
              break;
            case "documentType":
              value = <InvoiceDocumentTypeBadge invoice={invoice} />;
              break;
            case "orgBranch":
              value = <OrgBranchCell record={invoice} />;
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
                  formattedDueDate={safeFormatDate(invoice.dueDate ?? invoice.due_date)}
                />
              );
              break;
            case "paymentDate":
              value = safeFormatDate(invoice.paymentDate ?? invoice.payment_date);
              break;
            case "refNo":
              value = invoice.refNo || "-";
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
                    data-testid={`view-pending-invoice-${invoice?.id ?? 'unknown'}`}
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
            <TableCell
              key={header.key}
              className={cn("border border-border", header.cellClassName)}
            >
              {value}
            </TableCell>
          );
        })}
      </TableRow>
    );
  };

  return (
    <div
      className="flex h-full min-h-0 flex-col overflow-hidden rounded-lg border border-border bg-card shadow-sm"
      data-testid="pending-invoices-table"
    >
      <div className="min-h-0 flex-1 overflow-x-auto overflow-y-auto scrollbar-thin-muted">
        <AppDataTable
          tableHeader={tableHeader}
          tableData={otherPendingInvoices}
          renderRow={renderPendingInvoiceRow}
          tableClassName="min-w-[1500px]"
          tableContainerClassName="overflow-visible"
          headClassName="border-b border-border bg-muted shadow-sm"
          stickyHeader
          bordered
          emptyMessage="No pending invoices"
          emptyTestId="no-pending-invoices"
        />
      </div>
      <div className="mt-auto flex shrink-0 border-t border-border p-4">
        <p className="text-sm text-muted-foreground" data-testid="pending-invoices-table-summary">
          {otherPendingInvoices.length === 0
            ? "No pending invoices"
            : `Showing ${otherPendingInvoices.length.toLocaleString("en-IN")} pending invoice${otherPendingInvoices.length === 1 ? "" : "s"}`}
        </p>
      </div>
    </div>
  );
};

export default PendingInvoicesTable;
