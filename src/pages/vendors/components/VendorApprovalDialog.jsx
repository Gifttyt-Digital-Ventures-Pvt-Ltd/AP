import React from 'react';
import { Button } from '../../../components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../../../components/ui/dialog';
import { Label } from '../../../components/ui/label';
import { Textarea } from '../../../components/ui/textarea';

const VendorApprovalDialog = ({
  open,
  onOpenChange,
  approvalTarget,
  approvalComments,
  onCommentsChange,
  onConfirm,
}) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent>
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
              data-testid="vendor-approval-comments"
            />
          </div>
        </div>
      )}
      <DialogFooter>
        <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
        <Button
          onClick={onConfirm}
          variant={approvalTarget?.action === 'Rejected' ? 'destructive' : 'default'}
          data-testid="confirm-vendor-approval"
        >
          Confirm
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
);

export default VendorApprovalDialog;
