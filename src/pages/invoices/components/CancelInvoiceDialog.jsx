import React from "react";
import { Loader2 } from "lucide-react";
import { Button } from "../../../components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../../components/ui/dialog";
import { Label } from "../../../components/ui/label";
import { Textarea } from "../../../components/ui/textarea";
import { isProformaInvoice } from "../constants/proformaInvoice";

const CancelInvoiceDialog = ({
  open,
  onOpenChange,
  invoice,
  reason,
  onReasonChange,
  onSubmit,
  submitting = false,
}) => {
  const isPi = Boolean(invoice) && isProformaInvoice(invoice);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-2rem)] max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isPi ? "Cancel Proforma Invoice" : "Cancel Invoice"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-md border border-border bg-muted/30 p-3 text-sm">
            <p className="font-medium text-foreground">
              {invoice?.invoiceNumber || "Selected invoice"}
            </p>
            <p className="mt-1 text-muted-foreground">
              {invoice?.vendorName || "-"}
            </p>
          </div>

          {isPi ? (
            <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
              Cancelling this proforma invoice will not cancel tax invoices already
              linked to it. Those invoices remain active unless cancelled separately.
            </p>
          ) : null}

          <div className="space-y-2">
            <Label htmlFor="cancel-invoice-reason">Cancellation reason *</Label>
            <Textarea
              id="cancel-invoice-reason"
              value={reason}
              onChange={(event) => onReasonChange(event.target.value)}
              placeholder="Add the reason for cancelling this invoice"
              rows={4}
              maxLength={500}
              disabled={submitting}
            />
            <p className="text-xs text-muted-foreground">
              This reason will be saved in invoice history.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
          >
            Keep invoice
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={onSubmit}
            disabled={submitting || reason.trim().length < 5}
          >
            {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isPi ? "Cancel proforma invoice" : "Cancel invoice"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CancelInvoiceDialog;
