import React from "react";
import { CheckCircle, Loader2, XCircle } from "lucide-react";
import { Button } from "../../../components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "../../../components/ui/dialog";
import { Label } from "../../../components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../../components/ui/select";
import { Textarea } from "../../../components/ui/textarea";

const PoApprovalDialog = ({
  showApprovalDialog,
  setShowApprovalDialog,
  selectedPO,
  formatCurrency,
  approvalForm,
  setApprovalForm,
  handleApproval,
  submitting,
  canApprovePo,
}) => {
  return (
    <Dialog open={showApprovalDialog} onOpenChange={setShowApprovalDialog}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Review Purchase Order</DialogTitle>
        </DialogHeader>

        {selectedPO && (
          <div className="space-y-4">
            <div className="p-4 bg-muted rounded-lg">
              <p><strong>PO Number:</strong> {selectedPO.po_number}</p>
              <p><strong>Vendor:</strong> {selectedPO.vendor_name}</p>
              <p><strong>Amount:</strong> {formatCurrency(selectedPO.total_amount)}</p>
              <p><strong>Current Level:</strong> {selectedPO.current_approval_level}</p>
            </div>

            <div className="space-y-2">
              <Label>Decision</Label>
              <Select value={approvalForm.action} onValueChange={(v) => setApprovalForm((prev) => ({ ...prev, action: v }))}>
                <SelectTrigger data-testid="approval-action-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Approved">Approve</SelectItem>
                  <SelectItem value="Rejected">Reject</SelectItem>
                  <SelectItem value="Sent Back">Send Back for Revision</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Comments</Label>
              <Textarea
                value={approvalForm.comments}
                onChange={(e) => setApprovalForm((prev) => ({ ...prev, comments: e.target.value }))}
                placeholder="Add your comments..."
                data-testid="approval-comments-input"
              />
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => setShowApprovalDialog(false)}>Cancel</Button>
          <Button
            onClick={handleApproval}
            disabled={submitting || !canApprovePo}
            variant={approvalForm.action === "Rejected" ? "destructive" : "default"}
            data-testid="confirm-approval-btn"
          >
            {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {approvalForm.action === "Approved" && <CheckCircle className="h-4 w-4 mr-2" />}
            {approvalForm.action === "Rejected" && <XCircle className="h-4 w-4 mr-2" />}
            {approvalForm.action}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PoApprovalDialog;
