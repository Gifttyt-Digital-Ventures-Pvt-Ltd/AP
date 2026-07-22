import React, { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '../../../../components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../../../components/ui/dialog';
import { Label } from '../../../../components/ui/label';
import { Textarea } from '../../../../components/ui/textarea';

const MIN_REASON_LENGTH = 5;

/** FE §5 — manual override modal: current status → `Matched · Manual`, mandatory reason. */
const GstReconOverrideDialog = ({ open, onOpenChange, currentStatus, onSubmit, submitting = false }) => {
  const [reason, setReason] = useState('');

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) setReason('');
        onOpenChange(next);
      }}
    >
      <DialogContent className="w-[calc(100vw-2rem)] max-w-md">
        <DialogHeader>
          <DialogTitle>Override reconciliation status</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            This marks the invoice <span className="font-medium text-foreground">Matched · Manual</span>, overriding
            its current status of <span className="font-medium text-foreground">{currentStatus}</span>.
          </p>

          <div className="space-y-2">
            <Label htmlFor="gst-recon-override-reason">Reason *</Label>
            <Textarea
              id="gst-recon-override-reason"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder="Explain why this invoice should be treated as matched"
              rows={4}
              maxLength={500}
              disabled={submitting}
            />
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button
            type="button"
            onClick={() => onSubmit(reason.trim())}
            disabled={submitting || reason.trim().length < MIN_REASON_LENGTH}
          >
            {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Confirm override
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default GstReconOverrideDialog;
