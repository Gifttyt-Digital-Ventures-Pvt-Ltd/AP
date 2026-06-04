import React, { useEffect, useState } from "react";
import { Button } from "../../../components/ui/button";
import { Calendar } from "../../../components/ui/calendar";
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "../../../components/ui/popover";
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
  formatDate,
  PAYMENT_MODE_LABELS,
  PAYMENT_MODES,
} from "../utils/campaignFormatters";

const parseDateValue = (value) => {
  if (!value) return undefined;
  const [year, month, day] = String(value).split("-").map(Number);
  if (!year || !month || !day) return undefined;
  return new Date(year, month - 1, day);
};

const toDateValue = (date) => {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const sanitizeAmountInput = (value) => {
  const sanitized = String(value).replace(/[^\d.]/g, "");
  const [whole, ...decimalParts] = sanitized.split(".");
  return decimalParts.length ? `${whole}.${decimalParts.join("")}` : whole;
};

const campaignCalendarStartMonth = new Date(new Date().getFullYear() - 10, 0);
const campaignCalendarEndMonth = new Date(2099, 11);

const RecordAdvanceModal = ({
  open,
  onOpenChange,
  campaign,
  row,
  onSubmit,
  saving,
}) => {
  const outstandingAmount = Number(row?.outstanding || 0);
  const [form, setForm] = useState({
    amount: "",
    mode: "",
    referenceNo: "",
    paymentDate: "",
  });
  const [errors, setErrors] = useState({});
  const [paymentDateOpen, setPaymentDateOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    setForm({ amount: "", mode: "", referenceNo: "", paymentDate: "" });
    setErrors({});
    setPaymentDateOpen(false);
  }, [open]);

  const validate = () => {
    const next = {};
    const amount = Number(form.amount);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const paymentDate = parseDateValue(form.paymentDate);
    if (amount <= 0) next.amount = "Amount must be > 0";
    if (outstandingAmount > 0 && amount > outstandingAmount) {
      next.amount = `Amount cannot exceed outstanding amount ${formatCurrency(outstandingAmount)}`;
    }
    if (!form.mode) next.mode = "Mode of payment is required";
    if (!form.paymentDate) next.paymentDate = "Payment date is required";
    if (paymentDate && paymentDate > today) {
      next.paymentDate = "Payment date cannot be in the future";
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;
    onSubmit?.({
      vendorId: row.vendorId,
      amount: Number(form.amount),
      mode: form.mode,
      referenceNo: form.referenceNo.trim() || undefined,
      paymentDate: form.paymentDate,
    });
  };

  const handlePaymentDateSelect = (date) => {
    if (!date) return;
    setForm((prev) => ({ ...prev, paymentDate: toDateValue(date) }));
    setErrors((prev) => ({ ...prev, paymentDate: "" }));
    setPaymentDateOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent onInteractOutside={(event) => event.preventDefault()}>
        <DialogHeader>
          <DialogTitle>Record Advance</DialogTitle>
          <DialogDescription>
            Record a partial or full advance for this campaign vendor.
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-lg border border-border bg-muted/20 p-3 text-sm space-y-1">
          <p>
            <span className="text-muted-foreground">Campaign:</span>{" "}
            {campaign?.name || "-"}
          </p>
          <p>
            <span className="text-muted-foreground">Vendor:</span>{" "}
            {row?.vendorName || "-"}
          </p>
          <p>
            <span className="text-muted-foreground">Campaign cost:</span>{" "}
            {formatCurrency(row?.cost)}
          </p>
          <p>
            <span className="text-muted-foreground">Current advances:</span>{" "}
            {formatCurrency(row?.advancesTotal)}
          </p>
          <p>
            <span className="text-muted-foreground">Outstanding:</span>{" "}
            {formatCurrency(outstandingAmount)}
          </p>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Amount (₹) *</Label>
            <Input
              inputMode="decimal"
              value={form.amount}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  amount: sanitizeAmountInput(event.target.value),
                }))
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
            <Popover open={paymentDateOpen} onOpenChange={setPaymentDateOpen}>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  className="h-9 w-full justify-start text-left font-normal"
                >
                  {form.paymentDate
                    ? formatDate(form.paymentDate)
                    : "Select payment date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="z-[80] w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  captionLayout="dropdown"
                  navLayout="after"
                  startMonth={campaignCalendarStartMonth}
                  endMonth={campaignCalendarEndMonth}
                  selected={parseDateValue(form.paymentDate)}
                  onSelect={handlePaymentDateSelect}
                  disabled={(date) => {
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    return date > today;
                  }}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
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
            {saving ? "Saving..." : "Record Advance"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default RecordAdvanceModal;
