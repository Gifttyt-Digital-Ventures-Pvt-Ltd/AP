import React, { useEffect, useState } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../components/ui/select";
import { FieldError } from "./CampaignShared";
import {
  formatCurrency,
  PAYMENT_MODE_LABELS,
  PAYMENT_MODES,
} from "../utils/campaignFormatters";

const MarkInvoicePaidModal = ({
  open,
  onOpenChange,
  row,
  onSubmit,
  saving,
}) => {
  const outstanding = Number(row?.outstanding ?? 0);
  const [form, setForm] = useState({
    amount: "",
    mode: "",
    referenceNo: "",
    paymentDate: "",
  });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (!open) return;
    setForm({
      amount: outstanding || "",
      mode: "",
      referenceNo: "",
      paymentDate: "",
    });
    setErrors({});
  }, [open, outstanding]);

  const validate = () => {
    const next = {};
    if (Number(form.amount) <= 0) next.amount = "Amount must be > 0";
    if (!form.mode) next.mode = "Mode of payment is required";
    if (!form.paymentDate) next.paymentDate = "Payment date is required";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;
    onSubmit?.({
      amount: Number(form.amount),
      mode: form.mode,
      referenceNo: form.referenceNo.trim() || undefined,
      paymentDate: form.paymentDate,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent onInteractOutside={(event) => event.preventDefault()}>
        <DialogHeader>
          <DialogTitle>Mark Invoice Paid</DialogTitle>
          <DialogDescription>
            Record the settlement payment for {row?.vendorName || "this vendor"}
            .
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-lg border border-border bg-muted/20 p-3 text-sm space-y-1">
          <p>
            <span className="text-muted-foreground">Invoice amount:</span>{" "}
            {formatCurrency(row?.invoice?.amount)}
          </p>
          <p>
            <span className="text-muted-foreground">Advances:</span>{" "}
            {formatCurrency(row?.advancesTotal)}
          </p>
          <p className="font-semibold">
            <span className="text-muted-foreground font-normal">
              Outstanding:
            </span>{" "}
            {formatCurrency(outstanding)}
          </p>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Amount (₹) *</Label>
            <Input
              type="number"
              value={form.amount}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, amount: event.target.value }))
              }
            />
            <FieldError>{errors.amount}</FieldError>
          </div>
          <div className="space-y-2">
            <Label>Mode of Payment *</Label>
            <Select
              value={form.mode}
              onValueChange={(value) =>
                setForm((prev) => ({ ...prev, mode: value }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select mode" />
              </SelectTrigger>
              <SelectContent>
                {PAYMENT_MODES.map((mode) => (
                  <SelectItem key={mode} value={mode}>
                    {PAYMENT_MODE_LABELS[mode]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FieldError>{errors.mode}</FieldError>
          </div>
          <div className="space-y-2">
            <Label>Reference No.</Label>
            <Input
              value={form.referenceNo}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  referenceNo: event.target.value,
                }))
              }
            />
          </div>
          <div className="space-y-2">
            <Label>Payment Date *</Label>
            <Input
              type="date"
              value={form.paymentDate}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  paymentDate: event.target.value,
                }))
              }
            />
            <FieldError>{errors.paymentDate}</FieldError>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={saving}>
            {saving ? "Saving..." : "Mark Paid"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default MarkInvoicePaidModal;
