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

const MANUAL_ACCOUNT_VALUE = "__manual_bank_account__";

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

const getVendorId = (vendor = {}, index = 0) =>
  String(vendor.id ?? vendor.vendorId ?? vendor.vendor_id ?? index);

const getVendorLabel = (vendor = {}) => {
  const name =
    vendor.vendorName ||
    vendor.vendor_name ||
    vendor.vendorDisplayName ||
    vendor.vendor_display_name ||
    vendor.name ||
    vendor.beneficiaryName ||
    vendor.beneficiary_name ||
    "Vendor";
  const code = vendor.vendorId || vendor.vendor_id;
  return code ? `${name}` : name;
};

const getVendorBankAccountId = (account = {}, index = 0) =>
  String(account.id || account.accountId || account.bankAccountId || account.accountNumber || index);

const getVendorBankAccountLabel = (account = {}) => {
  const bank = account.bankName || account.bank_name || account.bank || "Bank";
  const accountNumber = account.accountNumber || account.account_number || "Account";
  const ifsc = account.ifscCode || account.ifsc_code || account.ifsc || "IFSC";
  return `${bank} · ${accountNumber} · ${ifsc}`;
};

const normalizeVendorBankAccounts = (vendor = {}) => {
  if (!vendor || typeof vendor !== "object") return [];
  const accounts = vendor.bankAccounts || vendor.bank_accounts || vendor.vendorBankAccounts || vendor.vendor_bank_accounts || [];
  const normalizedAccounts = Array.isArray(accounts) ? accounts : [];
  if (normalizedAccounts.length > 0) return normalizedAccounts;

  const accountNumber =
    vendor.accountNumber ||
    vendor.account_number ||
    vendor.creditAccountNumber;
  const ifsc = vendor.ifscCode || vendor.ifsc_code || vendor.ifsc;
  const bankName = vendor.bankName || vendor.bank_name || vendor.bank;
  if (!accountNumber && !ifsc && !bankName) return [];

  return [{
    id:
      vendor.vendorBankAccountId ||
      vendor.vendor_bank_account_id ||
      vendor.bankAccountId ||
      vendor.bank_account_id ||
      vendor.bnfId ||
      vendor.id ||
      `${vendor.vendorId || vendor.vendor_id || "vendor"}-default-bank`,
    bankName,
    accountNumber,
    ifscCode: ifsc,
    accountHolderName:
      vendor.accountHolderName ||
      vendor.account_holder_name ||
      vendor.name ||
      vendor.beneficiaryName ||
      vendor.beneficiary_name,
    beneficiaryStatus: vendor.beneficiaryStatus || vendor.beneficiary_status || vendor.status,
  }];
};

const isVendorBankAccountUnverified = (account = {}, beneficiaries = [], vendorId) => {
  const accountNumber = String(account.accountNumber || account.account_number || "").trim();
  const ifsc = String(account.ifscCode || account.ifsc_code || account.ifsc || "").trim().toUpperCase();
  const linkedBeneficiary = beneficiaries.find((beneficiary) => {
    const sameVendor = String(beneficiary.vendorId || beneficiary.vendor_id || "") === String(vendorId);
    const sameAccount = String(beneficiary.accountNumber || beneficiary.account_number || "").trim() === accountNumber;
    const sameIfsc = String(beneficiary.ifsc || beneficiary.ifscCode || beneficiary.ifsc_code || "").trim().toUpperCase() === ifsc;
    return sameVendor && sameAccount && sameIfsc;
  });
  if (!linkedBeneficiary) return true;
  return !["ACTIVE", "VERIFIED", "SUCCESS"].includes(String(linkedBeneficiary.status || "").toUpperCase());
};

const emptyForm = {
  bankAccountId: "",
  vendorBankAccountId: "",
  name: "",
  bankName: "",
  accountNumber: "",
  ifsc: "",
  vendorId: "",
};

