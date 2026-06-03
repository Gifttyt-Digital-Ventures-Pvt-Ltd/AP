import React, { useEffect, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "../../../components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../../components/ui/dialog";
import { Label } from "../../../components/ui/label";
import { Textarea } from "../../../components/ui/textarea";
import { FieldError } from "./CampaignShared";
import { formatCurrency, formatDate } from "../utils/campaignFormatters";

const InvoiceReviewModal = ({
  open,
  onOpenChange,
  row,
  stage,
  onSubmit,
  saving,
}) => {
  const [decision, setDecision] = useState(null);
  const [notes, setNotes] = useState("");
  const [confirmReject, setConfirmReject] = useState(false);
  const [error, setError] = useState("");
  const invoice = row?.invoice;

  useEffect(() => {
    if (!open) return;
    setDecision(null);
    setNotes("");
    setConfirmReject(false);
    setError("");
  }, [open]);

  const submitDecision = (nextDecision) => {
    setDecision(nextDecision);
    setError("");
    if (nextDecision === "REJECT" && !confirmReject) {
      setConfirmReject(true);
      return;
    }
    if (nextDecision === "REJECT" && !notes.trim()) {
      setError("Reject notes are required");
      return;
    }
    onSubmit?.({
      decision: nextDecision,
      notes: notes.trim() || undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-2xl max-h-[90vh] overflow-y-auto"
        onInteractOutside={(event) => event.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>
            {stage === "checker" ? "Check Invoice" : "Approve Invoice"}
          </DialogTitle>
          <DialogDescription>
            Review invoice details before making a decision.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 rounded-lg border border-border bg-muted/20 p-4 text-sm">
          <p>
            <span className="text-muted-foreground">Vendor:</span>{" "}
            {row?.vendorName || "-"}
          </p>
          <p>
            <span className="text-muted-foreground">Invoice No:</span>{" "}
            {invoice?.invoiceNumber || "—"}
          </p>
          <p>
            <span className="text-muted-foreground">Amount:</span>{" "}
            {formatCurrency(invoice?.amount)}
          </p>
          <p>
            <span className="text-muted-foreground">Submitted:</span>{" "}
            {formatDate(invoice?.submittedDate)}
          </p>
          <p>
            <span className="text-muted-foreground">Submitted By:</span>{" "}
            {invoice?.submittedBy || "-"}
          </p>
          <p>
            <span className="text-muted-foreground">Advances:</span>{" "}
            {formatCurrency(row?.advancesTotal)}
          </p>
        </div>

        {stage === "approver" && (
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900">
            If advances fully cover this invoice, approving will mark it Paid;
            otherwise it moves to Pending Payment.
          </div>
        )}

        {confirmReject && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-900 flex gap-2">
            <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
            Confirm rejection by entering notes and clicking Reject again.
          </div>
        )}

        <div className="space-y-2">
          <Label>Notes {confirmReject ? "*" : ""}</Label>
          <Textarea
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            rows={3}
            placeholder="Required when rejecting"
          />
          <FieldError>{error}</FieldError>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={() => submitDecision("REJECT")}
            disabled={saving}
          >
            {decision === "REJECT" && saving ? "Rejecting..." : "Reject"}
          </Button>
          <Button onClick={() => submitDecision("APPROVE")} disabled={saving}>
            {decision === "APPROVE" && saving ? "Approving..." : "Approve"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default InvoiceReviewModal;
