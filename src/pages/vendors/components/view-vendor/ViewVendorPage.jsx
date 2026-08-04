import React, { useRef } from "react";
import { X } from "lucide-react";
import { Button } from "../../../../components/ui/button";
import { useRBAC } from "../../../../contexts/RBACContext";
import { getVendorFieldDisplayName, VENDOR_FIELD_SECTIONS } from "../../../../utils/vendorFieldConfig";
import {
  getVisibleVendorDocumentTypes,
  hasVisibleVendorDocuments,
} from "../../../../utils/vendorDocumentConfig";
import VendorFormSectionNav from "../create-vendor/VendorFormSectionNav";
import ViewGeneralInformationSection from "./ViewGeneralInformationSection";
import ViewAddressBranchInformationSection from "./ViewAddressBranchInformationSection";
import ViewTaxInformationSection from "./ViewTaxInformationSection";
import ViewBankDetailsSection from "./ViewBankDetailsSection";
import ViewAttachmentsSection from "./ViewAttachmentsSection";
import ViewNotesSection from "./ViewNotesSection";
import ReadOnlyField from "./ReadOnlyField";

const NAV_SECTIONS = [
  {
    id: "general-information",
    label: "General Information",
    headerWeight: "semibold",
    children: [
      { id: "vendor-identity", label: "Vendor Identity" },
      { id: "classification-commercial-terms", label: "Classification & Commercial Terms" },
      { id: "flags-status", label: "Flags & Status" },
    ],
  },
  {
    id: "address-branch-information",
    label: "Address & Branch Information",
    headerWeight: "medium",
    children: [
      { id: "gstin-details", label: "GSTIN Details" },
      { id: "vendor-branches", label: "Vendor Branches" },
      { id: "legacy-tax-identifiers", label: "Legacy tax identifiers (Pre-GST)" },
    ],
  },
  { id: "contact-details", label: "Contact Details", headerWeight: "semibold" },
  {
    id: "tax-information",
    label: "Tax Information",
    headerWeight: "medium",
    children: [
      { id: "pan-details", label: "PAN Details" },
      { id: "tds", label: "TDS" },
    ],
  },
  {
    id: "bank-details",
    label: "Bank Details",
    headerWeight: "semibold",
    children: [{ id: "vendor-bank-details", label: "Vendor Bank Details" }],
  },
  {
    id: "attachments",
    label: "Attachments",
    headerWeight: "semibold",
    children: [{ id: "vendor-documents", label: "Vendor Documents" }],
  },
  { id: "notes", label: "Notes", headerWeight: "semibold" },
];

const CONTACT_FIELDS = [
  { key: "email", section: VENDOR_FIELD_SECTIONS.EMAIL_ID },
  { key: "mobile", section: VENDOR_FIELD_SECTIONS.MOBILE_NO },
  { key: "phone", section: VENDOR_FIELD_SECTIONS.PHONE_NO },
  { key: "contact_person", section: VENDOR_FIELD_SECTIONS.CONTACT_PERSON },
  { key: "website", section: VENDOR_FIELD_SECTIONS.WEBSITE },
];

