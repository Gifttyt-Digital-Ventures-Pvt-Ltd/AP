import React, { useState } from "react";
import { Building2, Loader2, User, X } from "lucide-react";
import { Badge } from "../../../../components/ui/badge";
import { Button } from "../../../../components/ui/button";
import { Checkbox } from "../../../../components/ui/checkbox";
import { Input } from "../../../../components/ui/input";
import { Label } from "../../../../components/ui/label";
import AppSelect from "../../../../components/common/AppSelect";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../../../components/ui/dialog";
import { useGetAvailableCurrenciesQuery } from "../../../../Services/apis/corporateApi";
import {
  CURRENCY_SCREENS,
  FALLBACK_CURRENCIES,
  formatCurrency,
  mergeCurrencyOptions,
} from "../../../../utils/currency";
import { VENDOR_FIELD_SECTIONS } from "../../../../utils/vendorFieldConfig";
import { getVendorFieldErrorClassName } from "../../../../utils/vendorValidation";

const CATEGORY_OPTIONS = [
  "IT Services",
  "Office Supplies",
  "Consulting",
  "Marketing",
  "Legal",
  "Maintenance",
  "Utilities",
  "Others",
];

const VENDOR_STATUS_OPTIONS = ["Active", "Inactive"];
const PAYMENT_TERMS_OPTIONS = [
  "Due on Receipt",
  "Net 15",
  "Net 30",
  "Net 45",
  "Net 60",
];
const DELIVERY_TERMS_OPTIONS = ["EXW", "FOB", "CIF", "DAP", "DDP"];
const MSME_CATEGORY_OPTIONS = ["Micro", "Small", "Medium"];
const MSME_STATUS_STYLES = {
  VERIFIED: "border-emerald-200 bg-emerald-100 text-emerald-800",
  FAILED: "border-red-200 bg-red-100 text-red-800",
  UNAVAILABLE: "border-amber-200 bg-amber-100 text-amber-900",
  MANUAL: "border-blue-200 bg-blue-100 text-blue-800",
  NOT_VERIFIED: "border-slate-200 bg-slate-100 text-slate-700",
};

const normalizeMsmeVerificationStatus = (status) =>
  String(status || "NOT_VERIFIED").trim().toUpperCase() || "NOT_VERIFIED";

const hasValue = (value) =>
  value !== undefined && value !== null && value !== "";

const getVendorBalance = (vendor = {}) =>
  vendor.vendorBalance ??
  vendor.vendor_balance ??
  vendor.balance ??
  vendor.currentBalance ??
  vendor.current_balance ??
  vendor.openingBalance ??
  vendor.opening_balance;

const formatVendorBalance = (vendor = {}) => {
  const balance = getVendorBalance(vendor);
  if (!hasValue(balance)) return "";
  return formatCurrency(balance, vendor.currency || "INR");
};

const SubsectionHeading = ({ title, description }) => (
  <div className="flex flex-col items-start self-stretch">
    <h4 className="font-['Manrope'] text-base font-semibold leading-5 text-foreground">
      {title}
    </h4>
    {description ? (
      <p className="pt-0.5 text-xs leading-4 text-muted-foreground">
        {description}
      </p>
    ) : null}
  </div>
);

