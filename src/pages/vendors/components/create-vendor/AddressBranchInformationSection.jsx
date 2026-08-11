import React, { useState } from "react";
import { ChevronDown, Loader2, Plus } from "lucide-react";
import { Button } from "../../../../components/ui/button";
import { Input } from "../../../../components/ui/input";
import { Label } from "../../../../components/ui/label";
import { VENDOR_FIELD_SECTIONS } from "../../../../utils/vendorFieldConfig";
import { getVendorFieldErrorClassName } from "../../../../utils/vendorValidation";
import FetchVendorResultsPreview from "../FetchVendorResultsPreview";
import CreateVendorGstinsEditor from "./CreateVendorGstinsEditor";
import CreateVendorBranchesEditor from "./CreateVendorBranchesEditor";
import { createEmptyVendorBranch } from "../../utils/vendorBranches";

const SubsectionHeading = ({ title, description }) => (
  <div className="flex flex-col items-start self-stretch">
    <h4 className="font-['Manrope'] text-base font-semibold leading-5 text-foreground">{title}</h4>
    {description ? (
      <p className="pt-0.5 text-xs leading-4 text-muted-foreground">{description}</p>
    ) : null}
  </div>
);

const AddOutlineButton = ({ children, ...props }) => (
  <Button type="button" variant="outline" size="sm" className="gap-2 text-xs" {...props}>
    <Plus className="h-4 w-4" />
    {children}
  </Button>
);

