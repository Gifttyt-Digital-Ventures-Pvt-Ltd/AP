import React, { useEffect, useState } from "react";
import { Copy } from "lucide-react";
import { Button } from "../../../components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../../components/ui/dialog";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";
import { FieldError, CampaignStatusBadge } from "./CampaignShared";
import { formatCurrency, formatDate } from "../utils/campaignFormatters";

const ApproveCampaignModal = ({
  open,
  onOpenChange,
  campaign,
  onApprove,
  onStatus,
  saving,
}) => {
  const [referenceCode, setReferenceCode] = useState("");
  const [error, setError] = useState("");
  const [confirmAction, setConfirmAction] = useState(null);

  useEffect(() => {
    if (!open) return;
    setReferenceCode(campaign?.referenceCode || "");
    setError("");
    setConfirmAction(null);
  }, [open, campaign?.referenceCode]);

  const handleApprove = () => {
    if (!referenceCode.trim()) {
      setError("Reference code is required before approval");
      return;
    }
    onApprove?.({ referenceCode: referenceCode.trim() });
  };

  const handleStatus = (status) => {
    if (confirmAction !== status) {
      setConfirmAction(status);
      return;
    }
    onStatus?.({ status });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent onInteractOutside={(event) => event.preventDefault()}>
        <DialogHeader>
          <DialogTitle>Review Campaign</DialogTitle>
          <DialogDescription>
            Approve, reject, or send this campaign for correction.
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-lg border border-border bg-muted/20 p-4 space-y-2 text-sm">
          <div className="flex items-center justify-between">
            <p className="font-medium">{campaign?.name || "-"}</p>
            <CampaignStatusBadge status={campaign?.status} />
          </div>
          <p>
            <span className="text-muted-foreground">Created By:</span>{" "}
            {campaign?.createdBy || "-"}
          </p>
          <p>
            <span className="text-muted-foreground">Period:</span>{" "}
            {formatDate(campaign?.startDate)} - {formatDate(campaign?.endDate)}
          </p>
          <p>
            <span className="text-muted-foreground">Budget:</span>{" "}
            {formatCurrency(campaign?.budget)}
          </p>
          <p>
            <span className="text-muted-foreground">Total Cost:</span>{" "}
            {formatCurrency(campaign?.totalCost)}
          </p>
        </div>

        <div className="space-y-2">
          <Label>Reference Code *</Label>
          <div className="flex gap-2">
            <Input
              value={referenceCode}
              onChange={(event) => {
                setReferenceCode(event.target.value);
                setError("");
              }}
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => navigator.clipboard?.writeText(referenceCode)}
              disabled={!referenceCode}
            >
              <Copy className="h-4 w-4" />
            </Button>
          </div>
          <FieldError>{error}</FieldError>
        </div>

        {confirmAction && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            Click{" "}
            {confirmAction === "rejected" ? "Reject" : "Send for Correction"}{" "}
            again to confirm.
          </div>
        )}

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
            onClick={() => handleStatus("rejected")}
            disabled={saving}
          >
            Reject
          </Button>
          <Button
            variant="outline"
            onClick={() => handleStatus("correction_needed")}
            disabled={saving}
          >
            Send for Correction
          </Button>
          <Button onClick={handleApprove} disabled={saving}>
            {saving ? "Approving..." : "Approve"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ApproveCampaignModal;
