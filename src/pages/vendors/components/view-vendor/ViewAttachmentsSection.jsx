import React from "react";
import { FileText } from "lucide-react";
import {
  VENDOR_DOCUMENT_TYPES,
  formatVendorDocumentSize,
  normalizeVendorDocuments,
} from "../../utils/vendorDocuments";

const ViewDocumentRow = ({ label, document }) => (
  <div className="rounded-lg border border-border bg-background p-3">
    <div className="min-w-0">
      <p className="text-sm font-medium text-foreground">{label}</p>
      {document ? (
        <div className="mt-2 flex items-start gap-2 text-sm">
          <FileText className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <div className="min-w-0">
            <p className="truncate font-medium text-foreground">{document.fileName}</p>
            <p className="text-xs text-muted-foreground">
              {formatVendorDocumentSize(document.fileSize)}
              {document.mimeType ? ` · ${document.mimeType}` : ""}
            </p>
          </div>
        </div>
      ) : (
        <p className="mt-2 text-xs text-muted-foreground">No file uploaded</p>
      )}
    </div>
  </div>
);

const ViewAttachmentsSection = ({ documents, visibleDocumentTypes, showDocuments = true }) => {
  const normalizedDocuments = normalizeVendorDocuments(documents);
  const documentTypes =
    Array.isArray(visibleDocumentTypes) && visibleDocumentTypes.length > 0
      ? visibleDocumentTypes
      : VENDOR_DOCUMENT_TYPES;

  return (
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
              Documents on file for this vendor.
            </p>
          </div>
          <div className="grid w-full grid-cols-1 gap-4 sm:grid-cols-2">
            {documentTypes.map(({ key, label }) => (
              <ViewDocumentRow key={key} label={label} document={normalizedDocuments[key]} />
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default ViewAttachmentsSection;
