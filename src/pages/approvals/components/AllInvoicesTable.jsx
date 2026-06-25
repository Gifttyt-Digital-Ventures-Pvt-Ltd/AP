import React, { useMemo } from "react";
import { Eye, Search } from "lucide-react";
import AppDataTable from "../../../components/common/AppDataTable";
import ClippedTextWithTooltip from "../../../components/common/ClippedTextWithTooltip";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "../../../components/ui/pagination";
import { TableCell, TableRow } from "../../../components/ui/table";
import { formatCurrency } from "../../../utils/currency";
import InvoiceDueDateCell from "../../invoices/components/InvoiceDueDateCell";

const baseAllInvoicesTableHeader = [
  { key: "srNo", title: "Sr. No", cellClassName: "text-sm font-medium" },
  { key: "invoiceNumber", title: "Invoice #", cellClassName: "font-medium" },
  { key: "refNo", title: "Ref No", cellClassName: "font-mono text-sm" },
  { key: "vendorName", title: "Vendor" },
  { key: "approval", title: "Approval" },
  { key: "amount", title: "Amount", cellClassName: "font-semibold" },
  { key: "dueDate", title: "Due Date", cellClassName: "text-sm whitespace-nowrap" },
  { key: "status", title: "Status" },
  {
    key: "createdByName",
    title: "Created By",
    cellClassName: "text-sm text-muted-foreground",
  },
  {
    key: "paymentDate",
    title: "Payment date",
    cellClassName: "text-sm text-muted-foreground",
  },
  {
    key: "actions",
    title: "Actions",
    headerClassName: "text-left",
    cellClassName: "text-left",
  },
];

const AllInvoicesTable = ({
  allInvoices,
  searchTerm,
  setSearchTerm,
  pagination,
  visiblePageNumbers = [],
  onPageChange,
  isLoading = false,
  showRefNoField = false,
  getStatusBadgeClass,
  formatStatus,
  getApprovalProgress,
  safeFormatDate,
  handleOpenInvoiceHistory,
  handleViewInvoice,
}) => {
  const {
    total = 0,
    offset = 0,
    currentPage = 0,
    totalPages = 0,
    startRecord = 0,
    endRecord = 0,
    hasMore = false,
  } = pagination ?? {};

  const tableHeader = useMemo(
    () =>
      showRefNoField
        ? baseAllInvoicesTableHeader
        : baseAllInvoicesTableHeader.filter((column) => column.key !== "refNo"),
    [showRefNoField],
  );

  const renderAllInvoiceRow = (invoice, rowIndex, headers) => {
    const progress = getApprovalProgress(invoice);

    return (
      <TableRow key={invoice.id ?? rowIndex}>
        {headers.map((header) => {
          let value;

          switch (header.key) {
            case "srNo":
              value = offset + rowIndex + 1;
              break;
            case "amount":
              value = formatCurrency(invoice.amount, invoice.currency);
              break;
            case "dueDate":
              value = (
                <InvoiceDueDateCell
                  invoice={invoice}
                  formattedDueDate={safeFormatDate(invoice.dueDate ?? invoice.due_date)}
                />
              );
              break;
            case "vendorName":
              value = <ClippedTextWithTooltip text={invoice.vendorName} />;
              break;
            case "approval":
              value = (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-auto p-0 text-sm text-muted-foreground underline underline-offset-4"
                  onClick={() => handleOpenInvoiceHistory?.(invoice)}
                  data-testid={`all-approval-history-${invoice.id}`}
                >
                  {progress.approved}/{progress.total} steps
                </Button>
              );
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
            case "paymentDate":
              value = safeFormatDate(
                invoice.paymentDate || invoice.paymentDate,
              );
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
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <div className="relative w-full shrink-0 sm:w-64 sm:max-w-xs">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search vendor, invoice #, ref no, amount..."
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
          className="pl-10"
          data-testid="approvals-all-search-input"
        />
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-border bg-card shadow-sm">
        <div className="min-h-0 flex-1 overflow-x-auto overflow-y-auto scrollbar-thin-muted">
          <AppDataTable
            tableHeader={tableHeader}
            tableData={allInvoices}
            renderRow={renderAllInvoiceRow}
            isLoading={isLoading}
            loadingRowCount={8}
            emptyMessage="No invoices found"
            emptyTestId="approvals-all-no-invoices"
          />
        </div>

        <div className="mt-auto flex shrink-0 flex-col gap-3 border-t border-border p-4 sm:flex-row sm:items-center sm:justify-between">
          {totalPages > 0 ? (
            <>
              <p
                className="text-sm text-muted-foreground"
                data-testid="approvals-all-pagination-summary"
              >
                Showing {startRecord}-{endRecord} of{" "}
                {total.toLocaleString("en-IN")}
              </p>
              <Pagination className="mx-0 w-auto justify-start sm:justify-end">
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      href="#"
                      onClick={(event) => {
                        event.preventDefault();
                        onPageChange?.(currentPage - 1);
                      }}
                      className={
                        currentPage === 0
                          ? "pointer-events-none opacity-50"
                          : undefined
                      }
                      data-testid="approvals-all-pagination-previous"
                    />
                  </PaginationItem>
                  {visiblePageNumbers.map((pageNumber) => (
                    <PaginationItem key={pageNumber}>
                      <PaginationLink
                        href="#"
                        isActive={pageNumber === currentPage}
                        onClick={(event) => {
                          event.preventDefault();
                          onPageChange?.(pageNumber);
                        }}
                        data-testid={`approvals-all-pagination-page-${pageNumber + 1}`}
                      >
                        {pageNumber + 1}
                      </PaginationLink>
                    </PaginationItem>
                  ))}
                  <PaginationItem>
                    <PaginationNext
                      href="#"
                      onClick={(event) => {
                        event.preventDefault();
                        onPageChange?.(currentPage + 1);
                      }}
                      className={
                        !hasMore && currentPage >= totalPages - 1
                          ? "pointer-events-none opacity-50"
                          : undefined
                      }
                      data-testid="approvals-all-pagination-next"
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default AllInvoicesTable;
