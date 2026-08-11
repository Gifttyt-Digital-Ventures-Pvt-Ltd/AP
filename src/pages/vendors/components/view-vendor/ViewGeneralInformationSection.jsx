import React from "react";
import { Label } from "../../../../components/ui/label";
import { formatCurrency } from "../../../../utils/currency";
import { VENDOR_FIELD_SECTIONS } from "../../../../utils/vendorFieldConfig";
import ReadOnlyField, { ReadOnlyValue } from "./ReadOnlyField";

const SubsectionHeading = ({ title, description }) => (
  <div className="flex flex-col items-start self-stretch">
    <h4 className="font-['Manrope'] text-base font-semibold leading-5 text-foreground">
      {title}
    </h4>
    {description ? (
      <p className="pt-0.5 text-xs leading-4 text-muted-foreground">{description}</p>
    ) : null}
  </div>
);

const yesNo = (value) => (value ? "Yes" : "No");

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

const ViewGeneralInformationSection = ({ formData, labelFor }) => {
  const nameLabel =
    formData.vendor_type === "Company"
      ? labelFor(VENDOR_FIELD_SECTIONS.COMPANY_NAME, "Vendor Name")
      : "Full Name";

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
          description="Vendor type and registered name."
        />

        <div className="flex w-full flex-col items-start gap-6">
          <div className="flex w-full items-start gap-4">
            <ReadOnlyField label={nameLabel} value={formData.name} className="flex-1" />
            <ReadOnlyField
              label={labelFor(VENDOR_FIELD_SECTIONS.TRADE_NAME, "Trade Name")}
              value={formData.trade_name}
              className="flex-1"
            />
            <ReadOnlyField
              label={labelFor(VENDOR_FIELD_SECTIONS.VENDOR_ID, "Vendor Code/ID")}
              value={formData.vendorId}
              className="flex-1"
            />
          </div>

          <ReadOnlyField
            label={labelFor(VENDOR_FIELD_SECTIONS.VENDOR_TYPE, "Vendor Type")}
            value={formData.vendor_type}
            className="w-full"
          />
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
            <ReadOnlyField
              label={labelFor(VENDOR_FIELD_SECTIONS.CATEGORY, "Category")}
              value={formData.category}
              className="flex-1"
            />
            <ReadOnlyField
              label={labelFor(VENDOR_FIELD_SECTIONS.CURRENCY, "Currency")}
              value={formData.currency}
              className="flex-1"
            />
          </div>

          <div className="flex w-full items-start gap-4">
            <ReadOnlyField
              label={labelFor(VENDOR_FIELD_SECTIONS.PAYMENT_TERMS, "Payment Terms")}
              value={formData.paymentTerms}
              className="flex-1"
            />
            <ReadOnlyField
              label={labelFor(VENDOR_FIELD_SECTIONS.MODE_OF_DELIVERY, "Mode of Delivery")}
              value={formData.modeOfDelivery}
              className="flex-1"
            />
          </div>

          <div className="flex w-full items-start gap-4">
            <ReadOnlyField
              label={labelFor(VENDOR_FIELD_SECTIONS.DELIVERY_TERMS, "Delivery Terms")}
              value={formData.deliveryTerms}
              className="flex-1"
            />
            <ReadOnlyField
              label="Vendor Balance"
              value={formatVendorBalance(formData)}
              className="flex-1"
            />
          </div>
        </div>
      </div>

      <div id="flags-status" className="flex scroll-mt-4 flex-col items-start gap-6 px-4 py-8">
        <SubsectionHeading
          title="Flags & Status"
          description="Vendor classification and status details."
        />

        <div className="flex w-full flex-col items-start gap-6">
          <div className="flex w-full items-start gap-4">
            <ReadOnlyField
              label={labelFor(VENDOR_FIELD_SECTIONS.VENDOR_STATUS, "Vendor Status")}
              value={formData.vendorStatus}
              className="flex-1"
            />
            <ReadOnlyField
              label={labelFor(VENDOR_FIELD_SECTIONS.ONE_TIME_VENDOR, "One Time Vendor")}
              value={yesNo(formData.oneTimeVendor)}
              className="flex-1"
            />
            <ReadOnlyField
              label={labelFor(VENDOR_FIELD_SECTIONS.FOREIGN_VENDOR, "Foreign Vendor")}
              value={yesNo(formData.foreignVendor)}
              className="flex-1"
            />
          </div>

          <div className="flex w-full flex-col items-start gap-2">
            <ReadOnlyField
              label={labelFor(VENDOR_FIELD_SECTIONS.MSME, "MSME registered vendor")}
              value={yesNo(formData.msme)}
              className="w-full sm:w-1/3"
            />

            {formData.msme ? (
              <div className="w-full rounded-lg border border-border bg-purple-50 p-4">
                <div className="flex w-full items-start gap-4">
                  <div className="flex-1">
                    <Label>
                      {labelFor(VENDOR_FIELD_SECTIONS.UDYAM_REGISTRATION_NO, "Udyam Registration No")}
                    </Label>
                    <ReadOnlyValue value={formData.udyamRegistrationNo} className="mt-1" />
                  </div>
                  <div className="flex-1">
                    <Label>{labelFor(VENDOR_FIELD_SECTIONS.MSME_CATEGORY, "MSME Category")}</Label>
                    <ReadOnlyValue value={formData.msmeCategory} className="mt-1" />
                  </div>
                </div>
                <p className="mt-3 text-xs leading-4 text-muted-foreground">
                  Confirmed as in-scope — drives the mandatory 45-day payment rule under the MSME Act.
                </p>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ViewGeneralInformationSection;
