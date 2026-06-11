import React, { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../../components/ui/dialog";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";

const AddBeneficiaryDialog = ({
  open,
  onOpenChange,
  vendor = null,
  onSubmit,
  submitting = false,
}) => {
  const [form, setForm] = useState({
    name: "",
    accountNumber: "",
    ifsc: "",
  });

  useEffect(() => {
    if (!open) return;
    setForm({
      name: vendor?.name || vendor?.account_holder_name || "",
      accountNumber: vendor?.account_number || "",
      ifsc: vendor?.ifsc_code || "",
    });
  }, [open, vendor]);

  const handleSubmit = (event) => {
    event.preventDefault();
    onSubmit?.({
      vendorId: vendor?.id,
      name: form.name.trim(),
      accountNumber: form.accountNumber.trim(),
      ifsc: form.ifsc.trim().toUpperCase(),
      payeeType: "ACCOUNT",
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Register Beneficiary</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="bene-name">Beneficiary Name *</Label>
            <Input
              id="bene-name"
              value={form.name}
              onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
              required
            />
          </div>
          <div>
            <Label htmlFor="bene-account">Account Number *</Label>
            <Input
              id="bene-account"
              value={form.accountNumber}
              onChange={(e) => setForm((prev) => ({ ...prev, accountNumber: e.target.value }))}
              required
            />
          </div>
          <div>
            <Label htmlFor="bene-ifsc">IFSC *</Label>
            <Input
              id="bene-ifsc"
              value={form.ifsc}
              onChange={(e) => setForm((prev) => ({ ...prev, ifsc: e.target.value }))}
              required
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Beneficiaries become payable ~30 minutes after successful registration.
          </p>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Register
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddBeneficiaryDialog;
