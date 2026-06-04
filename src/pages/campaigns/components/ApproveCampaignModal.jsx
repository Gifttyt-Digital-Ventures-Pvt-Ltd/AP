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
import { Textarea } from "../../../components/ui/textarea";
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
  const [remarks, setRemarks] = useState("");
  const [error, setError] = useState("");
  const [remarksError, setRemarksError] = useState("");
  const [statusAction, setStatusAction] = useState(null);

  useEffect(() => {
    if (!open) {
      setRemarks("");
      setRemarksError("");
      setStatusAction(null);
      return;
    }
    setReferenceCode(campaign?.referenceCode || "");
    setRemarks("");
    setError("");
    setRemarksError("");
    setStatusAction(null);
  }, [open, campaign?.referenceCode]);

  const handleApprove = () => {
    if (!referenceCode.trim()) {
      setError("Reference code is required before approval");
      return;
    }
    onApprove?.({ referenceCode: referenceCode.trim() });
  };

  const openStatusDialog = (status) => {
    setStatusAction(status);
    setRemarks("");
    setRemarksError("");
  };

  const closeStatusDialog = () => {
    if (saving) return;
    setStatusAction(null);
    setRemarks("");
    setRemarksError("");
  };

  const handleStatus = () => {
    if (!remarks.trim()) {
      setRemarksError("Remarks are required");
      return;
    }
    onStatus?.({ status: statusAction, remarks: remarks.trim() });
  };

  const statusActionLabel =
    statusAction === "rejected" ? "Reject Campaign" : "Send for Correction";

  return (
    <>
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
              onClick={() => openStatusDialog("rejected")}
              disabled={saving}
            >
              Reject
            </Button>
            <Button
              variant="outline"
              onClick={() => openStatusDialog("correction_needed")}
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

      <Dialog open={open && Boolean(statusAction)} onOpenChange={closeStatusDialog}>
        <DialogContent onInteractOutside={(event) => event.preventDefault()}>
          <DialogHeader>
            <DialogTitle>{statusActionLabel}</DialogTitle>
            <DialogDescription>
              Add remarks before updating this campaign status.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Label>Remarks *</Label>
            <Textarea
              value={remarks}
              onChange={(event) => {
                setRemarks(event.target.value);
                setRemarksError("");
              }}
              rows={4}
              placeholder={
                statusAction === "rejected"
                  ? "Enter rejection reason"
                  : "Enter correction details"
              }
            />
            <FieldError>{remarksError}</FieldError>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={closeStatusDialog}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              variant={statusAction === "rejected" ? "destructive" : "default"}
              onClick={handleStatus}
              disabled={saving}
            >
              {saving
                ? statusAction === "rejected"
                  ? "Rejecting..."
                  : "Sending..."
                : statusAction === "rejected"
                  ? "Reject"
              : "Send for Correction"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ApproveCampaignModal;
