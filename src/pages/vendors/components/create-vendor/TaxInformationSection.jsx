import React, { useMemo } from "react";
import { Checkbox } from "../../../../components/ui/checkbox";
import { Input } from "../../../../components/ui/input";
import { Label } from "../../../../components/ui/label";
import { Switch } from "../../../../components/ui/switch";
import AppSelect from "../../../../components/common/AppSelect";
import { VENDOR_FIELD_SECTIONS } from "../../../../utils/vendorFieldConfig";
import { getVendorFieldErrorClassName } from "../../../../utils/vendorValidation";
import { useGetTdsSectionsQuery } from "../../../../Services/apis/taxApi";
import { DEFAULT_TDS_SECTIONS } from "../../../invoices/utils/tds";

const PAN_STATUS_OPTIONS = ["Verified", "Unverified", "Invalid", "Not Available"];
const NATURE_OF_ASSESSEE_OPTIONS = [
  "Individual",
  "HUF",
  "Firm",
  "Company",
  "AOP/BOI",
  "Trust",
  "Government",
];
const TCS_GROUP_OPTIONS = ["None", "Group A", "Group B", "Group C"];

// Same real TDS section codes VendorTdsPanel/TdsSelectionField already use for
// invoices — just the section codes (194C, 194J, ...), not the rate combos,
// since this is a vendor-level default classification, not a per-transaction rate pick.
const buildTdsSectionOptions = (sections = []) => {
  const codes = new Set();
  [...(Array.isArray(sections) ? sections : []), ...DEFAULT_TDS_SECTIONS].forEach((section) => {
    const code = String(
      section?.section_code ?? section?.sectionCode ?? section?.code ?? section?.section ?? "",
    )
      .trim()
      .toUpperCase();
    if (code) codes.add(code);
  });
  return ["None", ...Array.from(codes).sort()];
};

const SubsectionHeading = ({ title, description }) => (
  <div className="flex flex-col items-start self-stretch">
    <h4 className="font-['Manrope'] text-base font-semibold leading-5 text-foreground">{title}</h4>
    {description ? (
      <p className="pt-0.5 text-xs leading-4 text-muted-foreground">{description}</p>
    ) : null}
  </div>
);

