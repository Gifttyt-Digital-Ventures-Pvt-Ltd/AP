import React from "react";
import { cn } from "../../../lib/utils";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "../../../components/ui/pagination";

/**
 * Numbered page-link footer using the shadcn Pagination primitives, matching
 * the pattern already used by Invoices/Payments (InvoicesPage.jsx) rather
 * than a bare Previous/Next footer — lets a user jump directly to a page.
 * Every click just calls onPageChange, which updates OrderTrackingPage's
 * `params.page` and re-fetches from the server; nothing here slices an array
 * itself.
 */
const getVisiblePageNumbers = (currentPage, totalPages) => {
  if (totalPages <= 5) {
    return Array.from({ length: totalPages }, (_, index) => index);
  }
  const start = Math.min(Math.max(currentPage - 2, 0), totalPages - 5);
  return Array.from({ length: 5 }, (_, index) => start + index);
};

const OrderTrackingPagination = ({ page, totalPages, totalRows, pageSize, onPageChange }) => {
  if (totalRows === 0) return null;

  const canGoPrevious = page > 0;
  const canGoNext = page < totalPages - 1;
  const startRecord = page * pageSize + 1;
  const endRecord = Math.min((page + 1) * pageSize, totalRows);
  const visiblePageNumbers = getVisiblePageNumbers(page, totalPages);

  return (
    <div className="flex shrink-0 flex-col gap-2 border-t border-border px-4 py-2 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-xs text-muted-foreground" data-testid="order-tracking-pagination-summary">
        Showing {startRecord}-{endRecord} of {totalRows.toLocaleString("en-IN")}
      </p>
      <Pagination className="mx-0 w-auto justify-start sm:justify-end">
        <PaginationContent className="gap-0.5">
          <PaginationItem>
            <PaginationPrevious
              href="#"
              onClick={(event) => {
                event.preventDefault();
                if (canGoPrevious) onPageChange(page - 1);
              }}
              className={cn(
                "h-7 gap-1 pl-2 pr-2.5 text-xs",
                !canGoPrevious && "pointer-events-none opacity-50",
              )}
              data-testid="order-tracking-pagination-previous"
            />
          </PaginationItem>
          {visiblePageNumbers.map((pageNumber) => (
            <PaginationItem key={pageNumber}>
              <PaginationLink
                href="#"
                isActive={pageNumber === page}
                onClick={(event) => {
                  event.preventDefault();
                  onPageChange(pageNumber);
                }}
                className="h-7 w-7 text-xs"
                data-testid={`order-tracking-pagination-page-${pageNumber + 1}`}
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
                if (canGoNext) onPageChange(page + 1);
              }}
              className={cn(
                "h-7 gap-1 pl-2.5 pr-2 text-xs",
                !canGoNext && "pointer-events-none opacity-50",
              )}
              data-testid="order-tracking-pagination-next"
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    </div>
  );
};

export default OrderTrackingPagination;
