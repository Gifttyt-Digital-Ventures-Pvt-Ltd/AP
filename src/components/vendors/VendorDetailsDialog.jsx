import React from "react";
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
} from "../../utils/vendorValidation";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";

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

  if (!formData) return null;

  const isRequired = (sectionId) =>
    !invoiceVendorRequest && isVendorFieldRequired(sectionId, activeVendorFields);

  const labelFor = (sectionId, fallback = "") =>
    getVendorFieldDisplayName(sectionId, vendorFieldConfiguration) || fallback;

  const isIndia = isIndiaCountry(formData.country);
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
    testId,
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
          data-testid={testId}
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
        className="max-w-4xl max-h-[90vh] overflow-y-auto"
        data-testid={testId}
        onInteractOutside={(event) => event.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">{title}</DialogTitle>
          {description && (
            <p className="text-sm text-muted-foreground">{description}</p>
          )}
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-6">
          <Tabs defaultValue="basic" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="basic">Basic Info</TabsTrigger>
              <TabsTrigger value="tax">Tax Info</TabsTrigger>
              <TabsTrigger value="bank">Bank Details</TabsTrigger>
              <TabsTrigger value="additional">Additional</TabsTrigger>
            </TabsList>

            <TabsContent value="basic" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label>
                    {labelFor(VENDOR_FIELD_SECTIONS.VENDOR_TYPE, "Vendor Type")}
                    {invoiceVendorRequest || isRequired(VENDOR_FIELD_SECTIONS.VENDOR_TYPE)
                      ? " *"
                      : ""}
                  </Label>
                  <div className="flex gap-4 mt-2">
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
                        className={`flex-1 p-4 border-2 rounded-lg flex items-center justify-center gap-2 transition-all ${
                          formData.vendor_type === type
                            ? "border-accent bg-accent/10"
                            : "border-border hover:border-accent/50"
                        }`}
                      >
                        {type === "Company" ? (
                          <Building2 className="h-5 w-5" />
                        ) : (
                          <User className="h-5 w-5" />
                        )}
                        <span className="font-medium">{type}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="col-span-2">
                  <Label>
                    {nameLabel}
                    {invoiceVendorRequest || isRequired(VENDOR_FIELD_SECTIONS.COMPANY_NAME)
                      ? " *"
                      : ""}
                  </Label>
                  <Input
                    value={formData.name}
                    onChange={(event) =>
                      updateField("name", event.target.value)
                    }
                    placeholder={
                      formData.vendor_type === "Company"
                        ? "e.g., Acme Corporation"
                        : "e.g., John Doe"
                    }
                    data-testid="vendor-name-input"
                    required={
                      invoiceVendorRequest ||
                      isRequired(VENDOR_FIELD_SECTIONS.COMPANY_NAME)
                    }
                  />
                </div>

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
                    <SelectTrigger>
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
                    <SelectTrigger>
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
                        normalizePincodeInput(
                          event.target.value,
                          formData.country,
                        ),
                      )
                    }
                    placeholder={
                      isIndia ? "e.g., 400001" : "e.g., 10001 or SW1A 1AA"
                    }
                    required={isRequired(VENDOR_FIELD_SECTIONS.PINCODE)}
                    maxLength={isIndia ? 6 : undefined}
                    data-testid="vendor-pincode-input"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    {isIndia
                      ? "Enter a 6-digit pincode for India"
                      : "Enter the postal code for the selected country"}
                  </p>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="tax" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div key="pan">
                  <Label>
                    {labelFor(VENDOR_FIELD_SECTIONS.PAN_NO, "PAN Number")}
                    {isRequired(VENDOR_FIELD_SECTIONS.PAN_NO) ? " *" : ""}
                  </Label>
                  <Input
                    value={formData.pan}
                    onChange={(event) =>
                      updateField("pan", event.target.value.toUpperCase())
                    }
                    placeholder="ABCDE1234F"
                    maxLength={10}
                    className="uppercase"
                    required={isRequired(VENDOR_FIELD_SECTIONS.PAN_NO)}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    10-digit alphanumeric PAN number
                  </p>
                </div>

                <div>
                  <Label>
                    {labelFor(VENDOR_FIELD_SECTIONS.GST_NO, "GSTIN/TAX ID")}
                    {isRequired(VENDOR_FIELD_SECTIONS.GST_NO) ? " *" : ""}
                  </Label>
                  <Input
                    value={formData.gstin}
                    onChange={(event) =>
                      updateField("gstin", event.target.value.toUpperCase())
                    }
                    placeholder={
                      isIndia ? "29ABCDE1234F1Z5" : "Enter GSTIN or Tax ID"
                    }
                    maxLength={isIndia ? 15 : undefined}
                    className="uppercase"
                    required={isRequired(VENDOR_FIELD_SECTIONS.GST_NO)}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    {isIndia
                      ? "15-character GST Identification Number"
                      : "Optional tax identifier for the vendor country"}
                  </p>
                </div>

                {!invoiceVendorRequest && (
                  <div className="col-span-2 flex items-center gap-2 pt-1">
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
                )}
              </div>
            </TabsContent>

            <TabsContent value="bank" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                {bankFields.map(renderInputField)}
              </div>

              <div className="bg-amber-50 dark:bg-amber-950/20 rounded-lg p-4 border border-amber-200 dark:border-amber-900 mt-4">
                <h4 className="font-semibold mb-2 text-amber-900 dark:text-amber-100">
                  Warning: Bank Details Security
                </h4>
                <p className="text-sm text-amber-800 dark:text-amber-200">
                  To modify vendor's bank details, you need to delete and
                  re-enter the information. This ensures payment security and
                  prevents unauthorized changes.
                </p>
              </div>
            </TabsContent>

            <TabsContent value="additional" className="space-y-4 mt-4">
              <div>
                <Label>
                  {labelFor(VENDOR_FIELD_SECTIONS.REMARKS, "Notes")}
                  {isRequired(VENDOR_FIELD_SECTIONS.REMARKS) ? " *" : ""}
                </Label>
                <textarea
                  value={formData.notes}
                  onChange={(event) => updateField("notes", event.target.value)}
                  className="w-full min-h-[120px] rounded-md border border-input bg-background px-3 py-2 text-sm"
                  placeholder="Add any additional notes or special instructions..."
                  required={isRequired(VENDOR_FIELD_SECTIONS.REMARKS)}
                />
              </div>
            </TabsContent>
          </Tabs>

          <div className="flex gap-3 pt-4 border-t">
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
              disabled={submitting}
            >
              {submitting ? "Saving..." : submitLabel}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default VendorDetailsDialog;
