import React from "react";
import VendorDocumentsPanel from "../VendorDocumentsPanel";

const AttachmentsSection = ({
  documents,
  onChange,
  disabled,
  visibleDocumentTypes,
  showDocuments = true,
}) => (
  <div className="-mx-6 border-b border-border px-10">
    <div className="flex flex-col items-start self-stretch border-b border-border py-6">
      <h3 className="font-['Manrope'] text-lg font-semibold leading-6 text-foreground">
        Attachments
      </h3>
    </div>

    {showDocuments ? (
      <div
        id="vendor-documents"
        className="flex scroll-mt-4 flex-col items-start gap-6 px-4 pb-8 pt-6"
      >
        <div className="flex flex-col items-start self-stretch">
          <h4 className="font-['Manrope'] text-base font-semibold leading-5 text-foreground">
            Vendor documents
          </h4>
          <p className="pt-0.5 text-xs leading-4 text-muted-foreground">
            Upload supporting documents for this vendor. All documents are optional.
          </p>
        </div>
        <VendorDocumentsPanel
          documents={documents}
          onChange={onChange}
          disabled={disabled}
          visibleDocumentTypes={visibleDocumentTypes}
        />
      </div>
    ) : null}
  </div>
);

export default AttachmentsSection;