const AddressBranchInformationSection = ({
  formData,
  updateField,
  isRequired,
  labelFor,
  gstRegistrations,
  vendorBranches,
  showPortalFetch,
  gstVerificationEnabled,
  fetchGstinQuery,
  setFetchGstinQuery,
  isFetchLoading,
  fetchMessage,
  fetchMessageIsError,
  clearFetchFeedback,
  handleFetchDetails,
  fetchedRecords,
  selectedFetchedGstins,
  setSelectedFetchedGstins,
  lastFetchMode,
  applySelectedFetchedRegistrations,
  addManualGstRegistration,
  updateGstRegistration,
  removeGstRegistration,
  updateVendorBranches,
  isVendorFetchReady,
  isEditMode = false,
  fieldErrors = {},
}) => {
  const [legacyOpen, setLegacyOpen] = useState(true);
  const errorClass = (key) => getVendorFieldErrorClassName(fieldErrors, key);

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
        <div className="flex w-full items-center gap-6">
          <div className="flex-1">
            <SubsectionHeading
              title={`GSTIN Details${isRequired(VENDOR_FIELD_SECTIONS.GST_NO) ? " *" : ""}`}
              description={
                isEditMode
                  ? "GSTIN details associated with this vendor."
                  : showPortalFetch
                    ? "Fetch vendor details from the GST portal by GSTIN, or add a GSTIN block manually."
                    : "Add a GSTIN block manually."
              }
            />
          </div>
          <AddOutlineButton onClick={addManualGstRegistration}>Add GSTIN</AddOutlineButton>
        </div>

        <div className="flex w-full flex-col items-start gap-6">
          {showPortalFetch ? (
            <div className="w-full rounded-lg border border-border bg-purple-50 p-4">
              <div className="flex w-full flex-col items-start gap-3">
                {gstVerificationEnabled ? (
                  <div className="w-full">
                    <Label htmlFor="vendor-fetch-gstin">GSTIN for lookup</Label>
                    <Input
                      id="vendor-fetch-gstin"
                      value={fetchGstinQuery}
                      onChange={(event) => {
                        setFetchGstinQuery(event.target.value.toUpperCase());
                        if (fetchMessageIsError) clearFetchFeedback();
                      }}
                      placeholder="27ABCDE1234F1Z5"
                      className="mt-1.5 font-mono uppercase"
                      maxLength={15}
                      aria-invalid={fetchMessageIsError}
                      data-testid="vendor-fetch-gstin-input"
                    />
                  </div>
                ) : null}
                <div className="flex w-full justify-end">
                  <Button
                    type="button"
                    onClick={handleFetchDetails}
                    disabled={isFetchLoading || !isVendorFetchReady({ gstin: fetchGstinQuery })}
                  >
                    {isFetchLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Fetching…
                      </>
                    ) : (
                      "Fetch Details"
                    )}
                  </Button>
                </div>
                {fetchMessage ? (
                  <p
                    className={`text-xs ${fetchMessageIsError ? "text-destructive" : "text-muted-foreground"}`}
                  >
                    {fetchMessage}
                  </p>
                ) : null}
                <FetchVendorResultsPreview
                  fetchMode={lastFetchMode}
                  records={fetchedRecords}
                  selectedGstins={selectedFetchedGstins}
                  onToggleGstin={(gstin) => {
                    setSelectedFetchedGstins((prev) => {
                      const next = new Set(prev);
                      if (next.has(gstin)) next.delete(gstin);
                      else next.add(gstin);
                      return next;
                    });
                  }}
                  onSelectAll={() =>
                    setSelectedFetchedGstins(new Set(fetchedRecords.map((record) => record.gstin)))
                  }
                  onSelectNone={() => setSelectedFetchedGstins(new Set())}
                  onApply={applySelectedFetchedRegistrations}
                />
              </div>
            </div>
          ) : null}

          <CreateVendorGstinsEditor
            registrations={gstRegistrations}
            onUpdate={updateGstRegistration}
            onRemove={removeGstRegistration}
            portalFetchEnabled={showPortalFetch}
            gstinRequired={isRequired(VENDOR_FIELD_SECTIONS.GST_NO)}
          />
        </div>
      </div>

      <div
        id="vendor-branches"
        className="flex scroll-mt-4 flex-col items-start gap-6 border-b border-border px-4 py-8"
      >
        <div className="flex w-full items-center gap-6">
          <div className="flex-1">
            <SubsectionHeading
              title="Vendor Branches"
              description="Configure branch locations and map each branch to one of the GSTINs above. Multiple branches can share the same GSTIN."
            />
          </div>
          <AddOutlineButton
            onClick={() => updateVendorBranches([...vendorBranches, createEmptyVendorBranch()])}
          >
            Add Branch
          </AddOutlineButton>
        </div>

        <CreateVendorBranchesEditor
          branches={vendorBranches}
          gstRegistrations={gstRegistrations}
          onChange={updateVendorBranches}
        />
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
            <div className="w-full rounded-lg border border-border bg-amber-50 px-4 py-3">
              <p className="text-sm leading-5 text-muted-foreground">
                TIN, STC and ST Registration Number pre-date GST (July 2017). Only fill these in if
                you&apos;re migrating a vendor with historical VAT/Service Tax records — new vendors
                typically won&apos;t have them (Open Question #3).
              </p>
            </div>

            <div className="flex w-full items-start gap-4">
              <div className="flex-1">
                <Label>
                  {labelFor(VENDOR_FIELD_SECTIONS.IEC_NUMBER, "IEC Number")}
                  {isRequired(VENDOR_FIELD_SECTIONS.IEC_NUMBER) ? " *" : ""}
                </Label>
                <Input
                  value={formData.iecNumber || ""}
                  onChange={(event) => updateField("iecNumber", event.target.value.toUpperCase())}
                  placeholder="Import Export Code"
                  className={`mt-1.5 uppercase ${errorClass("iecNumber")}`}
                  required={isRequired(VENDOR_FIELD_SECTIONS.IEC_NUMBER)}
                />
              </div>
              <div className="flex-1">
                <Label>
                  {labelFor(VENDOR_FIELD_SECTIONS.TAN, "TAN")}
                  {isRequired(VENDOR_FIELD_SECTIONS.TAN) ? " *" : ""}
                </Label>
                <Input
                  value={formData.tan || ""}
                  onChange={(event) => updateField("tan", event.target.value.toUpperCase())}
                  placeholder="Tax Deduction Account Number"
                  className={`mt-1.5 uppercase ${errorClass("tan")}`}
                  required={isRequired(VENDOR_FIELD_SECTIONS.TAN)}
                />
              </div>
              <div className="flex-1">
                <Label>
                  {labelFor(VENDOR_FIELD_SECTIONS.TIN, "TIN")}
                  {isRequired(VENDOR_FIELD_SECTIONS.TIN) ? " *" : ""}
                </Label>
                <Input
                  value={formData.tin || ""}
                  onChange={(event) => updateField("tin", event.target.value)}
                  placeholder="Legacy VAT ID"
                  className={`mt-1.5 ${errorClass("tin")}`}
                  required={isRequired(VENDOR_FIELD_SECTIONS.TIN)}
                />
              </div>
            </div>

            <div className="flex w-full items-start gap-4">
              <div className="flex-1">
                <Label>
                  {labelFor(VENDOR_FIELD_SECTIONS.STC, "STC")}
                  {isRequired(VENDOR_FIELD_SECTIONS.STC) ? " *" : ""}
                </Label>
                <Input
                  value={formData.stc || ""}
                  onChange={(event) => updateField("stc", event.target.value)}
                  placeholder="Legacy Service Tax Code"
                  className={`mt-1.5 ${errorClass("stc")}`}
                  required={isRequired(VENDOR_FIELD_SECTIONS.STC)}
                />
              </div>
              <div className="flex-1">
                <Label>
                  {labelFor(VENDOR_FIELD_SECTIONS.ST_REGISTRATION_NUMBER, "ST Registration Number")}
                  {isRequired(VENDOR_FIELD_SECTIONS.ST_REGISTRATION_NUMBER) ? " *" : ""}
                </Label>
                <Input
                  value={formData.stRegistrationNumber || ""}
                  onChange={(event) => updateField("stRegistrationNumber", event.target.value)}
                  placeholder="Legacy Sales Tax reg. no."
                  className={`mt-1.5 ${errorClass("stRegistrationNumber")}`}
                  required={isRequired(VENDOR_FIELD_SECTIONS.ST_REGISTRATION_NUMBER)}
                />
              </div>
              <div className="flex-1" />
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default AddressBranchInformationSection;
