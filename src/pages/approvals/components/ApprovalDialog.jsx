import React from 'react';
import { Button } from '../../../components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../../components/ui/dialog';
import { Label } from '../../../components/ui/label';
import { CheckCircle, Loader2, RotateCcw, XCircle } from 'lucide-react';
import { NEEDS_CORRECTION_ACTION } from '../../../utils/approvalWorkflow';
import { formatCurrency } from '../../../utils/currency';
import ClippedTextWithTooltip from '../../../components/common/ClippedTextWithTooltip';
import InvoiceDocumentTypeBadge from '../../invoices/components/InvoiceDocumentTypeBadge';
import { getDocumentTypeLabel } from '../../invoices/constants/proformaInvoice';
import AdvanceAdjustmentSection from './AdvanceAdjustmentSection';

// Confirmation dialog used for both approve and reject workflows.
const ApprovalDialog = ({
  dialogOpen,
  setDialogOpen,
  actionType,
  selectedInvoice,
  comments,
  setComments,
  submitApproval,
  isSubmitting = false,
  showAdvanceAdjustment = false,
  advanceAdjustmentProposal = null,
  isAdvanceAdjustmentLoading = false,
  isAdvanceAdjustmentError = false,
  isAdvanceAdjustmentConfirmed = false,
  isConfirmingAdvanceAdjustment = false,
  onConfirmAdvanceAdjustment,
}) => (
  <Dialog
    open={dialogOpen}
    onOpenChange={(open) => {
      if (!isSubmitting && !isConfirmingAdvanceAdjustment) setDialogOpen(open);
    }}
  >
    <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl" data-testid="approval-dialog">
      <DialogHeader>
        <DialogTitle>
          {actionType === 'Approved'
            ? `Approve ${getDocumentTypeLabel(selectedInvoice ?? {})}`
            : actionType === 'Checked'
              ? `Verify ${getDocumentTypeLabel(selectedInvoice ?? {})}`
              : actionType === NEEDS_CORRECTION_ACTION
                ? `Send ${getDocumentTypeLabel(selectedInvoice ?? {})} for Correction`
                : `Reject ${getDocumentTypeLabel(selectedInvoice ?? {})}`}
        </DialogTitle>
      </DialogHeader>
      <div className="space-y-4">
        {selectedInvoice && (
          <div className="bg-muted/50 rounded-lg p-4 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm text-muted-foreground">Type</span>
              <InvoiceDocumentTypeBadge invoice={selectedInvoice} />
            </div>
            <div className="flex min-w-0 items-center justify-between gap-2">
              <span className="shrink-0 text-sm text-muted-foreground">Vendor:</span>
              <ClippedTextWithTooltip
                text={selectedInvoice.vendorName}
                className="font-medium text-right"
                maxWidthClass="max-w-[220px]"
              />
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Amount:</span>
              <span className="  font-semibold">
                {formatCurrency(selectedInvoice.amount, selectedInvoice.currency)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Invoice #:</span>
              <span className=" ">{selectedInvoice.invoiceNumber}</span>
            </div>
          </div>
        )}

        {showAdvanceAdjustment && (
          <AdvanceAdjustmentSection
            proposal={advanceAdjustmentProposal}
            currency={selectedInvoice?.currency}
            isLoading={isAdvanceAdjustmentLoading}
            isError={isAdvanceAdjustmentError}
            isConfirmed={isAdvanceAdjustmentConfirmed}
            isConfirming={isConfirmingAdvanceAdjustment}
            onConfirm={onConfirmAdvanceAdjustment}
          />
        )}

        <div>
          <Label htmlFor="comments">Comments (Optional)</Label>
          <textarea
            id="comments"
            value={comments}
            onChange={(e) => setComments(e.target.value)}
            disabled={isSubmitting || isConfirmingAdvanceAdjustment}
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
            disabled={isSubmitting || isConfirmingAdvanceAdjustment}
            data-testid="approval-cancel"
          >
            Cancel
          </Button>
          <Button
            className="flex-1"
            onClick={submitApproval}
            disabled={isSubmitting || isConfirmingAdvanceAdjustment}
            data-testid="approval-confirm"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : actionType === 'Approved' || actionType === 'Checked' ? (
              <>
                <CheckCircle className="h-4 w-4 mr-2" />
                {actionType === 'Checked' ? 'Verify' : 'Approve'}
              </>
            ) : actionType === NEEDS_CORRECTION_ACTION ? (
              <>
                <RotateCcw className="h-4 w-4 mr-2" />
                Needs Correction
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