const TaxInformationSection = ({
  formData,
  updateField,
  isRequired,
  labelFor,
  submitting,
  isEditMode = false,
  fieldErrors = {},
}) => {
  const tdsApplicable = Boolean(formData.tdsApplicable);
  const errorClass = (key) => getVendorFieldErrorClassName(fieldErrors, key);
  const requiredMark = (sectionId) => (isRequired(sectionId) ? " *" : "");
  const { data: tdsSectionsData = [] } = useGetTdsSectionsQuery();
  const tdsGroupOptions = useMemo(
    () => buildTdsSectionOptions(tdsSectionsData),
    [tdsSectionsData],
  );

  return (
  <div className="-mx-6 border-b border-border px-10">
    <div className="flex flex-col items-start self-stretch border-b border-border py-6">
      <h3 className="font-['Manrope'] text-lg font-semibold leading-6 text-foreground">
        Tax Information
      </h3>
    </div>

    <div
      id="pan-details"
      className="flex scroll-mt-4 flex-col items-start gap-6 border-b border-border px-4 pb-8 pt-6"
    >
      <SubsectionHeading
        title="PAN Details"
        description={
          isEditMode
            ? "Tax registration details for this vendor."
            : "Permanent Account Number and related identifiers."
        }
      />

      <div className="flex w-full flex-col items-start gap-6">
        <div className="flex w-full items-start gap-4">
          <div className="flex-1">
            <Label>
              {labelFor(VENDOR_FIELD_SECTIONS.PAN_NO, "PAN No.")}
              {requiredMark(VENDOR_FIELD_SECTIONS.PAN_NO)}
            </Label>
            <Input
              value={formData.pan || ""}
              onChange={(event) => updateField("pan", event.target.value.toUpperCase())}
              placeholder="e.g., ABCDE1234F"
              className={`mt-1.5 font-mono uppercase ${errorClass("pan")}`}
              maxLength={10}
              required={isRequired(VENDOR_FIELD_SECTIONS.PAN_NO)}
            />
          </div>
          <div className="flex-1">
            <Label>
              {labelFor(VENDOR_FIELD_SECTIONS.PAN_STATUS, "PAN Status")}
              {requiredMark(VENDOR_FIELD_SECTIONS.PAN_STATUS)}
            </Label>
            <AppSelect
              value={formData.panStatus || ""}
              onChange={(event) => updateField("panStatus", event.target.value)}
              options={PAN_STATUS_OPTIONS}
              placeholder="Select PAN Status"
              className={`mt-1.5 ${errorClass("panStatus")}`}
            />
          </div>
        </div>

        <div className="flex w-full items-start gap-4">
          <div className="flex-1">
            <Label>{labelFor(VENDOR_FIELD_SECTIONS.PAN_REFERENCE_NO, "PAN Reference No.")}</Label>
            <Input
              value={formData.panReferenceNo || ""}
              onChange={(event) => updateField("panReferenceNo", event.target.value)}
              placeholder="e.g., PAN-REF-0042"
              className={`mt-1.5 ${errorClass("panReferenceNo")}`}
            />
          </div>
          <div className="flex-1">
            <Label>
              {labelFor(VENDOR_FIELD_SECTIONS.NATURE_OF_ASSESSEE, "Nature of Assessee")}
              {requiredMark(VENDOR_FIELD_SECTIONS.NATURE_OF_ASSESSEE)}
            </Label>
            <AppSelect
              value={formData.natureOfAssessee || ""}
              onChange={(event) => updateField("natureOfAssessee", event.target.value)}
              options={NATURE_OF_ASSESSEE_OPTIONS}
              placeholder="Select Nature of Assessee"
              className={`mt-1.5 ${errorClass("natureOfAssessee")}`}
            />
          </div>
        </div>
      </div>
    </div>

    <div id="tds" className="flex scroll-mt-4 flex-col items-start gap-6 px-4 py-8">
      <div className="flex w-full items-center gap-6">
        <div className="flex-1">
          <SubsectionHeading
            title="TDS"
            description={
              isEditMode
                ? "optional, for historical records only"
                : "Tax deducted at source configuration for this vendor."
            }
          />
        </div>
        <Switch
          checked={tdsApplicable}
          disabled={submitting}
          onCheckedChange={(checked) => updateField("tdsApplicable", checked === true)}
          className="data-[state=checked]:bg-green-600"
        />
      </div>

      {tdsApplicable ? (
        <div className="flex w-full flex-col items-start gap-6">
          <div className="flex w-full items-start gap-4">
            <div className="flex-1">
              <Label>
                {labelFor(VENDOR_FIELD_SECTIONS.TDS_GROUP, "TDS Group/List")}
                {requiredMark(VENDOR_FIELD_SECTIONS.TDS_GROUP)}
              </Label>
              <AppSelect
                value={formData.tdsGroup || ""}
                onChange={(event) => updateField("tdsGroup", event.target.value)}
                options={tdsGroupOptions}
                placeholder="Select TDS Group"
                className={`mt-1.5 ${errorClass("tdsGroup")}`}
              />
            </div>
            <div className="flex-1">
              <Label>
                {labelFor(VENDOR_FIELD_SECTIONS.TCS_GROUP, "TCS Group/List")}
                {requiredMark(VENDOR_FIELD_SECTIONS.TCS_GROUP)}
              </Label>
              <AppSelect
                value={formData.tcsGroup || ""}
                onChange={(event) => updateField("tcsGroup", event.target.value)}
                options={TCS_GROUP_OPTIONS}
                placeholder="Select TCS Group"
                className={`mt-1.5 ${errorClass("tcsGroup")}`}
              />
            </div>
          </div>

          <div className="flex w-full items-start gap-4">
            <div className="flex-1">
              <Label>
                {labelFor(
                  VENDOR_FIELD_SECTIONS.LOW_NIL_DEDUCTION_CERTIFICATE_NO,
                  "Low/Nil Deduction Certificate No.",
                )}
                {requiredMark(VENDOR_FIELD_SECTIONS.LOW_NIL_DEDUCTION_CERTIFICATE_NO)}
              </Label>
              <Input
                value={formData.lowNilDeductionCertificateNo || ""}
                onChange={(event) =>
                  updateField("lowNilDeductionCertificateNo", event.target.value)
                }
                placeholder="e.g., LDC-0042"
                className={`mt-1.5 ${errorClass("lowNilDeductionCertificateNo")}`}
              />
            </div>
            <div className="flex-1">
              <Label>
                {labelFor(VENDOR_FIELD_SECTIONS.CERTIFICATE_VALIDITY, "Certificate Validity")}
                {requiredMark(VENDOR_FIELD_SECTIONS.CERTIFICATE_VALIDITY)}
              </Label>
              <Input
                type="date"
                value={formData.certificateValidity || ""}
                onChange={(event) => updateField("certificateValidity", event.target.value)}
                className={`mt-1.5 ${errorClass("certificateValidity")}`}
              />
            </div>
          </div>

          <div className="flex w-full flex-col items-start gap-1">
            <div className="flex items-center gap-2">
              <Checkbox
                id="vendor-206ab"
                checked={Boolean(formData.specifiedPerson206AB)}
                onCheckedChange={(checked) => updateField("specifiedPerson206AB", checked === true)}
              />
              <Label htmlFor="vendor-206ab" className="cursor-pointer font-normal">
                {labelFor(VENDOR_FIELD_SECTIONS.SPECIFIED_PERSON_206AB, "206AB Specified Person")}
                {requiredMark(VENDOR_FIELD_SECTIONS.SPECIFIED_PERSON_206AB)}
              </Label>
            </div>
            <p className="pl-6 text-xs leading-4 text-muted-foreground">
              Flags higher TDS for non-filers — may overlap with PAN Status = Invalid; confirm you
              need both.
            </p>
          </div>
        </div>
      ) : null}
    </div>
  </div>
  );
};

export default TaxInformationSection;
