import React from "react";
import { format } from "date-fns";
import { Eye } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../../../../components/ui/dialog";
import { Button } from "../../../../components/ui/button";

/**
 * Row layout modeled on InvoiceLinkedTaxInvoicesPanel.jsx — and now reuses
 * that same component's onViewInvoice(invoice) convention too (see
 * InvoicesPage.jsx's own onViewInvoice={handleViewLinkedInvoice} wiring for
 * that panel), instead of the previous window.open(..., "_blank") via the
 * notification deep-link contract. That route forced a new tab specifically
 * because going through it in the current tab would navigate the current
 * URL and flip the page's active tab — exactly what would risk losing the
 * invoice still being typed in this dialog's own form. onViewInvoice opens
 * the match in the existing read-only ViewDialog as an overlay instead, so
 * the same "never lose the in-progress invoice" goal holds without a new tab.
 */
const formatCreatedAt = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return format(date, "d MMM yyyy, h:mm a");
};

const DuplicateInvoicesListDialog = ({ open, onOpenChange, matches = [], onResolveClick, onViewInvoice }) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="max-h-[80vh] overflow-y-auto sm:max-w-lg">
      <DialogHeader className="flex-row items-center justify-between space-y-0">
        <DialogTitle>Duplicate Invoices</DialogTitle>
        {onResolveClick ? (
          <Button
            type="button"
            variant="link"
            size="sm"
            className="mr-6 h-auto p-0 text-sm"
            onClick={onResolveClick}
            data-testid="duplicate-invoices-resolve"
          >
            Resolve
          </Button>
        ) : null}
      </DialogHeader>

      <div className="space-y-2">
        {matches.map((match) => (
          <div
            key={match.id}
            className={`group flex items-center justify-between rounded-lg border border-border p-3 ${
              match.deemphasized ? "opacity-50" : ""
            }`}
            title={`${match.vendorName || ""} · ${match.amount ?? ""} ${match.currency || ""} · ${match.status || ""}`}
            data-testid={`duplicate-invoice-row-${match.id}`}
          >
            <div>
              <p className="text-sm font-medium text-foreground">
                #{match.invoiceNumber}
                {match.deemphasized ? (
                  <span className="ml-2 text-xs font-normal text-muted-foreground">({match.status})</span>
                ) : null}
              </p>
              <p className="text-xs text-muted-foreground">Created on {formatCreatedAt(match.createdAt)}</p>
            </div>
            <button
              type="button"
              onClick={() => onViewInvoice?.(match)}
              className="text-muted-foreground hover:text-foreground"
              title="View invoice"
              data-testid={`duplicate-invoice-open-${match.id}`}
            >
              <Eye className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </DialogContent>
  </Dialog>
);

export default DuplicateInvoicesListDialog;