const ViewVendorPage = ({ formData, onClose, onEdit }) => {
  const contentPaneRef = useRef(null);
  const { corporateScreens } = useRBAC();
  const vendorFieldConfiguration = corporateScreens?.vendorFieldConfiguration ?? [];
  const activeVendorDocuments = corporateScreens?.activeVendorDocuments;
  const vendorDocumentConfiguration = corporateScreens?.vendorDocumentConfiguration ?? [];
  const visibleVendorDocumentTypes = getVisibleVendorDocumentTypes(
    activeVendorDocuments,
    vendorDocumentConfiguration,
  );
  const showVendorDocumentsSection = hasVisibleVendorDocuments(
    activeVendorDocuments,
    vendorDocumentConfiguration,
  );

  const labelFor = (sectionId, fallback = "") =>
    getVendorFieldDisplayName(sectionId, vendorFieldConfiguration) || fallback;

  if (!formData) return null;

  return (
    <div className="-m-4 flex min-h-0 flex-1 flex-col overflow-hidden" data-testid="view-vendor-page">
      <div className="flex shrink-0 items-center justify-between border-b border-border bg-muted/20 px-4 py-3">
        <div className="flex flex-col items-start pl-1">
          <h1 className="overflow-hidden text-xl font-bold leading-7 text-foreground">
            {formData.name || "View Vendor"}
          </h1>
          <div className="flex h-7 items-center justify-center rounded-md">
            <p className="text-center text-xs font-medium leading-4 text-muted-foreground">
              Vendor details in OptiFii
            </p>
          </div>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onClose}
          aria-label="Close"
          data-testid="view-vendor-close"
          className="opacity-70"
        >
          <X className="h-6 w-6 text-foreground" />
        </Button>
      </div>

      <div className="flex min-h-0 flex-1 overflow-hidden">
        <aside className="hidden min-h-0 w-96 shrink-0 md:flex md:flex-col">
          <VendorFormSectionNav sections={NAV_SECTIONS} scrollContainerRef={contentPaneRef} />
        </aside>

        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          <div ref={contentPaneRef} className="min-h-0 flex-1 overflow-y-auto px-6 pb-6 pt-6">
            <div className="space-y-10">
              <div id="general-information" className="scroll-mt-4">
                <ViewGeneralInformationSection formData={formData} labelFor={labelFor} />
              </div>

              <div id="address-branch-information" className="scroll-mt-4">
                <ViewAddressBranchInformationSection
                  formData={formData}
                  labelFor={labelFor}
                  gstRegistrations={formData.gstRegistrations}
                  vendorBranches={formData.vendorBranches}
                />
              </div>

              <section id="contact-details" className="-mx-6 scroll-mt-4 border-b border-border px-10">
                <div className="flex flex-col items-start self-stretch border-b border-border py-6">
                  <h3 className="font-['Manrope'] text-lg font-semibold leading-6 text-foreground">
                    Contact Details
                  </h3>
                </div>

                <div className="flex flex-col items-start gap-6 px-4 pb-8 pt-6">
                  <div className="flex w-full items-start gap-4">
                    {CONTACT_FIELDS.slice(0, 3).map(({ key, section }) => (
                      <ReadOnlyField
                        key={key}
                        label={labelFor(section)}
                        value={formData[key]}
                        className="flex-1"
                      />
                    ))}
                  </div>

                  <div className="flex w-full items-start gap-4">
                    {CONTACT_FIELDS.slice(3).map(({ key, section }) => (
                      <ReadOnlyField
                        key={key}
                        label={labelFor(section)}
                        value={formData[key]}
                        className="flex-1"
                      />
                    ))}
                    <div className="flex-1" />
                  </div>
                </div>
              </section>

              <div id="tax-information" className="scroll-mt-4">
                <ViewTaxInformationSection formData={formData} labelFor={labelFor} />
              </div>

              <div id="bank-details" className="scroll-mt-4">
                <ViewBankDetailsSection bankAccounts={formData.bankAccounts || []} />
              </div>

              <div id="attachments" className="scroll-mt-4">
                <ViewAttachmentsSection
                  documents={formData.documents}
                  visibleDocumentTypes={visibleVendorDocumentTypes}
                  showDocuments={showVendorDocumentsSection}
                />
              </div>

              <div id="notes" className="scroll-mt-4">
                <ViewNotesSection notes={formData.notes} />
              </div>
            </div>
          </div>

          <div className="flex shrink-0 items-start gap-3 bg-background px-4 py-1">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose}>
              Close
            </Button>
            {onEdit ? (
              <Button type="button" className="flex-1" onClick={onEdit}>
                Edit Vendor
              </Button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ViewVendorPage;
