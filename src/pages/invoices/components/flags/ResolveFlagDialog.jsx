import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "../../../../components/ui/dialog";
import { Button } from "../../../../components/ui/button";
import { Textarea } from "../../../../components/ui/textarea";
import { Label } from "../../../../components/ui/label";
import { Badge } from "../../../../components/ui/badge";
import { INVOICE_FLAG_SEVERITY } from "../../constants/invoiceFlags";

const MIN_REASON_LENGTH = 5;

/** Modeled directly on pages/tax-management/components/gst/GstReconOverrideDialog.jsx. */
const ResolveFlagDialog = ({ flag, open, onOpenChange, onConfirm, submitting = false }) => {
  const [reason, setReason] = useState("");

  const handleOpenChange = (next) => {
    if (!next) setReason("");
    onOpenChange(next);
  };

  const handleConfirm = () => {
    onConfirm(reason.trim());
    setReason("");
  };

  const isBlocking =
    flag?.severity === INVOICE_FLAG_SEVERITY.MUST_FIX || flag?.severity === INVOICE_FLAG_SEVERITY.MUST_EXPLAIN;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Resolve Flag?</DialogTitle>
          <DialogDescription>Once resolved, this flag will be cleared and marked as Resolved.</DialogDescription>
        </DialogHeader>

        {flag ? (
          <Badge variant="outline" className="w-fit border-amber-300 bg-amber-50 text-amber-900">
            {flag.title}
          </Badge>
        ) : null}

        {/* Opt-in, per-flag — only Due Date Not Set sets this today. Generic
            rather than hardcoded to one flag key, so any future flag that
            needs the same "here's exactly what resolving will and won't do"
            clarity can reuse it the same way. */}
        {flag?.resolveWarning ? (
          <p className="text-sm text-muted-foreground">{flag.resolveWarning}</p>
        ) : null}

        <div className="space-y-1.5">
          <Label htmlFor="resolve-flag-reason" className="text-sm">
            Reason For Resolving This Flag <span className="text-destructive">*</span>
          </Label>
          <Textarea
            id="resolve-flag-reason"
            rows={4}
            maxLength={500}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="e.g. Confirmed with team that earlier invoice was cancelled."
            data-testid="resolve-flag-reason-input"
          />
          <div className="text-right text-xs text-muted-foreground">{reason.length}/500</div>
        </div>

        {isBlocking ? (
          <p className="text-xs text-muted-foreground">
            This flag is blocking submission. Your reason will be visible to the checker.
          </p>
        ) : null}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleConfirm}
            disabled={submitting || reason.trim().length < MIN_REASON_LENGTH}
            data-testid="resolve-flag-confirm"
          >
            Confirm
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ResolveFlagDialog;
