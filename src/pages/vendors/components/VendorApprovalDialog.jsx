import React from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../../../components/ui/dialog';
import { Label } from '../../../components/ui/label';
import { Textarea } from '../../../components/ui/textarea';
import { NEEDS_CORRECTION_ACTION } from '../../../utils/approvalWorkflow';

const VendorApprovalDialog = ({
  open,
  onOpenChange,
  approvalTarget,
  approvalComments,
  onCommentsChange,
  onConfirm,
  confirming = false,
}) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent onInteractOutside={(event) => confirming && event.preventDefault()}>
      <DialogHeader>
        <DialogTitle>{approvalTarget?.action || 'Update'} Vendor</DialogTitle>
        <DialogDescription>
          Add optional comments and confirm the vendor approval action.
        </DialogDescription>
      </DialogHeader>
      {approvalTarget && (
        <div className="space-y-4">
          <div className="rounded-lg bg-muted p-4 text-sm">
            <p><strong>Vendor:</strong> {approvalTarget.vendor.name || '-'}</p>
            <p><strong>Action:</strong> {approvalTarget.action}</p>
          </div>
          <div className="space-y-2">
            <Label>Comments</Label>
            <Textarea
              value={approvalComments}
              onChange={(event) => onCommentsChange(event.target.value)}
              placeholder="Optional comments"
              rows={3}
              disabled={confirming}
              data-testid="vendor-approval-comments"
            />
          </div>
        </div>
      )}
      <DialogFooter>
        <Button variant="outline" onClick={() => onOpenChange(false)} disabled={confirming}>Cancel</Button>
        <Button
          onClick={onConfirm}
          disabled={confirming}
          variant={
            approvalTarget?.action === 'Rejected'
              ? 'destructive'
              : approvalTarget?.action === NEEDS_CORRECTION_ACTION
                ? 'outline'
                : 'default'
          }
          data-testid="confirm-vendor-approval"
        >
          {confirming ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          {confirming ? 'Updating…' : 'Confirm'}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
);

export default VendorApprovalDialog;
