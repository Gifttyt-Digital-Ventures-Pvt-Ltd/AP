import React, { useState } from "react";
import { ChevronDown } from "lucide-react";
import { VENDOR_FIELD_SECTIONS } from "../../../../utils/vendorFieldConfig";
import { normalizeFormGstRegistrations } from "../../utils/vendorGstRegistrations";
import { normalizeVendorBranches } from "../../utils/vendorBranches";
import ReadOnlyField from "./ReadOnlyField";

const SubsectionHeading = ({ title, description }) => (
  <div className="flex flex-col items-start self-stretch">
    <h4 className="font-['Manrope'] text-base font-semibold leading-5 text-foreground">{title}</h4>
    {description ? (
      <p className="pt-0.5 text-xs leading-4 text-muted-foreground">{description}</p>
    ) : null}
  </div>
);

const yesNo = (value) => (value ? "Yes" : "No");

const ViewGstinsList = ({ registrations = [] }) => {
  const rows = normalizeFormGstRegistrations(registrations);
  if (!rows.length) {
    return (
      <div className="rounded-lg border border-border bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
        No GSTINs added for this vendor.
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col items-start gap-6">
      {rows.map((registration, index) => (
        <div
          key={registration._clientId || registration.gstin || index}
          className="w-full rounded-lg border border-border bg-muted/20 p-4"
        >
          <div className="flex w-full flex-col items-start gap-6">
            <div className="flex w-full items-start gap-4">
              <ReadOnlyField label="GSTIN" value={registration.gstin} className="flex-1" />
              <ReadOnlyField
                label="GST Registration Type"
                value={registration.registrationType}
                className="flex-1"
              />
              <ReadOnlyField
                label="HSN/SAC Default Code"
                value={registration.hsnSacDefaultCode}
                className="flex-1"
              />
            </div>
            <div className="flex w-full items-start gap-4">
              <ReadOnlyField
                label="State"
                value={registration.location?.state || registration.state}
                className="flex-1"
              />
              <ReadOnlyField
                label="Reverse Charge Applicable"
                value={yesNo(registration.reverseChargeApplicable)}
                className="flex-1"
              />
              <ReadOnlyField
                label="e-Invoicing Applicable"
                value={yesNo(registration.eInvoicingApplicable)}
                className="flex-1"
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

const ViewBranchesList = ({ branches = [] }) => {
  const rows = normalizeVendorBranches(branches);
  if (!rows.length) {
    return (
      <div className="rounded-lg border border-border bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
        No vendor branches configured for this vendor.
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col items-start gap-6">
      {rows.map((row, index) => (
        <div key={row.id || index} className="w-full rounded-lg border border-border bg-muted/20 p-4">
          <div className="flex w-full flex-col items-start gap-6">
            <div className="flex w-full items-start gap-4">
              <ReadOnlyField label="Branch Name" value={row.branchName} className="flex-1" />
              <ReadOnlyField label="Branch Code" value={row.branchCode} className="flex-1" />
              <ReadOnlyField label="Map GSTIN" value={row.gstin} className="flex-1" />
            </div>
            <ReadOnlyField label="Address Line 1" value={row.addressLine1} className="w-full" />
            <div className="flex w-full items-start gap-4">
              <ReadOnlyField label="Address Line 2" value={row.addressLine2} className="flex-1" />
              <ReadOnlyField label="City" value={row.city} className="flex-1" />
              <ReadOnlyField label="District" value={row.district} className="flex-1" />
            </div>
            <div className="flex w-full items-start gap-4">
              <ReadOnlyField label="State" value={row.state} className="flex-1" />
              <ReadOnlyField label="Pincode" value={row.pincode} className="flex-1" />
              <ReadOnlyField label="Country" value={row.country || "India"} className="flex-1" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

const ViewAddressBranchInformationSection = ({
  formData,
  labelFor,
  gstRegistrations,
  vendorBranches,
}) => {
  const [legacyOpen, setLegacyOpen] = useState(true);

  return (
    <div className="-mx-6 border-b border-border px-10">
      <div className="flex flex-col items-start self-stretch border-b border-border py-6">
        <h3 className="font-['Manrope'] text-lg font-semibold leading-6 text-foreground">
          Address &amp; Branch Information
        </h3>
      </div>

      <div
        id="gstin-details"
        className="flex scroll-mt-4 flex-col items-start gap-6 border-b border-border px-4 pb-8 pt-6"
      >
        <SubsectionHeading title="GSTIN Details" description="GSTIN details associated with this vendor." />
        <ViewGstinsList registrations={gstRegistrations} />
      </div>

      <div
        id="vendor-branches"
        className="flex scroll-mt-4 flex-col items-start gap-6 border-b border-border px-4 py-8"
      >
        <SubsectionHeading
          title="Vendor Branches"
          description="Configure branch locations and map each branch to one of the GSTINs above. Multiple branches can share the same GSTIN."
        />
        <ViewBranchesList branches={vendorBranches} />
      </div>

      <div id="legacy-tax-identifiers" className="flex scroll-mt-4 flex-col items-start gap-6 px-4 py-8">
        <div className="flex w-full flex-col items-start">
          <button
            type="button"
            onClick={() => setLegacyOpen((open) => !open)}
            className="flex items-center gap-1"
          >
            <span className="font-['Manrope'] text-base font-semibold leading-5 text-foreground">
              Legacy tax identifiers (Pre-GST)
            </span>
            <ChevronDown
              className={`h-5 w-5 text-foreground/50 transition-transform ${legacyOpen ? "rotate-180" : ""}`}
            />
          </button>
          <p className="pt-0.5 text-xs leading-4 text-muted-foreground">
            optional, for historical records only
          </p>
        </div>

        {legacyOpen ? (
          <div className="flex w-full flex-col items-start gap-6">
            <div className="flex w-full items-start gap-4">
              <ReadOnlyField
                label={labelFor(VENDOR_FIELD_SECTIONS.IEC_NUMBER, "IEC Number")}
                value={formData.iecNumber}
                className="flex-1"
              />
              <ReadOnlyField
                label={labelFor(VENDOR_FIELD_SECTIONS.TAN, "TAN")}
                value={formData.tan}
                className="flex-1"
              />
              <ReadOnlyField
                label={labelFor(VENDOR_FIELD_SECTIONS.TIN, "TIN")}
                value={formData.tin}
                className="flex-1"
              />
            </div>
            <div className="flex w-full items-start gap-4">
              <ReadOnlyField
                label={labelFor(VENDOR_FIELD_SECTIONS.STC, "STC")}
                value={formData.stc}
                className="flex-1"
              />
              <ReadOnlyField
                label={labelFor(VENDOR_FIELD_SECTIONS.ST_REGISTRATION_NUMBER, "ST Registration Number")}
                value={formData.stRegistrationNumber}
                className="flex-1"
              />
              <div className="flex-1" />
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default ViewAddressBranchInformationSection;
