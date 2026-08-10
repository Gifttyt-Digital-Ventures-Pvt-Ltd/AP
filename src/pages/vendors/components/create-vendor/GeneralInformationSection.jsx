import React from "react";
import { Building2, User } from "lucide-react";
import { Checkbox } from "../../../../components/ui/checkbox";
import { Input } from "../../../../components/ui/input";
import { Label } from "../../../../components/ui/label";
import AppSelect from "../../../../components/common/AppSelect";
import { useGetAvailableCurrenciesQuery } from "../../../../Services/apis/corporateApi";
import {
  CURRENCY_SCREENS,
  FALLBACK_CURRENCIES,
  formatCurrency,
  mergeCurrencyOptions,
} from "../../../../utils/currency";
import { VENDOR_FIELD_SECTIONS } from "../../../../utils/vendorFieldConfig";

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
}) => {
  const nameLabel =
    formData.vendor_type === "Company"
      ? labelFor(VENDOR_FIELD_SECTIONS.COMPANY_NAME, "Vendor Name")
      : "Full Name";

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

  return (
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
                {nameLabel} *
              </Label>
              <Input
                value={formData.name || ""}
                onChange={(event) => updateField("name", event.target.value)}
                placeholder="e.g., Acme Corporation"
                className="mt-1.5"
                data-testid="vendor-name-input"
                required
              />
            </div>

            <div className="flex-1">
              <Label>
                {labelFor(VENDOR_FIELD_SECTIONS.TRADE_NAME, "Trade Name")}
                {isRequired(VENDOR_FIELD_SECTIONS.TRADE_NAME) ? " *" : ""}
              </Label>
              <Input
                value={formData.trade_name || ""}
                onChange={(event) =>
                  updateField("trade_name", event.target.value)
                }
                placeholder="e.g., Tensai"
                className="mt-1.5"
                data-testid="vendor-trade-name-input"
                required={isRequired(VENDOR_FIELD_SECTIONS.TRADE_NAME)}
              />
            </div>

            <div className="flex-1">
              <Label>
                {labelFor(VENDOR_FIELD_SECTIONS.VENDOR_ID, "Vendor Code/ID")} *
              </Label>
              <Input
                value={formData.vendorId || ""}
                onChange={(event) =>
                  updateField("vendorId", event.target.value)
                }
                placeholder="Auto-generated on save"
                className="mt-1.5"
                data-testid="vendor-id-input"
                required
              />
            </div>
          </div>

          <div className="w-full">
            <Label>
              {labelFor(VENDOR_FIELD_SECTIONS.VENDOR_TYPE, "Vendor Type")} *
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
                {labelFor(VENDOR_FIELD_SECTIONS.CATEGORY, "Category")} *
              </Label>
              <AppSelect
                value={formData.category || ""}
                onChange={(event) =>
                  updateField("category", event.target.value)
                }
                options={CATEGORY_OPTIONS}
                placeholder="Select Category"
                className="mt-1.5"
              />
            </div>

            <div className="flex-1">
              <Label>
                {labelFor(VENDOR_FIELD_SECTIONS.CURRENCY, "Currency")}
                {isRequired(VENDOR_FIELD_SECTIONS.CURRENCY) ? " *" : ""}
              </Label>
              <AppSelect
                value={formData.currency || ""}
                onChange={(event) => updateField("currency", event.target.value)}
                options={resolvedCurrencyOptions}
                placeholder="Select Currency"
                className="mt-1.5"
              />
            </div>
          </div>

          <div className="flex w-full items-start gap-4">
            <div className="flex-1">
              <Label>
                {labelFor(VENDOR_FIELD_SECTIONS.PAYMENT_TERMS, "Payment Terms")} *
              </Label>
              <AppSelect
                value={formData.paymentTerms || ""}
                onChange={(event) =>
                  updateField("paymentTerms", event.target.value)
                }
                options={PAYMENT_TERMS_OPTIONS}
                placeholder="Select Payment Terms"
                className="mt-1.5"
              />
            </div>

            <div className="flex-1">
              <Label>
                {labelFor(
                  VENDOR_FIELD_SECTIONS.MODE_OF_DELIVERY,
                  "Mode of Delivery",
                )}
                {isRequired(VENDOR_FIELD_SECTIONS.MODE_OF_DELIVERY) ? " *" : ""}
              </Label>
              <Input
                value={formData.modeOfDelivery || ""}
                onChange={(event) => updateField("modeOfDelivery", event.target.value)}
                placeholder="e.g., Road / Air / Courier"
                className="mt-1.5"
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
                {isRequired(VENDOR_FIELD_SECTIONS.DELIVERY_TERMS) ? " *" : ""}
              </Label>
              <AppSelect
                value={formData.deliveryTerms || ""}
                onChange={(event) =>
                  updateField("deliveryTerms", event.target.value)
                }
                options={DELIVERY_TERMS_OPTIONS}
                placeholder="Select Delivery Terms"
                className="mt-1.5"
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
                {labelFor(VENDOR_FIELD_SECTIONS.VENDOR_STATUS, "Vendor Status")} *
              </Label>
              <AppSelect
                value={formData.vendorStatus || ""}
                onChange={(event) =>
                  updateField("vendorStatus", event.target.value)
                }
                options={VENDOR_STATUS_OPTIONS}
                placeholder="Select Vendor Status"
                className="mt-1.5"
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
                {isRequired(VENDOR_FIELD_SECTIONS.MSME) ? " *" : ""}
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
                      )} *
                    </Label>
                    <Input
                      value={formData.udyamRegistrationNo || ""}
                      onChange={(event) =>
                        updateField("udyamRegistrationNo", event.target.value)
                      }
                      placeholder="UDYAM-XX-00-0000000"
                      className="mt-1.5 bg-background"
                      required
                    />
                  </div>
                  <div className="flex-1">
                    <Label>
                      {labelFor(
                        VENDOR_FIELD_SECTIONS.MSME_CATEGORY,
                        "MSME Category",
                      )} *
                    </Label>
                    <AppSelect
                      value={formData.msmeCategory || ""}
                      onChange={(event) =>
                        updateField("msmeCategory", event.target.value)
                      }
                      options={MSME_CATEGORY_OPTIONS}
                      placeholder="Select MSME Category"
                      className="mt-1.5 bg-background"
                    />
                  </div>
                </div>
                <p className="mt-3 text-xs leading-4 text-muted-foreground">
                  Confirmed by you as in-scope — drives the mandatory 45-day
                  payment rule under the MSME Act.
                </p>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
};

export default GeneralInformationSection;
