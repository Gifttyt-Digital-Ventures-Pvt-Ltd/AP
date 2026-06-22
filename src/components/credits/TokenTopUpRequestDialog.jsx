import { useMemo, useState } from "react";
import { Copy, Landmark } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRequestClientTokenTopUpMutation } from "@/Services/apis/creditsApi";

const PAYMENT_DETAILS = [
  { label: "Bank Name", value: "ICICI Bank LTD" },
  { label: "Account Name", value: "GIFTRYTDIGITAL VENTURES PRIVATE LIMITED" },
  { label: "Account Number", value: "428905001531" },
  { label: "IFSC Code", value: "ICIC0004289" },
];

const initialForm = {
  amount: "",
  utr: "",
  accountNumber: "",
};

const amountPattern = /^\d+(\.\d{0,2})?$/;

const TokenTopUpRequestDialog = ({ open, onOpenChange, onRequested }) => {
  const [form, setForm] = useState(initialForm);
  const [errors, setErrors] = useState({});
  const [requestTopUp, { isLoading }] = useRequestClientTokenTopUpMutation();

  const amountPreview = useMemo(() => {
    if (!amountPattern.test(form.amount)) return null;
    const value = Number(form.amount);
    if (!Number.isFinite(value) || value <= 0) return null;
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  }, [form.amount]);

  const updateField = (field, value) => {
    if (field === "amount" && value !== "" && !amountPattern.test(value)) return;
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: "" }));
  };

  const reset = () => {
    setForm(initialForm);
    setErrors({});
  };

  const close = (nextOpen) => {
    if (!nextOpen) reset();
    onOpenChange(nextOpen);
  };

  const copyPaymentValue = async (value, label) => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(`${label} copied`);
    } catch {
      toast.error("Unable to copy");
    }
  };

  const validate = () => {
    const nextErrors = {};
    const amountValue = Number(form.amount);

    if (!form.amount.trim()) {
      nextErrors.amount = "Payment amount is required";
    } else if (!amountPattern.test(form.amount) || !Number.isFinite(amountValue) || amountValue <= 0) {
      nextErrors.amount = "Enter a valid payment amount";
    }

    if (!form.utr.trim()) nextErrors.utr = "UTR is required";
    if (!form.accountNumber.trim()) nextErrors.accountNumber = "Account number is required";

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const submit = async () => {
    if (!validate()) return;

    try {
      const amount = Number(form.amount).toFixed(2);
      await requestTopUp({
        amount,
        utr: form.utr.trim(),
        accountNumber: form.accountNumber.trim(),
      }).unwrap();

      toast.success("Token request submitted for verification");
      reset();
      onOpenChange(false);
      onRequested?.();
    } catch (error) {
      toast.error(error?.data?.detail || error?.data?.message || "Failed to submit token request");
    }
  };

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10 text-primary">
              <Landmark className="h-5 w-5" />
            </span>
            <div>
              <DialogTitle>Request tokens</DialogTitle>
              <DialogDescription>
                Transfer funds to Optifii, then submit the payment reference for verification.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-5">
          <div className="rounded-md border bg-muted/30 p-4">
            <div className="grid gap-3 sm:grid-cols-2">
              {PAYMENT_DETAILS.map((item) => (
                <div key={item.label} className="rounded-md border bg-background p-3">
                  <p className="text-xs text-muted-foreground">{item.label}</p>
                  <div className="mt-1 flex items-center justify-between gap-2">
                    <p className="break-all text-sm font-medium">{item.value}</p>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 shrink-0"
                      onClick={() => copyPaymentValue(item.value, item.label)}
                      aria-label={`Copy ${item.label}`}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="token-topup-amount">Payment amount</Label>
              <Input
                id="token-topup-amount"
                inputMode="decimal"
                placeholder="5000.00"
                value={form.amount}
                onChange={(event) => updateField("amount", event.target.value)}
                aria-invalid={Boolean(errors.amount)}
              />
              {errors.amount ? <p className="text-xs text-destructive">{errors.amount}</p> : null}
            </div>
            <div className="space-y-2">
              <Label htmlFor="token-topup-utr">UTR</Label>
              <Input
                id="token-topup-utr"
                placeholder="Enter UTR"
                value={form.utr}
                onChange={(event) => updateField("utr", event.target.value)}
                aria-invalid={Boolean(errors.utr)}
              />
              {errors.utr ? <p className="text-xs text-destructive">{errors.utr}</p> : null}
            </div>
            <div className="space-y-2">
              <Label htmlFor="token-topup-account">Paid from account</Label>
              <Input
                id="token-topup-account"
                placeholder="Account number"
                value={form.accountNumber}
                onChange={(event) => updateField("accountNumber", event.target.value)}
                aria-invalid={Boolean(errors.accountNumber)}
              />
              {errors.accountNumber ? <p className="text-xs text-destructive">{errors.accountNumber}</p> : null}
            </div>
          </div>

          <p className="text-sm text-muted-foreground">
            {amountPreview
              ? `${amountPreview} will be requested. Tokens are credited after Optifii verifies the transfer.`
              : "Tokens are credited after Optifii verifies the transfer and applies your configured token price."}
          </p>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => close(false)} disabled={isLoading}>
            Cancel
          </Button>
          <Button type="button" onClick={submit} disabled={isLoading}>
            {isLoading ? "Submitting..." : "Submit request"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default TokenTopUpRequestDialog;
