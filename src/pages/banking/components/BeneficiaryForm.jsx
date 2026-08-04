import React, { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Loader2, ShieldCheck } from "lucide-react";
import { Button } from "../../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../../components/ui/card";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../components/ui/select";

const getAccountId = (account = {}, index = 0) =>
  String(account.id || account.accountId || account.accountNumber || index);

const getAccountLabel = (account = {}) => {
  const bank = account.bankName || account.bank || "Linked Bank";
  const accountNumber =
    account.maskedAccountNumber ||
    account.accountNumber ||
    account.account_number ||
    "Account";
  return `${bank} · ${accountNumber}`;
};

const emptyForm = {
  bankAccountId: "",
  name: "",
  accountNumber: "",
  ifsc: "",
  vendorId: "",
};

const BeneficiaryForm = ({
  accounts = [],
  canManage = false,
  validating = false,
  saving = false,
  onVerify,
  onSave,
}) => {
  const [form, setForm] = useState(() => ({
    ...emptyForm,
    bankAccountId: accounts[0] ? getAccountId(accounts[0], 0) : "",
  }));
  const [verifiedBeneficiary, setVerifiedBeneficiary] = useState(null);

  useEffect(() => {
    if (form.bankAccountId || !accounts[0]) return;
    setForm((prev) => ({ ...prev, bankAccountId: getAccountId(accounts[0], 0) }));
  }, [accounts, form.bankAccountId]);

  const selectedAccount = useMemo(
    () =>
      accounts.find((account, index) => getAccountId(account, index) === form.bankAccountId) ||
      null,
    [accounts, form.bankAccountId],
  );

  const updateForm = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setVerifiedBeneficiary(null);
  };

  const buildPayload = () => ({
    bankAccountId: form.bankAccountId,
    sourceAccountNumber:
      selectedAccount?.accountNumber || selectedAccount?.account_number || undefined,
    name: form.name.trim(),
    accountNumber: form.accountNumber.trim(),
    ifsc: form.ifsc.trim().toUpperCase(),
    vendorId: form.vendorId.trim() || undefined,
    payeeType: "ACCOUNT",
  });

  const handleVerify = async () => {
    const result = await onVerify?.(buildPayload());
    if (result) setVerifiedBeneficiary(result);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const saved = await onSave?.({
      ...buildPayload(),
      validationReference:
        verifiedBeneficiary?.validationReference ||
        verifiedBeneficiary?.referenceId ||
        verifiedBeneficiary?.correlationId,
      verified: Boolean(verifiedBeneficiary),
    });
    if (saved) {
      setForm({
        ...emptyForm,
        bankAccountId: accounts[0] ? getAccountId(accounts[0], 0) : "",
      });
      setVerifiedBeneficiary(null);
    }
  };

  const canVerify =
    canManage &&
    form.bankAccountId &&
    form.name.trim() &&
    form.accountNumber.trim() &&
    form.ifsc.trim().length === 11;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Beneficiary Details</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
          <div>
            <Label>Debit Account *</Label>
            <Select
              value={form.bankAccountId}
              onValueChange={(value) => updateForm("bankAccountId", value)}
              disabled={!canManage || accounts.length === 0}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select linked account" />
              </SelectTrigger>
              <SelectContent>
                {accounts.map((account, index) => (
                  <SelectItem key={getAccountId(account, index)} value={getAccountId(account, index)}>
                    {getAccountLabel(account)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="beneficiary-name">Beneficiary Name *</Label>
            <Input
              id="beneficiary-name"
              value={form.name}
              onChange={(event) => updateForm("name", event.target.value)}
              placeholder="Enter beneficiary name"
              disabled={!canManage}
              required
            />
          </div>

          <div>
            <Label htmlFor="beneficiary-account">Beneficiary Account Number *</Label>
            <Input
              id="beneficiary-account"
              value={form.accountNumber}
              onChange={(event) => updateForm("accountNumber", event.target.value)}
              placeholder="Enter beneficiary account number"
              disabled={!canManage}
              required
            />
          </div>

          <div>
            <Label htmlFor="beneficiary-ifsc">Beneficiary IFSC *</Label>
            <Input
              id="beneficiary-ifsc"
              value={form.ifsc}
              onChange={(event) => updateForm("ifsc", event.target.value.toUpperCase())}
              placeholder="e.g. HDFC0001234"
              disabled={!canManage}
              maxLength={11}
              required
            />
          </div>

          <div>
            <Label htmlFor="beneficiary-vendor">Vendor ID</Label>
            <Input
              id="beneficiary-vendor"
              value={form.vendorId}
              onChange={(event) => updateForm("vendorId", event.target.value)}
              placeholder="Optional vendor reference"
              disabled={!canManage}
            />
          </div>

          <div className="flex items-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleVerify}
              disabled={!canVerify || validating || saving}
            >
              {validating ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <ShieldCheck className="h-4 w-4 mr-2" />
              )}
              Verify
            </Button>
            <Button
              type="submit"
              disabled={!canVerify || !verifiedBeneficiary || validating || saving}
            >
              {saving ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <CheckCircle2 className="h-4 w-4 mr-2" />
              )}
              Save Beneficiary
            </Button>
          </div>

          {verifiedBeneficiary && (
            <p className="md:col-span-2 rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800">
              Beneficiary verified. You can save it now.
            </p>
          )}
        </form>
      </CardContent>
    </Card>
  );
};

export default BeneficiaryForm;
