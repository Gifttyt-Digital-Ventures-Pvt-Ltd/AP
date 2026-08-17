import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
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

const emptyForm = {
  bankAccountId: "",
  name: "",
  bankName: "",
  accountNumber: "",
  ifsc: "",
  vendorId: "",
};

const BeneficiaryForm = ({
  accounts = [],
  vendors = [],
  canManage = false,
  vendorSearch = "",
  vendorsFetching = false,
  hasMoreVendors = false,
  validating = false,
  saving = false,
  onVendorSearchChange,
  onLoadMoreVendors,
  onVerify,
  onSave,
  framed = true,
}) => {
  const vendorViewportRef = useRef(null);
  const lastVendorLoadCountRef = useRef(0);
  const vendorOptions = useMemo(
    () => (Array.isArray(vendors) ? vendors.filter(Boolean) : []),
    [vendors],
  );
  const [form, setForm] = useState(() => ({
    ...emptyForm,
    bankAccountId: accounts[0] ? getAccountId(accounts[0], 0) : "",
  }));
  const [verifiedBeneficiary, setVerifiedBeneficiary] = useState(null);

  const selectedVendor = useMemo(
    () => vendorOptions.find((vendor, index) => getVendorId(vendor, index) === form.vendorId) || null,
    [form.vendorId, vendorOptions],
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
    const vendor = vendorOptions.find((item, index) => getVendorId(item, index) === vendorId);
    if (!vendor) return;
    setForm((prev) => ({
      ...prev,
      vendorId,
      name: vendor?.name || vendor?.vendorName || vendor?.vendor_name || "",
      bankName: "",
      accountNumber: "",
      ifsc: "",
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
    addToVendor: Boolean(form.vendorId),
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

  const maybeLoadMoreVendors = useCallback((element) => {
    if (!hasMoreVendors || vendorsFetching) return;
    if (!element) return;
    const { scrollTop, scrollHeight, clientHeight } = element;
    const scrollableDistance = Math.max(scrollHeight - clientHeight, 0);
    if (scrollableDistance === 0) return;
    const remainingDistance = scrollHeight - scrollTop - clientHeight;
    const bottomThreshold = scrollableDistance * 0.2;
    if (remainingDistance > bottomThreshold) return;
    if (lastVendorLoadCountRef.current === vendorOptions.length) return;
    lastVendorLoadCountRef.current = vendorOptions.length;
    onLoadMoreVendors?.();
  }, [hasMoreVendors, onLoadMoreVendors, vendorOptions.length, vendorsFetching]);

  const handleVendorScroll = (event) => {
    maybeLoadMoreVendors(event.currentTarget);
  };

  useEffect(() => {
    if (vendorsFetching) return;
    lastVendorLoadCountRef.current = 0;
  }, [vendorOptions.length, vendorSearch, vendorsFetching]);

  const formContent = (
    <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
      <div className="md:col-span-2">
        <Label>Vendor *</Label>
        <Select
          value={form.vendorId}
          onValueChange={updateVendor}
          disabled={!canManage}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select vendor" />
          </SelectTrigger>
          <SelectContent
            className="max-h-72"
            viewportRef={vendorViewportRef}
            viewportClassName="!h-auto max-h-72 overflow-y-auto"
            viewportProps={{ onScroll: handleVendorScroll }}
          >
            <div className="sticky -top-2.5 z-20 -mx-1 -mt-2 border-b bg-popover p-2 shadow-sm">
              <Input
                value={vendorSearch}
                onChange={(event) => onVendorSearchChange?.(event.target.value)}
                onKeyDown={(event) => event.stopPropagation()}
                placeholder="Search vendor..."
                className="h-8"
              />
            </div>
            {vendorOptions.length > 0 ? vendorOptions.map((vendor, index) => (
              <SelectItem
                key={getVendorId(vendor, index)}
                value={getVendorId(vendor, index)}
                className={index === 0 ? "mt-1" : undefined}
              >
                {getVendorLabel(vendor)}
              </SelectItem>
            )) : (
              <div className="px-3 py-2 text-sm text-muted-foreground">
                {vendorsFetching ? "Loading vendors..." : "No vendors found"}
              </div>
            )}
            {hasMoreVendors ? (
              <div className="border-t px-3 py-2 text-center text-xs text-muted-foreground">
                {vendorsFetching ? "Loading vendors..." : "Scroll for more vendors"}
              </div>
            ) : null}
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
          disabled={!canManage}
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
