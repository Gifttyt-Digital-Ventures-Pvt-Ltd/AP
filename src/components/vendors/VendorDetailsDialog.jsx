import React, { useCallback, useEffect, useState } from "react";
import { Building2, User } from "lucide-react";
import { useGetAvailableCurrenciesQuery } from "../../Services/apis/corporateApi";
import { useRBAC } from "../../contexts/RBACContext";
import { CURRENCY_SCREENS, FALLBACK_CURRENCIES } from "../../utils/currency";
import {
  getVendorFieldDisplayName,
  isVendorFieldRequired,
  VENDOR_FIELD_SECTIONS,
} from "../../utils/vendorFieldConfig";
import {
  isIndiaCountry,
  normalizePincodeInput,
  getVendorGstVerificationErrors,
  isVendorGstVerificationSatisfied,
} from "../../utils/vendorValidation";
import { toast } from "sonner";
import { Button } from "../ui/button";
import { Checkbox } from "../ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import VendorGstVerificationBlock from "./VendorGstVerificationBlock";

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

const FormSection = ({ title, description, children, className }) => (
  <section className={className}>
    <div className="mb-4">
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      {description ? (
        <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
      ) : null}
    </div>
    {children}
  </section>
);

const VendorDetailsDialog = ({
  open,
  onOpenChange,
  formData,
  setFormData,
  onSubmit,
  title = "Create Vendor",
  description = "Add contact details and payment info of your vendor in OptiFii",
  submitLabel = "Save Vendor",
  submitting = false,
  activeVendorFields: activeVendorFieldsProp,
  vendorFieldConfiguration: vendorFieldConfigurationProp,
  /** Invoice upload vendor request: only name + type are mandatory */
  invoiceVendorRequest = false,
  testId = "vendor-dialog",
}) => {
  const { corporateScreens } = useRBAC();
  const activeVendorFields =
    activeVendorFieldsProp ?? corporateScreens?.activeVendorFields ?? [];
  const vendorFieldConfiguration =
    vendorFieldConfigurationProp ?? corporateScreens?.vendorFieldConfiguration ?? [];

  const { data: availableCurrencies = [] } = useGetAvailableCurrenciesQuery(
    CURRENCY_SCREENS.INVOICE,
    { skip: invoiceVendorRequest },
  );

  const applyGstVerification = useCallback((data) => {
    if (!data) return;
    setFormData((prev) => ({
      ...prev,
      gstin: data.gstin || prev.gstin,
      pan: data.pan || prev.pan,
      state: data.state || prev.state,
      country: prev.country || "India",
      name: prev.name?.trim()
        ? prev.name
        : data.legalName || prev.name,
    }));
  }, [setFormData]);

  const [gstVerification, setGstVerification] = useState({
    verified: false,
    gstin: "",
    validGstin: null,
  });
  const [gstVerificationAttempted, setGstVerificationAttempted] = useState(false);

  useEffect(() => {
    if (!open) {
      setGstVerification({ verified: false, gstin: "", validGstin: null });
      setGstVerificationAttempted(false);
    }
  }, [open]);

  const handleGstVerificationChange = useCallback((next) => {
    setGstVerification((prev) => {
      if (
        prev.verified === next.verified
        && prev.gstin === next.gstin
        && prev.validGstin === next.validGstin
      ) {
        return prev;
      }
      return next;
    });
    if (next.verified) setGstVerificationAttempted(false);
  }, []);

  const handleFormSubmit = (event) => {
    event.preventDefault();
    if (!formData) return;

    const gstErrors = getVendorGstVerificationErrors(formData, gstVerification, {
      invoiceVendorRequest,
    });
    if (gstErrors.length > 0) {
      setGstVerificationAttempted(true);
      toast.error(gstErrors[0]);
      return;
    }

    onSubmit(event);
  };

  if (!formData) return null;

  const isRequired = (sectionId) =>
    !invoiceVendorRequest && isVendorFieldRequired(sectionId, activeVendorFields);

  const labelFor = (sectionId, fallback = "") =>
    getVendorFieldDisplayName(sectionId, vendorFieldConfiguration) || fallback;

  const isIndia = isIndiaCountry(formData.country);
  const gstVerificationRequired = isIndia && !invoiceVendorRequest;
  const gstVerificationSatisfied = isVendorGstVerificationSatisfied(
    formData,
    gstVerification,
    { invoiceVendorRequest },
  );
  const currencyOptions =
    Array.isArray(availableCurrencies) && availableCurrencies.length > 0
      ? availableCurrencies.filter((currency) => currency !== "ALL")
      : FALLBACK_CURRENCIES;

  const updateField = (field, value) =>
    setFormData((prev) => ({ ...prev, [field]: value }));

  const basicInfoFields = [
    {
      key: "email",
      section: VENDOR_FIELD_SECTIONS.EMAIL_ID,
      type: "email",
      placeholder: "vendor@example.com",
      testId: "vendor-email-input",
    },
    {
      key: "mobile",
      section: VENDOR_FIELD_SECTIONS.MOBILE_NO,
      placeholder: "+91 98765 43210",
      testId: "vendor-mobile-input",
    },
    {
      key: "phone",
      section: VENDOR_FIELD_SECTIONS.PHONE_NO,
      placeholder: "+91 22 1234 5678",
      testId: "vendor-phone-input",
    },
    {
      key: "contact_person",
      section: VENDOR_FIELD_SECTIONS.CONTACT_PERSON,
      placeholder: "e.g., Rahul Sharma",
    },
    {
      key: "website",
      section: VENDOR_FIELD_SECTIONS.WEBSITE,
      placeholder: "https://example.com",
    },
  ];

  const addressFields = [
    {
      key: "address_line1",
      section: VENDOR_FIELD_SECTIONS.ADDRESS_LINE_1,
      placeholder: "Building/Street address",
      colSpan: "col-span-2",
    },
    {
      key: "address_line2",
      section: VENDOR_FIELD_SECTIONS.ADDRESS_LINE_2,
      placeholder: "Apartment, suite, etc.",
      colSpan: "col-span-2",
    },
    {
      key: "city",
      section: VENDOR_FIELD_SECTIONS.CITY,
      placeholder: "e.g., Mumbai",
    },
    {
      key: "state",
      section: VENDOR_FIELD_SECTIONS.STATE,
      placeholder: "e.g., Maharashtra",
    },
    {
      key: "country",
      section: VENDOR_FIELD_SECTIONS.COUNTRY,
      placeholder: "India",
    },
  ];

  const bankFields = [
    {
      key: "account_holder_name",
      section: VENDOR_FIELD_SECTIONS.ACCOUNT_NAME,
      placeholder: "As per bank records",
      colSpan: "col-span-2",
    },
    {
      key: "account_number",
      section: VENDOR_FIELD_SECTIONS.ACCOUNT_NUMBER,
      placeholder: "1234567890",
    },
    {
      key: "ifsc_code",
      section: VENDOR_FIELD_SECTIONS.IFSC_CODE,
      placeholder: "ICIC0001234",
      transform: (value) => value.toUpperCase(),
      className: "uppercase",
    },
    {
      key: "bank_name",
      section: VENDOR_FIELD_SECTIONS.BANK_NAME,
      placeholder: "e.g., ICICI Bank",
    },
    {
      key: "branch",
      section: VENDOR_FIELD_SECTIONS.BRANCH,
      placeholder: "e.g., Andheri West",
    },
  ];

  const renderInputField = ({
    key,
    section,
    placeholder,
    type = "text",
    transform,
    className = "",
    colSpan = "",
    maxLength,
    testId: fieldTestId,
  }) => {
    const required = isRequired(section);
    const label = labelFor(section);
    return (
      <div key={key} className={colSpan}>
        <Label>
          {label}
          {required ? " *" : ""}
        </Label>
        <Input
          type={type}
          value={formData[key] || ""}
          onChange={(event) =>
            updateField(
              key,
              transform ? transform(event.target.value) : event.target.value,
            )
          }
          placeholder={placeholder}
          required={required}
          className={className}
          maxLength={maxLength}
          data-testid={fieldTestId}
        />
      </div>
    );
  };

  const nameLabel =
    formData.vendor_type === "Company"
      ? labelFor(VENDOR_FIELD_SECTIONS.COMPANY_NAME, "Company Name")
      : "Full Name";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-3xl max-h-[90vh] overflow-y-auto p-0 gap-0"
        data-testid={testId}
        onInteractOutside={(event) => event.preventDefault()}
      >
        <DialogHeader className="px-6 pt-6 pb-4 border-b bg-muted/20">
          <DialogTitle className="text-xl font-bold">{title}</DialogTitle>
          {description ? (
            <p className="text-sm text-muted-foreground">{description}</p>
          ) : null}
        </DialogHeader>

        <form onSubmit={handleFormSubmit} className="px-6 py-6 space-y-8">
          <FormSection
            title="Vendor identity"
            description="Choose the vendor type and registered name."
          >
            <div className="grid gap-4">
              <div>
                <Label>
                  {labelFor(VENDOR_FIELD_SECTIONS.VENDOR_TYPE, "Vendor Type")}
                  {invoiceVendorRequest || isRequired(VENDOR_FIELD_SECTIONS.VENDOR_TYPE)
                    ? " *"
                    : ""}
                </Label>
                <div className="flex gap-3 mt-2">
                  {["Company", "Individual"].map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() =>
                        setFormData((prev) => ({
                          ...prev,
                          vendor_type: type,
                        }))
                      }
                      className={`flex-1 p-3 border rounded-lg flex items-center justify-center gap-2 transition-all ${
                        formData.vendor_type === type
                          ? "border-accent bg-accent/10 shadow-sm"
                          : "border-border hover:border-accent/50"
                      }`}
                    >
                      {type === "Company" ? (
                        <Building2 className="h-4 w-4" />
                      ) : (
                        <User className="h-4 w-4" />
                      )}
                      <span className="text-sm font-medium">{type}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <Label>
                  {nameLabel}
                  {invoiceVendorRequest || isRequired(VENDOR_FIELD_SECTIONS.COMPANY_NAME)
                    ? " *"
                    : ""}
                </Label>
                <Input
                  value={formData.name}
                  onChange={(event) => updateField("name", event.target.value)}
                  placeholder={
                    formData.vendor_type === "Company"
                      ? "e.g., Acme Corporation"
                      : "e.g., John Doe"
                  }
                  className="mt-1.5"
                  data-testid="vendor-name-input"
                  required={
                    invoiceVendorRequest ||
                    isRequired(VENDOR_FIELD_SECTIONS.COMPANY_NAME)
                  }
                />
              </div>
            </div>
          </FormSection>

          <FormSection
            title={isIndia && !invoiceVendorRequest ? "Tax & GST verification" : "Tax information"}
            description={
              isIndia && !invoiceVendorRequest
                ? "GSTIN is required. Click Verify to check against the GST portal before saving."
                : invoiceVendorRequest
                  ? "Optional tax details. GST will be verified when the vendor is approved."
                  : "Enter tax identifiers for this vendor."
            }
          >
            {isIndia && !invoiceVendorRequest ? (
              <VendorGstVerificationBlock
                gstin={formData.gstin || ""}
                onGstinChange={(value) => updateField("gstin", value)}
                onVerified={applyGstVerification}
                onVerificationChange={handleGstVerificationChange}
                verificationRequired={gstVerificationRequired}
                showVerificationError={gstVerificationAttempted && !gstVerificationSatisfied}
                gstLabel={labelFor(VENDOR_FIELD_SECTIONS.GST_NO, "GSTIN")}
                gstRequired={gstVerificationRequired || isRequired(VENDOR_FIELD_SECTIONS.GST_NO)}
                panLabel={labelFor(VENDOR_FIELD_SECTIONS.PAN_NO, "PAN Number")}
                panRequired={isRequired(VENDOR_FIELD_SECTIONS.PAN_NO)}
                panValue={formData.pan || ""}
                onPanChange={(value) => updateField("pan", value)}
                showMsme={!invoiceVendorRequest}
                msmeLabel={labelFor(VENDOR_FIELD_SECTIONS.MSME, "MSME registered vendor")}
                msmeRequired={isRequired(VENDOR_FIELD_SECTIONS.MSME)}
                msmeValue={formData.msme}
                onMsmeChange={(checked) => updateField("msme", checked)}
              />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label>
                    {labelFor(VENDOR_FIELD_SECTIONS.PAN_NO, "PAN / Tax ID")}
                    {isRequired(VENDOR_FIELD_SECTIONS.PAN_NO) ? " *" : ""}
                  </Label>
                  <Input
                    value={formData.pan}
                    onChange={(event) =>
                      updateField("pan", event.target.value.toUpperCase())
                    }
                    placeholder="Tax identifier"
                    className="mt-1.5 uppercase"
                    required={isRequired(VENDOR_FIELD_SECTIONS.PAN_NO)}
                  />
                </div>
                <div>
                  <Label>
                    {labelFor(VENDOR_FIELD_SECTIONS.GST_NO, "GSTIN / Tax ID")}
                    {isRequired(VENDOR_FIELD_SECTIONS.GST_NO) ? " *" : ""}
                  </Label>
                  <Input
                    value={formData.gstin}
                    onChange={(event) =>
                      updateField("gstin", event.target.value.toUpperCase())
                    }
                    placeholder="Enter GSTIN or Tax ID"
                    className="mt-1.5 uppercase"
                    required={isRequired(VENDOR_FIELD_SECTIONS.GST_NO)}
                  />
                </div>
                {!invoiceVendorRequest ? (
                  <div className="sm:col-span-2 flex items-center gap-2">
                    <Checkbox
                      id="vendor-msme"
                      checked={Boolean(formData.msme)}
                      onCheckedChange={(checked) =>
                        updateField("msme", checked === true)
                      }
                      data-testid="vendor-msme-checkbox"
                    />
                    <Label htmlFor="vendor-msme" className="cursor-pointer font-normal">
                      {labelFor(VENDOR_FIELD_SECTIONS.MSME, "MSME registered vendor")}
                      {isRequired(VENDOR_FIELD_SECTIONS.MSME) ? " *" : ""}
                    </Label>
                  </div>
                ) : null}
              </div>
            )}
          </FormSection>

          <FormSection
            title="Contact & classification"
            description="How you reach this vendor and how they are categorized."
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {basicInfoFields.map(renderInputField)}

              <div>
                <Label>
                  {labelFor(VENDOR_FIELD_SECTIONS.CATEGORY, "Category")}
                  {isRequired(VENDOR_FIELD_SECTIONS.CATEGORY) ? " *" : ""}
                </Label>
                <Select
                  value={formData.category || ""}
                  onValueChange={(value) => updateField("category", value)}
                  required={isRequired(VENDOR_FIELD_SECTIONS.CATEGORY)}
                >
                  <SelectTrigger className="mt-1.5">
                    <SelectValue placeholder="Select Category" />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORY_OPTIONS.map((option) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>
                  {labelFor(VENDOR_FIELD_SECTIONS.CURRENCY, "Currency")}
                  {isRequired(VENDOR_FIELD_SECTIONS.CURRENCY) ? " *" : ""}
                </Label>
                <Select
                  value={formData.currency || ""}
                  onValueChange={(value) => updateField("currency", value)}
                  required={isRequired(VENDOR_FIELD_SECTIONS.CURRENCY)}
                >
                  <SelectTrigger className="mt-1.5">
                    <SelectValue placeholder="Select Currency" />
                  </SelectTrigger>
                  <SelectContent>
                    {currencyOptions.map((option) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </FormSection>

          <FormSection title="Address">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {addressFields.map(renderInputField)}

              <div>
                <Label>
                  {isIndia
                    ? labelFor(VENDOR_FIELD_SECTIONS.PINCODE, "Pincode")
                    : "Postal Code"}
                  {isRequired(VENDOR_FIELD_SECTIONS.PINCODE) ? " *" : ""}
                </Label>
                <Input
                  type="text"
                  inputMode={isIndia ? "numeric" : "text"}
                  value={formData.pincode || ""}
                  onChange={(event) =>
                    updateField(
                      "pincode",
                      normalizePincodeInput(event.target.value, formData.country),
                    )
                  }
                  placeholder={
                    isIndia ? "e.g., 400001" : "e.g., 10001 or SW1A 1AA"
                  }
                  className="mt-1.5"
                  required={isRequired(VENDOR_FIELD_SECTIONS.PINCODE)}
                  maxLength={isIndia ? 6 : undefined}
                  data-testid="vendor-pincode-input"
                />
              </div>
            </div>
          </FormSection>

          {!invoiceVendorRequest ? (
            <>
              <FormSection
                title="Bank details"
                description="Used for vendor payouts. Changes require re-entry for security."
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {bankFields.map(renderInputField)}
                </div>

                <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50/80 px-3 py-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-100">
                  Bank details are sensitive. To change them later, delete and re-enter the account information.
                </div>
              </FormSection>

              <FormSection title="Notes">
                <textarea
                  value={formData.notes}
                  onChange={(event) => updateField("notes", event.target.value)}
                  className="w-full min-h-[96px] rounded-md border border-input bg-background px-3 py-2 text-sm"
                  placeholder="Special instructions, payment preferences, or internal remarks…"
                  required={isRequired(VENDOR_FIELD_SECTIONS.REMARKS)}
                />
              </FormSection>
            </>
          ) : null}

          <div className="flex gap-3 pt-2 border-t sticky bottom-0 bg-background pb-1">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1"
              data-testid="vendor-submit-button"
              disabled={submitting || (gstVerificationRequired && !gstVerificationSatisfied)}
            >
              {submitting ? "Saving…" : submitLabel}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default VendorDetailsDialog;
