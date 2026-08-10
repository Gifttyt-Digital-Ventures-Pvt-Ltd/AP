import React, { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useCreateVendorAdvanceMutation } from "../../../Services/apis/vendorAdvancesApi";
import { Button } from "../../../components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "../../../components/ui/dialog";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";
import { Textarea } from "../../../components/ui/textarea";
import { formatCurrency } from "../../../utils/currency";
import { extractApiErrorDetail } from "../../../utils/approvalWorkflow";

const getPoId = (po) => {
  const source = po || {};
  return source.id ?? source.po_id ?? source.poId;
};

const getVendorId = (po) => {
  const source = po || {};
  return source.vendor_id ?? source.vendorId;
};

const RaiseAdvanceDialog = ({
  open,
  onOpenChange,
  purchaseOrder,
}) => {
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [createVendorAdvance, { isLoading }] = useCreateVendorAdvanceMutation();

  useEffect(() => {
    if (!open) {
      setAmount("");
      setReason("");
    }
  }, [open]);

  const poContext = useMemo(() => {
    const poId = getPoId(purchaseOrder);
    const vendorId = getVendorId(purchaseOrder);
    return {
      poId,
      vendorId,
      poNumber: purchaseOrder?.po_number ?? purchaseOrder?.poNumber ?? "-",
      vendorName: purchaseOrder?.vendor_name ?? purchaseOrder?.vendorName ?? "-",
      currency: purchaseOrder?.currency || "INR",
    };
  }, [purchaseOrder]);

  const handleSubmit = async () => {
    if (!poContext.poId) {
      toast.error("Purchase order id is missing. Vendor advance cannot be raised.");
      return;
    }
    if (!poContext.vendorId) {
      toast.error("Vendor id is missing on this purchase order. Vendor advance cannot be raised.");
      return;
    }
    if (!(Number(amount) > 0)) {
      toast.error("Enter an advance amount greater than zero");
      return;
    }
    if (!String(reason || "").trim()) {
      toast.error("Enter a reason for this advance");
      return;
    }

    try {
      await createVendorAdvance({
        poId: poContext.poId,
        vendorId: poContext.vendorId,
        requestedAmount: Number(amount),
        reason: String(reason).trim(),
      }).unwrap();
      toast.success("Vendor advance request raised");
      onOpenChange(false);
    } catch (error) {
      toast.error(extractApiErrorDetail(error) || "Failed to raise vendor advance");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Raise Advance</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid gap-3 rounded-lg border bg-slate-50/60 p-4 sm:grid-cols-2">
            <div>
              <p className="text-xs text-muted-foreground">Vendor</p>
              <p className="mt-0.5 text-sm font-medium">{poContext.vendorName}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">PO</p>
              <p className="mt-0.5 text-sm font-medium">{poContext.poNumber}</p>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="vendor-advance-amount">Amount</Label>
            <Input
              id="vendor-advance-amount"
              type="number"
              min="0"
              step="0.01"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              placeholder={formatCurrency(0, poContext.currency)}
              data-testid="vendor-advance-amount-input"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="vendor-advance-reason">Reason</Label>
            <Textarea
              id="vendor-advance-reason"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              rows={3}
              placeholder="Reason for requesting this vendor advance"
              data-testid="vendor-advance-reason-input"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading} data-testid="confirm-raise-advance-btn">
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Raise Advance
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default RaiseAdvanceDialog;