const BeneficiaryForm = ({
  accounts = [],
  vendors = [],
  beneficiaries = [],
  canManage = false,
  validating = false,
  saving = false,
  onVerify,
  onSave,
  framed = true,
}) => {
  const [form, setForm] = useState(() => ({
    ...emptyForm,
    bankAccountId: accounts[0] ? getAccountId(accounts[0], 0) : "",
  }));
  const [verifiedBeneficiary, setVerifiedBeneficiary] = useState(null);
  const [vendorSearch, setVendorSearch] = useState("");

  const selectedVendor = useMemo(
    () => vendors.find((vendor, index) => getVendorId(vendor, index) === form.vendorId) || null,
    [form.vendorId, vendors],
  );

  const filteredVendors = useMemo(() => {
    const query = vendorSearch.trim().toLowerCase();
    if (!query) return vendors;
    return vendors.filter((vendor) => {
      const label = getVendorLabel(vendor).toLowerCase();
      const code = String(vendor.vendorId || vendor.vendor_id || vendor.id || "").toLowerCase();
      const pan = String(vendor.pan || "").toLowerCase();
      return label.includes(query) || code.includes(query) || pan.includes(query);
    });
  }, [vendorSearch, vendors]);

  const selectedVendorAccounts = useMemo(
    () => normalizeVendorBankAccounts(selectedVendor),
    [selectedVendor],
  );

  const unverifiedVendorAccounts = useMemo(
    () =>
      selectedVendorAccounts.filter((account) =>
        isVendorBankAccountUnverified(account, beneficiaries, form.vendorId),
      ),
    [beneficiaries, form.vendorId, selectedVendorAccounts],
  );

  const selectedVendorBankAccount = useMemo(
    () =>
      selectedVendorAccounts.find(
        (account, index) => getVendorBankAccountId(account, index) === form.vendorBankAccountId,
      ) || null,
    [form.vendorBankAccountId, selectedVendorAccounts],
  );

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

  const updateVendor = (vendorId) => {
    const vendor = vendors.find((item, index) => getVendorId(item, index) === vendorId);
    setForm((prev) => ({
      ...prev,
      vendorId,
      vendorBankAccountId: "",
      name: vendor?.name || vendor?.vendorName || vendor?.vendor_name || "",
      bankName: "",
      accountNumber: "",
      ifsc: "",
    }));
    setVerifiedBeneficiary(null);
  };

  const updateVendorBankAccount = (accountId) => {
    if (accountId === MANUAL_ACCOUNT_VALUE) {
      setForm((prev) => ({
        ...prev,
        vendorBankAccountId: "",
        bankName: "",
        accountNumber: "",
        ifsc: "",
      }));
      setVerifiedBeneficiary(null);
      return;
    }

    const account = selectedVendorAccounts.find(
      (item, index) => getVendorBankAccountId(item, index) === accountId,
    );
    setForm((prev) => ({
      ...prev,
      vendorBankAccountId: accountId,
      bankName: account?.bankName || account?.bank_name || account?.bank || "",
      accountNumber: account?.accountNumber || account?.account_number || "",
      ifsc: account?.ifscCode || account?.ifsc_code || account?.ifsc || "",
      name: account?.accountHolderName || account?.account_holder_name || prev.name,
    }));
    setVerifiedBeneficiary(null);
  };

  const buildPayload = () => ({
    bankAccountId: form.bankAccountId,
    sourceAccountNumber:
      selectedAccount?.accountNumber || selectedAccount?.account_number || undefined,
    name: form.name.trim(),
    bankName: form.bankName.trim() || undefined,
    accountNumber: form.accountNumber.trim(),
    ifsc: form.ifsc.trim().toUpperCase(),
    vendorId:
      (selectedVendor?.vendorId ??
        selectedVendor?.vendor_id ??
        form.vendorId.trim()) ||
      undefined,
    vendorBankAccountId: form.vendorBankAccountId || undefined,
    addToVendor: !form.vendorBankAccountId,
    payeeType: "ACCOUNT",
  });

  const handleVerify = async () => {
    const payload = buildPayload();
    const result = await onVerify?.(payload);
    if (!result) return;

    setVerifiedBeneficiary(result);
    const saved = await onSave?.({
      ...payload,
      validationReference:
        result.validationReference ||
        result.referenceId ||
        result.correlationId,
      verified: true,
    });
    if (saved) {
      setForm({
        ...emptyForm,
        bankAccountId: accounts[0] ? getAccountId(accounts[0], 0) : "",
      });
      setVerifiedBeneficiary(null);
    }
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
    form.vendorId &&
    form.name.trim() &&
    form.accountNumber.trim() &&
    form.ifsc.trim().length === 11;

  const formContent = (
    <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
      <div className="md:col-span-2">
        <Label>Vendor *</Label>
        <Select
          value={form.vendorId}
          onValueChange={updateVendor}
          disabled={!canManage || vendors.length === 0}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select vendor" />
          </SelectTrigger>
          <SelectContent>
            <div className="sticky top-0 z-10 bg-popover p-2">
              <Input
                value={vendorSearch}
                onChange={(event) => setVendorSearch(event.target.value)}
                onKeyDown={(event) => event.stopPropagation()}
                placeholder="Search vendor..."
                className="h-8"
              />
            </div>
            {filteredVendors.length > 0 ? filteredVendors.map((vendor, index) => (
              <SelectItem key={getVendorId(vendor, index)} value={getVendorId(vendor, index)}>
                {getVendorLabel(vendor)}
              </SelectItem>
            )) : (
              <div className="px-3 py-2 text-sm text-muted-foreground">
                No vendors found
              </div>
            )}
          </SelectContent>
        </Select>
      </div>

      {form.vendorId ? (
        <div className="md:col-span-2">
          <Label>Vendor Bank Account</Label>
          <Select
            value={form.vendorBankAccountId || MANUAL_ACCOUNT_VALUE}
            onValueChange={updateVendorBankAccount}
            disabled={!canManage}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select unverified account or add manually" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={MANUAL_ACCOUNT_VALUE}>Add new bank account manually</SelectItem>
              {unverifiedVendorAccounts.map((account, index) => {
                const accountId = getVendorBankAccountId(account, index);
                return (
                  <SelectItem key={accountId} value={accountId}>
                    {getVendorBankAccountLabel(account)}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
          {selectedVendorAccounts.length > 0 && unverifiedVendorAccounts.length === 0 ? (
            <p className="mt-1 text-xs text-muted-foreground">
              All saved accounts for this vendor are already verified.
            </p>
          ) : null}
        </div>
      ) : null}

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
        <Label htmlFor="beneficiary-bank-name">Bank Name</Label>
        <Input
          id="beneficiary-bank-name"
          value={form.bankName}
          onChange={(event) => updateForm("bankName", event.target.value)}
          placeholder="Enter bank name"
          disabled={!canManage || Boolean(selectedVendorBankAccount)}
        />
      </div>

      <div>
        <Label htmlFor="beneficiary-account">Beneficiary Account Number *</Label>
        <Input
          id="beneficiary-account"
          value={form.accountNumber}
          onChange={(event) => updateForm("accountNumber", event.target.value)}
          placeholder="Enter beneficiary account number"
          disabled={!canManage || Boolean(selectedVendorBankAccount)}
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
          disabled={!canManage || Boolean(selectedVendorBankAccount)}
          maxLength={11}
          required
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
          disabled={!canVerify || validating || saving}
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
  );

  if (!framed) return formContent;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Beneficiary Details</CardTitle>
      </CardHeader>
      <CardContent>{formContent}</CardContent>
    </Card>
  );
};

export default BeneficiaryForm;
