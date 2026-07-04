import React, { useMemo } from "react";
import InvoiceDueDateCell from "../../invoices/components/InvoiceDueDateCell";
import { Button } from "../../../components/ui/button";
import { CheckCircle, Eye, RotateCcw, XCircle } from "lucide-react";
import {
  isInvoiceAwaitingApproval,
  NEEDS_CORRECTION_ACTION,
  normalizeWorkflowStatus,
} from "../../../utils/approvalWorkflow";
import AppDataTable from "../../../components/common/AppDataTable";
import { OrgBranchCell, VendorWithBranchCell } from "../../../components/common/BranchTableCells";
import { TableCell, TableRow } from "../../../components/ui/table";
import { formatCurrency } from "../../../utils/currency";

const baseNeedsApprovalTableHeader = [
  { key: "orgBranch", title: "Branch", headerClassName: "bg-muted text-foreground", cellClassName: "text-sm" },
  { key: "vendorName", title: "Vendor", headerClassName: "bg-muted text-foreground" },
  { key: "amount", title: "Amount", headerClassName: "bg-muted text-foreground", cellClassName: "  font-semibold" },
  { key: "approval", title: "Approval", headerClassName: "bg-muted text-foreground" },
  {
    key: "dueDate",
    title: "Due date",
    headerClassName: "bg-muted text-foreground",
    cellClassName: "text-sm text-muted-foreground",
  },
  {
    key: "invoiceDate",
    title: "Invoice date",
    headerClassName: "bg-muted text-foreground",
    cellClassName: "text-sm text-muted-foreground",
  },
  {
    key: "action",
    title: "Action",
    headerClassName: "bg-muted text-foreground text-left",
    cellClassName: "text-left",
  },
];

// Table of invoices that require current user's approval action.
const NeedsApprovalTable = ({
  myPendingInvoices,
  getApprovalProgress,
  safeFormatDate,
  handleApprovalAction,
  handleViewInvoice,
  handleOpenInvoiceHistory,
  canApproveInvoices,
  canCheckInvoices,
  showApprovalProgress = false,
  showBranchField = false,
}) => {
  const tableHeaders = useMemo(() => {
    let headers = showApprovalProgress
      ? baseNeedsApprovalTableHeader
      : baseNeedsApprovalTableHeader.filter((header) => header.key !== "approval");
    if (!showBranchField) {
      headers = headers.filter((header) => header.key !== "orgBranch");
    }
    return headers;
  }, [showApprovalProgress, showBranchField]);

  const renderNeedsApprovalRow = (invoice, rowIndex, headers) => {
    const progress = getApprovalProgress(invoice);
    const status = normalizeWorkflowStatus(invoice.status);
    const isChecker = status === "Pending Checker";
    const canAct =
      isInvoiceAwaitingApproval(invoice.status) &&
      (isChecker ? canCheckInvoices : canApproveInvoices);

    return (
      <TableRow
        key={invoice.id ?? rowIndex}
        data-testid={`approval-row-${invoice.id}`}
      >
        {headers.map((header) => {
          let value;

          switch (header.key) {
            case "amount":
              value = formatCurrency(invoice.amount, invoice.currency);
              break;
            case "vendorName":
              value = <VendorWithBranchCell record={invoice} />;
              break;
            case "orgBranch":
              value = <OrgBranchCell record={invoice} />;
              break;
            case "approval":
              value = (
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-auto p-0 text-sm text-muted-foreground underline underline-offset-4"
                    onClick={() => handleOpenInvoiceHistory?.(invoice)}
                    data-testid={`approval-history-${invoice.id}`}
                  >
                    {isChecker
                      ? "History"
                      : `${progress.approved}/${progress.total} steps`}
                  </Button>
                  <div className="flex gap-1">
                    {!isChecker &&
                      Array.from({ length: progress.total }).map((_, i) => (
                        <div
                          key={i}
                          className={`h-2 w-2 rounded-full ${i < progress.approved ? "bg-emerald-500" : "bg-gray-300"}`}
                        />
                      ))}
                  </div>
                </div>
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
            case "invoiceDate":
              value = safeFormatDate(
                invoice.invoiceDate || invoice.invoiceDate,
              );
              break;
            case "action":
              value = (
                <div className="flex justify-start gap-2">
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
                  <Button
                    size="sm"
                    onClick={() =>
                      handleApprovalAction(
                        invoice,
                        isChecker ? "Checked" : "Approved",
                      )
                    }
                    data-testid={`approve-button-${invoice.id}`}
                    disabled={!canAct}
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    {isChecker ? "Verify" : "Approve"}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      handleApprovalAction(invoice, NEEDS_CORRECTION_ACTION)
                    }
                    data-testid={`needs-correction-button-${invoice.id}`}
                    disabled={!canAct}
                  >
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Needs Correction
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleApprovalAction(invoice, "Rejected")}
                    data-testid={`reject-button-${invoice.id}`}
                    disabled={!canAct}
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Reject
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
    <div
      className="flex h-full min-h-0 flex-col overflow-hidden rounded-lg border border-border bg-card shadow-sm"
      data-testid="needs-approval-table"
    >
      <div className="min-h-0 flex-1 overflow-x-auto overflow-y-auto scrollbar-thin-muted">
        <AppDataTable
          tableHeader={tableHeaders}
          tableData={myPendingInvoices}
          renderRow={renderNeedsApprovalRow}
          tableClassName="min-w-[1100px]"
          tableContainerClassName="overflow-visible"
          headClassName="border-b border-border bg-muted shadow-sm"
          stickyHeader
          emptyMessage="No invoices need your approval"
          emptyTestId="no-approvals"
        />
      </div>
      <div className="mt-auto flex shrink-0 border-t border-border p-4">
        <p className="text-sm text-muted-foreground" data-testid="needs-approval-table-summary">
          {myPendingInvoices.length === 0
            ? "No invoices need your approval"
            : `Showing ${myPendingInvoices.length.toLocaleString("en-IN")} invoice${myPendingInvoices.length === 1 ? "" : "s"} needing your approval`}
        </p>
      </div>
    </div>
  );
};

export default NeedsApprovalTable;
