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

const CancelInvoiceDialog = ({
  open,
  onOpenChange,
  invoice,
  reason,
  onReasonChange,
  onSubmit,
  submitting = false,
}) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="w-[calc(100vw-2rem)] max-w-md">
      <DialogHeader>
        <DialogTitle>Cancel Invoice</DialogTitle>
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
          Cancel invoice
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
);

export default CancelInvoiceDialog;
