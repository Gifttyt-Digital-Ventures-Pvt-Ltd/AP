import React from 'react';
import { Button } from '../../../components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../../components/ui/dialog';
import { Label } from '../../../components/ui/label';
import { CheckCircle, XCircle } from 'lucide-react';

// Confirmation dialog used for both approve and reject workflows.
const ApprovalDialog = ({
  dialogOpen,
  setDialogOpen,
  actionType,
  selectedInvoice,
  comments,
  setComments,
  submitApproval,
}) => (
  <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
    <DialogContent data-testid="approval-dialog">
      <DialogHeader>
        <DialogTitle>{actionType === 'Approved' ? 'Approve Invoice' : 'Reject Invoice'}</DialogTitle>
      </DialogHeader>
      <div className="space-y-4">
        {selectedInvoice && (
          <div className="bg-muted/50 rounded-lg p-4 space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Vendor:</span>
              <span className="font-medium">{selectedInvoice.vendor_name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Amount:</span>
              <span className="font-['JetBrains_Mono'] font-semibold">
                {selectedInvoice.currency} {selectedInvoice.amount.toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Invoice #:</span>
              <span className="font-['JetBrains_Mono']">{selectedInvoice.invoice_number}</span>
            </div>
          </div>
        )}

        <div>
          <Label htmlFor="comments">Comments (Optional)</Label>
          <textarea
            id="comments"
            value={comments}
            onChange={(e) => setComments(e.target.value)}
            className="w-full min-h-[80px] rounded-md border border-input bg-background px-3 py-2 text-sm"
            placeholder="Add any comments..."
            data-testid="approval-comments"
          />
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => setDialogOpen(false)}
            data-testid="approval-cancel"
          >
            Cancel
          </Button>
          <Button className="flex-1" onClick={submitApproval} data-testid="approval-confirm">
            {actionType === 'Approved' ? (
              <>
                <CheckCircle className="h-4 w-4 mr-2" />
                Approve
              </>
            ) : (
              <>
                <XCircle className="h-4 w-4 mr-2" />
                Reject
              </>
            )}
          </Button>
        </div>
      </div>
    </DialogContent>
  </Dialog>
);

export default ApprovalDialog;
