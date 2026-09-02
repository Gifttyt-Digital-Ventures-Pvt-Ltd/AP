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

const MIN_REASON_LENGTH = 5;

/** Reviewer-only counterpart to ResolveFlagDialog.jsx — same reason-required shape. */
const ReopenFlagDialog = ({ flag, open, onOpenChange, onConfirm, submitting = false }) => {
  const [reason, setReason] = useState("");

  const handleOpenChange = (next) => {
    if (!next) setReason("");
    onOpenChange(next);
  };

  const handleConfirm = () => {
    onConfirm(reason.trim());
    setReason("");
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Reopen Flag?</DialogTitle>
          <DialogDescription>
            This sends the flag back to Active. The maker will need to address it again.
          </DialogDescription>
        </DialogHeader>

        {flag ? (
          <Badge variant="outline" className="w-fit border-amber-300 bg-amber-50 text-amber-900">
            {flag.title}
          </Badge>
        ) : null}

        <div className="space-y-1.5">
          <Label htmlFor="reopen-flag-reason" className="text-sm">
            Reason For Reopening This Flag <span className="text-destructive">*</span>
          </Label>
          <Textarea
            id="reopen-flag-reason"
            rows={4}
            maxLength={500}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="e.g. The explanation given doesn't account for the amount difference."
            data-testid="reopen-flag-reason-input"
          />
          <div className="text-right text-xs text-muted-foreground">{reason.length}/500</div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleConfirm}
            disabled={submitting || reason.trim().length < MIN_REASON_LENGTH}
            data-testid="reopen-flag-confirm"
          >
            Confirm
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ReopenFlagDialog;
