import React from "react";
import { VENDOR_FIELD_SECTIONS } from "../../../../utils/vendorFieldConfig";
import ReadOnlyField, { ReadOnlyValue } from "./ReadOnlyField";

const SubsectionHeading = ({ title, description }) => (
  <div className="flex flex-col items-start self-stretch">
    <h4 className="font-['Manrope'] text-base font-semibold leading-5 text-foreground">{title}</h4>
    {description ? (
      <p className="pt-0.5 text-xs leading-4 text-muted-foreground">{description}</p>
    ) : null}
  </div>
);

const yesNo = (value) => (value ? "Yes" : "No");

const ViewTaxInformationSection = ({ formData, labelFor }) => {
  const tdsApplicable = Boolean(formData.tdsApplicable);

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
          description="Tax registration details for this vendor."
        />

        <div className="flex w-full flex-col items-start gap-6">
          <div className="flex w-full items-start gap-4">
            <ReadOnlyField
              label={labelFor(VENDOR_FIELD_SECTIONS.PAN_NO, "PAN No.")}
              value={formData.pan}
              className="flex-1"
            />
            <ReadOnlyField
              label={labelFor(VENDOR_FIELD_SECTIONS.PAN_STATUS, "PAN Status")}
              value={formData.panStatus}
              className="flex-1"
            />
          </div>

          <div className="flex w-full items-start gap-4">
            <ReadOnlyField
              label={labelFor(VENDOR_FIELD_SECTIONS.PAN_REFERENCE_NO, "PAN Reference No.")}
              value={formData.panReferenceNo}
              className="flex-1"
            />
            <ReadOnlyField
              label={labelFor(VENDOR_FIELD_SECTIONS.NATURE_OF_ASSESSEE, "Nature of Assessee")}
              value={formData.natureOfAssessee}
              className="flex-1"
            />
          </div>
        </div>
      </div>

      <div id="tds" className="flex scroll-mt-4 flex-col items-start gap-6 px-4 py-8">
        <div className="flex w-full items-center gap-6">
          <div className="flex-1">
            <SubsectionHeading
              title="TDS"
              description="optional, for historical records only"
            />
          </div>
          <ReadOnlyValue value={yesNo(tdsApplicable)} className="shrink-0" />
        </div>

        {tdsApplicable ? (
          <div className="flex w-full flex-col items-start gap-6">
            <div className="flex w-full items-start gap-4">
              <ReadOnlyField
                label={labelFor(VENDOR_FIELD_SECTIONS.TDS_GROUP, "TDS Group/List")}
                value={formData.tdsGroup}
                className="flex-1"
              />
              <ReadOnlyField
                label={labelFor(VENDOR_FIELD_SECTIONS.TCS_GROUP, "TCS Group/List")}
                value={formData.tcsGroup}
                className="flex-1"
              />
            </div>

            <div className="flex w-full items-start gap-4">
              <ReadOnlyField
                label={labelFor(
                  VENDOR_FIELD_SECTIONS.LOW_NIL_DEDUCTION_CERTIFICATE_NO,
                  "Low/Nil Deduction Certificate No.",
                )}
                value={formData.lowNilDeductionCertificateNo}
                className="flex-1"
              />
              <ReadOnlyField
                label={labelFor(VENDOR_FIELD_SECTIONS.CERTIFICATE_VALIDITY, "Certificate Validity")}
                value={formData.certificateValidity}
                className="flex-1"
              />
            </div>

            <ReadOnlyField
              label={labelFor(VENDOR_FIELD_SECTIONS.SPECIFIED_PERSON_206AB, "206AB Specified Person")}
              value={yesNo(formData.specifiedPerson206AB)}
              className="w-full sm:w-1/3"
            />
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default ViewTaxInformationSection;
