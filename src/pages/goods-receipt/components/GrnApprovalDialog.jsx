import { CheckCircle2, Loader2, RotateCcw, XCircle } from 'lucide-react';
import { Button } from '../../../components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../../components/ui/dialog';
import { Label } from '../../../components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../components/ui/select';
import { Textarea } from '../../../components/ui/textarea';
import { GRN_APPROVAL_ACTION } from '../constants';
import { formatCurrency, formatDate } from '../utils';

const GrnApprovalDialog = ({
  open,
  onOpenChange,
  grn,
  approvalForm,
  setApprovalForm,
  onSubmit,
  submitting = false,
  canApprove = false,
}) => {
  const requiresComments =
    approvalForm.action === GRN_APPROVAL_ACTION.REJECTED ||
    approvalForm.action === GRN_APPROVAL_ACTION.SENT_BACK;

  const confirmLabel =
    approvalForm.action === GRN_APPROVAL_ACTION.APPROVED
      ? 'Approve'
      : approvalForm.action === GRN_APPROVAL_ACTION.REJECTED
        ? 'Reject'
        : 'Send Back';

  const confirmVariant =
    approvalForm.action === GRN_APPROVAL_ACTION.REJECTED ? 'destructive' : 'default';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-testid="grn-approval-dialog">
        <DialogHeader>
          <DialogTitle>Review Goods Receipt</DialogTitle>
        </DialogHeader>

        {grn && (
          <div className="space-y-4">
            <div className="rounded-lg bg-muted p-4 text-sm">
              <p>
                <strong>GRN:</strong> {grn.grn_number}
              </p>
              <p>
                <strong>Vendor:</strong> {grn.vendor_name || '—'}
              </p>
              <p>
                <strong>Date:</strong> {formatDate(grn.receipt_date)}
              </p>
              {grn.po_number && (
                <p>
                  <strong>PO:</strong> {grn.po_number}
                </p>
              )}
              <p>
                <strong>Value:</strong> {formatCurrency(grn.total_received_value)}
              </p>
            </div>

            <div className="space-y-2">
              <Label>Decision</Label>
              <Select
                value={approvalForm.action}
                onValueChange={(value) =>
                  setApprovalForm((current) => ({ ...current, action: value }))
                }
              >
                <SelectTrigger data-testid="grn-approval-action-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={GRN_APPROVAL_ACTION.APPROVED}>Approve</SelectItem>
                  <SelectItem value={GRN_APPROVAL_ACTION.SENT_BACK}>
                    Send Back for Revision
                  </SelectItem>
                  <SelectItem value={GRN_APPROVAL_ACTION.REJECTED}>Reject</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{requiresComments ? 'Comments *' : 'Comments'}</Label>
              <Textarea
                value={approvalForm.comments}
                onChange={(event) =>
                  setApprovalForm((current) => ({ ...current, comments: event.target.value }))
                }
                placeholder={
                  approvalForm.action === GRN_APPROVAL_ACTION.SENT_BACK
                    ? 'What should the maker correct before resubmitting?'
                    : 'Add your comments...'
                }
                data-testid="grn-approval-comments-input"
              />
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={onSubmit}
            disabled={
              submitting ||
              !canApprove ||
              (requiresComments && !approvalForm.comments.trim())
            }
            variant={confirmVariant}
            data-testid="grn-confirm-approval-btn"
          >
            {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {approvalForm.action === GRN_APPROVAL_ACTION.APPROVED && (
              <CheckCircle2 className="mr-2 h-4 w-4" />
            )}
            {approvalForm.action === GRN_APPROVAL_ACTION.REJECTED && (
              <XCircle className="mr-2 h-4 w-4" />
            )}
            {approvalForm.action === GRN_APPROVAL_ACTION.SENT_BACK && (
              <RotateCcw className="mr-2 h-4 w-4" />
            )}
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default GrnApprovalDialog;