const GeneralInformationSection = ({
  formData,
  updateField,
  isRequired,
  labelFor,
  isEditMode = false,
  fieldErrors = {},
  portalVerificationEnabled = false,
  onVerifyMsme,
  onFetchMsmeUsingPan,
  onApplyFetchedMsme,
  isMsmeVerifying = false,
}) => {
  const nameLabel =
    formData.vendor_type === "Company"
      ? labelFor(VENDOR_FIELD_SECTIONS.COMPANY_NAME, "Vendor Name")
      : "Full Name";
  const errorClass = (key) => getVendorFieldErrorClassName(fieldErrors, key);
  const requiredMark = (sectionId) => (isRequired(sectionId) ? " *" : "");
  const msmeVerificationStatus = normalizeMsmeVerificationStatus(formData.msmeVerificationStatus);
  const showMsmeVerificationControls = Boolean(portalVerificationEnabled && formData.msme);
  const canVerifyMsme = Boolean(showMsmeVerificationControls && onVerifyMsme);
  const hasUdyamRegistrationNo = Boolean(String(formData.udyamRegistrationNo || "").trim());
  const fetchUsingPanDisabled = hasUdyamRegistrationNo || isMsmeVerifying;
  const verifyMsmeDisabled = !hasUdyamRegistrationNo || isMsmeVerifying;

  const [isOtherCategory, setIsOtherCategory] = useState(
    () => Boolean(formData.category) && !CATEGORY_OPTIONS.includes(formData.category),
  );
  const [panFetchOpen, setPanFetchOpen] = useState(false);
  const [panInput, setPanInput] = useState("");
  const [panFetchResult, setPanFetchResult] = useState(null);
  const [panFetchError, setPanFetchError] = useState("");

  const { data: availableCurrencies = [] } = useGetAvailableCurrenciesQuery(
    CURRENCY_SCREENS.INVOICE,
  );
  const currencyOptions =
    Array.isArray(availableCurrencies) && availableCurrencies.length > 0
      ? availableCurrencies.filter((currency) => currency !== "ALL")
      : FALLBACK_CURRENCIES;
  const resolvedCurrencyOptions = mergeCurrencyOptions(
    currencyOptions,
    FALLBACK_CURRENCIES,
    formData.currency,
  );
  const openPanFetchDialog = () => {
    if (fetchUsingPanDisabled) return;
    setPanInput(String(formData.pan || "").trim().toUpperCase());
    setPanFetchResult(null);
    setPanFetchError("");
    setPanFetchOpen(true);
  };
  const handlePanFetch = async () => {
    if (!onFetchMsmeUsingPan || isMsmeVerifying) return;

    const response = await onFetchMsmeUsingPan(panInput);
    setPanFetchResult(response);
    setPanFetchError(response ? "" : "No verified Udyam details were found for this PAN.");
  };
  const confirmPanFetch = () => {
    if (!panFetchResult || !onApplyFetchedMsme) return;
    onApplyFetchedMsme(panFetchResult);
    setPanFetchOpen(false);
  };
  const renderUdyamFetchCta = () => {
    if (!showMsmeVerificationControls) return null;

    if (["VERIFIED", "FAILED"].includes(msmeVerificationStatus)) {
      return (
        <span
          className={`pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm font-medium ${
            msmeVerificationStatus === "VERIFIED" ? "text-emerald-700" : "text-red-700"
          }`}
        >
          {msmeVerificationStatus === "VERIFIED" ? "Verified" : "Not Verified"}
        </span>
      );
    }

    return (
      <button
        type="button"
        onClick={openPanFetchDialog}
        disabled={fetchUsingPanDisabled}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-medium text-primary transition-colors hover:text-primary/80 disabled:cursor-not-allowed disabled:text-muted-foreground"
      >
        Fetch using PAN
      </button>
    );
  };

  return (
    <>
      <div className="-mx-6 border-b border-border px-10">
      <div className="flex flex-col items-start self-stretch border-b border-border py-6">
        <h3 className="font-['Manrope'] text-lg font-semibold leading-6 text-foreground">
          General Information
        </h3>
      </div>

      <div
        id="vendor-identity"
        className="flex scroll-mt-4 flex-col items-start gap-6 border-b border-border px-4 pb-8 pt-6"
      >
        <SubsectionHeading
          title="Vendor Identity"
          description="Choose the vendor type and registered name."
        />

        <div className="flex w-full flex-col items-start gap-6">
          <div className="flex w-full items-start gap-4">
            <div className="flex-1">
              <Label>
                {nameLabel}
                {requiredMark(VENDOR_FIELD_SECTIONS.COMPANY_NAME)}
              </Label>
              <Input
                value={formData.name || ""}
                onChange={(event) => updateField("name", event.target.value)}
                placeholder="e.g., Acme Corporation"
                className={`mt-1.5 ${errorClass("name")}`}
                data-testid="vendor-name-input"
                required={isRequired(VENDOR_FIELD_SECTIONS.COMPANY_NAME)}
              />
            </div>

            <div className="flex-1">
              <Label>
                {labelFor(VENDOR_FIELD_SECTIONS.TRADE_NAME, "Trade Name")}
                {requiredMark(VENDOR_FIELD_SECTIONS.TRADE_NAME)}
              </Label>
              <Input
                value={formData.trade_name || ""}
                onChange={(event) =>
                  updateField("trade_name", event.target.value)
                }
                placeholder="e.g., Tensai"
                className={`mt-1.5 ${errorClass("trade_name")}`}
                data-testid="vendor-trade-name-input"
                required={isRequired(VENDOR_FIELD_SECTIONS.TRADE_NAME)}
              />
            </div>

            <div className="flex-1">
              <Label>
                {labelFor(VENDOR_FIELD_SECTIONS.VENDOR_ID, "Vendor Code/ID")}
                {requiredMark(VENDOR_FIELD_SECTIONS.VENDOR_ID)}
              </Label>
              <Input
                value={formData.vendorId || ""}
                onChange={(event) =>
                  updateField("vendorId", event.target.value)
                }
                placeholder=""
                className={`mt-1.5 ${errorClass("vendorId")}`}
                data-testid="vendor-id-input"
                required={isRequired(VENDOR_FIELD_SECTIONS.VENDOR_ID)}
              />
            </div>
          </div>

          <div className="w-full">
            <Label>
              {labelFor(VENDOR_FIELD_SECTIONS.VENDOR_TYPE, "Vendor Type")}
              {requiredMark(VENDOR_FIELD_SECTIONS.VENDOR_TYPE)}
            </Label>
            <div className="mt-2 flex items-start gap-4">
              {["Company", "Individual"].map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => updateField("vendor_type", type)}
                  className={`flex flex-1 items-center justify-center gap-2 rounded-lg border p-3 transition-all ${
                    formData.vendor_type === type
                      ? "border-accent bg-accent/10 shadow-sm"
                      : fieldErrors.vendor_type
                        ? "border-destructive hover:border-destructive"
                        : "border-border hover:border-accent/50"
                  }`}
                >
                  {type === "Company" ? (
                    <Building2 className="h-4 w-4 text-foreground" />
                  ) : (
                    <User className="h-4 w-4 text-foreground" />
                  )}
                  <span className="text-sm font-medium text-foreground">
                    {type}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div
        id="classification-commercial-terms"
        className="flex scroll-mt-4 flex-col items-start gap-6 border-b border-border px-4 py-8"
      >
        <SubsectionHeading
          title="Classification & Commercial Terms"
          description="Vendor details fetched from the GST portal."
        />

        <div className="flex w-full flex-col items-start gap-6">
          <div className="flex w-full items-start gap-4">
            <div className="flex-1">
              <Label>
                {labelFor(VENDOR_FIELD_SECTIONS.CATEGORY, "Category")}
                {requiredMark(VENDOR_FIELD_SECTIONS.CATEGORY)}
              </Label>
              {isOtherCategory ? (
                <div className="relative mt-1.5">
                  <Input
                    autoFocus
                    placeholder="Enter category"
                    value={formData.category || ""}
                    onChange={(event) =>
                      updateField("category", event.target.value)
                    }
                    className={`pr-8 ${errorClass("category")}`}
                  />
                  <button
                    type="button"
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    onClick={() => {
                      setIsOtherCategory(false);
                      updateField("category", "");
                    }}
                    aria-label="Choose from list instead"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <AppSelect
                  value={formData.category || ""}
                  onChange={(event) => {
                    const nextValue = event.target.value;
                    if (nextValue === "Others") {
                      setIsOtherCategory(true);
                      updateField("category", "");
                    } else {
                      updateField("category", nextValue);
                    }
                  }}
                  options={CATEGORY_OPTIONS}
                  placeholder="Select Category"
                  className={`mt-1.5 ${errorClass("category")}`}
                />
              )}
            </div>

            <div className="flex-1">
              <Label>
                {labelFor(VENDOR_FIELD_SECTIONS.CURRENCY, "Currency")}
                {requiredMark(VENDOR_FIELD_SECTIONS.CURRENCY)}
              </Label>
              <AppSelect
                value={formData.currency || ""}
                onChange={(event) => updateField("currency", event.target.value)}
                options={resolvedCurrencyOptions}
                placeholder="Select Currency"
                className={`mt-1.5 ${errorClass("currency")}`}
              />
            </div>
          </div>

          <div className="flex w-full items-start gap-4">
            <div className="flex-1">
              <Label>
                {labelFor(VENDOR_FIELD_SECTIONS.PAYMENT_TERMS, "Payment Terms")}
                {requiredMark(VENDOR_FIELD_SECTIONS.PAYMENT_TERMS)}
              </Label>
              <AppSelect
                value={formData.paymentTerms || ""}
                onChange={(event) =>
                  updateField("paymentTerms", event.target.value)
                }
                options={PAYMENT_TERMS_OPTIONS}
                placeholder="Select Payment Terms"
                className={`mt-1.5 ${errorClass("paymentTerms")}`}
              />
            </div>

            <div className="flex-1">
              <Label>
                {labelFor(
                  VENDOR_FIELD_SECTIONS.MODE_OF_DELIVERY,
                  "Mode of Delivery",
                )}
                {requiredMark(VENDOR_FIELD_SECTIONS.MODE_OF_DELIVERY)}
              </Label>
              <Input
                value={formData.modeOfDelivery || ""}
                onChange={(event) => updateField("modeOfDelivery", event.target.value)}
                placeholder="e.g., Road / Air / Courier"
                className={`mt-1.5 ${errorClass("modeOfDelivery")}`}
              />
            </div>
          </div>

          <div className="flex w-full items-start gap-4">
            <div className="flex-1">
              <Label>
                {labelFor(
                  VENDOR_FIELD_SECTIONS.DELIVERY_TERMS,
                  "Delivery Terms",
                )}
                {requiredMark(VENDOR_FIELD_SECTIONS.DELIVERY_TERMS)}
              </Label>
              <AppSelect
                value={formData.deliveryTerms || ""}
                onChange={(event) =>
                  updateField("deliveryTerms", event.target.value)
                }
                options={DELIVERY_TERMS_OPTIONS}
                placeholder="Select Delivery Terms"
                className={`mt-1.5 ${errorClass("deliveryTerms")}`}
              />
            </div>

            <div className="flex-1">
              <Label>Vendor Balance</Label>
              <Input
                value={formatVendorBalance(formData)}
                disabled
                placeholder="—"
                className="mt-1.5 bg-muted uppercase"
              />
            </div>
          </div>
        </div>
      </div>

      <div
        id="flags-status"
        className="flex scroll-mt-4 flex-col items-start gap-6 px-4 py-8"
      >
        <SubsectionHeading
          title="Flags & Status"
          description={
            isEditMode
              ? "Vendor classification and status details."
              : "Vendor status and applicable regulatory flags."
          }
        />

        <div className="flex w-full flex-col items-start gap-6">
          <div className="flex w-full items-end gap-4">
            <div className="flex-1">
              <Label>
                {labelFor(VENDOR_FIELD_SECTIONS.VENDOR_STATUS, "Vendor Status")}
                {requiredMark(VENDOR_FIELD_SECTIONS.VENDOR_STATUS)}
              </Label>
              <AppSelect
                value={formData.vendorStatus || ""}
                onChange={(event) =>
                  updateField("vendorStatus", event.target.value)
                }
                options={VENDOR_STATUS_OPTIONS}
                placeholder="Select Vendor Status"
                className={`mt-1.5 ${errorClass("vendorStatus")}`}
              />
            </div>

            <div className="flex flex-1 items-center gap-8 px-8">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="vendor-one-time"
                  checked={Boolean(formData.oneTimeVendor)}
                  onCheckedChange={(checked) =>
                    updateField("oneTimeVendor", checked === true)
                  }
                />
                <Label
                  htmlFor="vendor-one-time"
                  className="cursor-pointer font-normal"
                >
                  {labelFor(
                    VENDOR_FIELD_SECTIONS.ONE_TIME_VENDOR,
                    "One Time Vendor",
                  )}
                </Label>
              </div>

              <div className="flex items-center gap-2">
                <Checkbox
                  id="vendor-foreign"
                  checked={Boolean(formData.foreignVendor)}
                  onCheckedChange={(checked) =>
                    updateField("foreignVendor", checked === true)
                  }
                />
                <Label
                  htmlFor="vendor-foreign"
                  className="cursor-pointer font-normal"
                >
                  {labelFor(
                    VENDOR_FIELD_SECTIONS.FOREIGN_VENDOR,
                    "Foreign Vendor",
                  )}
                </Label>
              </div>
            </div>
          </div>

          <div className="flex w-full flex-col items-start gap-2">
            <div className="flex items-center gap-2 pl-3">
              <Checkbox
                id="vendor-msme"
                checked={Boolean(formData.msme)}
                onCheckedChange={(checked) =>
                  updateField("msme", checked === true)
                }
                data-testid="vendor-msme-checkbox"
              />
              <Label
                htmlFor="vendor-msme"
                className="cursor-pointer font-normal"
              >
                {labelFor(VENDOR_FIELD_SECTIONS.MSME, "MSME registered vendor")}
                {requiredMark(VENDOR_FIELD_SECTIONS.MSME)}
              </Label>
            </div>

            {formData.msme ? (
              <div className="w-full rounded-lg border border-border bg-purple-50 p-4">
                <div className="flex w-full items-end gap-4">
                  <div className="flex-1">
                    <Label>
                      {labelFor(
                        VENDOR_FIELD_SECTIONS.UDYAM_REGISTRATION_NO,
                        "Udyam Registration No",
                      )}
                      {requiredMark(VENDOR_FIELD_SECTIONS.UDYAM_REGISTRATION_NO)}
                    </Label>
                    <div className="relative mt-1.5">
                      <Input
                        value={formData.udyamRegistrationNo || ""}
                        onChange={(event) =>
                          updateField("udyamRegistrationNo", event.target.value)
                        }
                        placeholder="UDYAM-XX-00-0000000"
                        className={`bg-background pr-36 ${errorClass("udyamRegistrationNo")}`}
                        required={isRequired(VENDOR_FIELD_SECTIONS.UDYAM_REGISTRATION_NO)}
                      />
                      {renderUdyamFetchCta()}
                    </div>
                  </div>
                  <div className="flex-1">
                    <Label>
                      {labelFor(
                        VENDOR_FIELD_SECTIONS.MSME_CATEGORY,
                        "MSME Category",
                      )}
                      {requiredMark(VENDOR_FIELD_SECTIONS.MSME_CATEGORY)}
                    </Label>
                    <AppSelect
                      value={formData.msmeCategory || ""}
                      onChange={(event) =>
                        updateField("msmeCategory", event.target.value)
                      }
                      options={MSME_CATEGORY_OPTIONS}
                      placeholder="Select MSME Category"
                      className={`mt-1.5 bg-background ${errorClass("msmeCategory")}`}
                    />
                  </div>
                </div>
                {showMsmeVerificationControls && formData.msmeVerificationMessage ? (
                  <p className="mt-3 text-xs leading-4 text-muted-foreground">
                    {formData.msmeVerificationMessage}
                  </p>
                ) : null}
                <div className="mt-3 flex items-center justify-between gap-3">
                  <p className="text-xs leading-4 text-muted-foreground">
                    Confirmed by you as in-scope — drives the mandatory 45-day
                    payment rule under the MSME Act.
                  </p>
                  {canVerifyMsme ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={onVerifyMsme}
                      disabled={verifyMsmeDisabled}
                    >
                      {isMsmeVerifying ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : null}
                      Verify
                    </Button>
                  ) : null}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
      </div>
      <Dialog open={panFetchOpen} onOpenChange={setPanFetchOpen}>
      <DialogContent
        className="max-w-3xl gap-0 overflow-hidden p-0"
        onInteractOutside={(event) => isMsmeVerifying && event.preventDefault()}
      >
        <DialogHeader className="border-b px-8 py-6">
          <DialogTitle className="text-2xl font-semibold leading-8">
            Fetch & Verify Udyam Registration No
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-5 px-8 py-7">
          <div>
            <Label className="text-base font-semibold">Enter PAN No.</Label>
            <Input
              value={panInput}
              onChange={(event) => {
                setPanInput(event.target.value.toUpperCase());
                setPanFetchResult(null);
                setPanFetchError("");
              }}
              placeholder="ABCDE1234F"
              className="mt-3 h-12 text-base"
              disabled={isMsmeVerifying}
            />
          </div>
          {panFetchError ? (
            <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {panFetchError}
            </p>
          ) : null}
          {panFetchResult ? (
            <div className="rounded-lg border border-border bg-muted/30 p-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-xs text-muted-foreground">Udyam Registration No</p>
                  <p className="mt-1 text-sm font-medium text-foreground">
                    {panFetchResult.udyamRegistrationNo || "-"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">MSME Category</p>
                  <p className="mt-1 text-sm font-medium text-foreground">
                    {panFetchResult.msmeCategory || "-"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Enterprise Name</p>
                  <p className="mt-1 text-sm font-medium text-foreground">
                    {panFetchResult.enterpriseName || "-"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Verification Status</p>
                  <Badge
                    variant="outline"
                    className={MSME_STATUS_STYLES[normalizeMsmeVerificationStatus(panFetchResult.verificationStatus)] || MSME_STATUS_STYLES.NOT_VERIFIED}
                  >
                    {normalizeMsmeVerificationStatus(panFetchResult.verificationStatus).replace(/_/g, " ")}
                  </Badge>
                </div>
              </div>
              {panFetchResult.verificationMessage ? (
                <p className="mt-3 text-sm text-muted-foreground">
                  {panFetchResult.verificationMessage}
                </p>
              ) : null}
            </div>
          ) : null}
        </div>
        <DialogFooter className="gap-4 border-t px-8 py-5 sm:justify-between sm:space-x-0">
          <Button
            type="button"
            variant="outline"
            className="h-11 flex-1"
            onClick={() => setPanFetchOpen(false)}
            disabled={isMsmeVerifying}
          >
            Cancel
          </Button>
          {panFetchResult ? (
            <Button
              type="button"
              className="h-11 flex-1"
              onClick={confirmPanFetch}
              disabled={isMsmeVerifying}
            >
              Confirm
            </Button>
          ) : (
            <Button
              type="button"
              className="h-11 flex-1"
              onClick={handlePanFetch}
              disabled={isMsmeVerifying || !String(panInput || "").trim()}
            >
              {isMsmeVerifying ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Fetch & Verify
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
      </Dialog>
    </>
  );
};

export default GeneralInformationSection;
