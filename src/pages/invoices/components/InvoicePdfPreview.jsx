import React from "react";
import { FileText, Maximize2, ZoomIn, ZoomOut } from "lucide-react";
import { Button } from "../../../components/ui/button";

export const InvoicePdfPreview = ({
  fileURL,
  file,
  zoom = 100,
  invoice = null,
  imageError = false,
  setImageError = () => {},
  setPdfZoom = () => {},
  getInvoiceFileUrl = () => null,
}) => {
  const displayUrl = fileURL || getInvoiceFileUrl(invoice);
  const fileName = file?.name || invoice?.original_file_name || "Invoice.pdf";
  const isPdf = file?.type?.includes("pdf") || fileName?.toLowerCase().endsWith(".pdf");
  const isImage = file?.type?.includes("image") || [".png", ".jpg", ".jpeg", ".gif", ".webp"].some((ext) => fileName?.toLowerCase().endsWith(ext));
  const hasFile = Boolean(displayUrl);

  return (
    <div className="bg-gray-100 rounded-lg overflow-hidden h-full flex flex-col">
      <div className="flex items-center justify-between px-4 py-2 bg-white border-b">
        <span className="text-sm font-medium text-gray-600 truncate max-w-[200px]">{fileName}</span>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => setPdfZoom((z) => Math.max(50, z - 10))}>
            <ZoomOut className="h-4 w-4" />
          </Button>
          <span className="text-sm text-gray-500">{zoom}%</span>
          <Button variant="ghost" size="sm" onClick={() => setPdfZoom((z) => Math.min(200, z + 10))}>
            <ZoomIn className="h-4 w-4" />
          </Button>
          {hasFile && (
            <Button variant="ghost" size="sm" onClick={() => window.open(displayUrl, "_blank")} title="Open in new tab">
              <Maximize2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
      <div className="flex-1 overflow-auto p-4 flex items-center justify-center bg-gray-200">
        {hasFile && !imageError ? (
          isPdf ? (
            <iframe src={displayUrl} className="bg-white shadow-lg w-full h-full" style={{ minHeight: "600px" }} title="Invoice PDF" />
          ) : isImage ? (
            <img
              src={displayUrl}
              alt="Invoice"
              className="bg-white shadow-lg max-w-full max-h-full object-contain"
              style={{ transform: `scale(${zoom / 100})`, transformOrigin: "center" }}
              onError={() => setImageError(true)}
            />
          ) : (
            <div className="text-center text-gray-500">
              <FileText className="h-16 w-16 mx-auto mb-4 opacity-50" />
              <p>No preview available</p>
            </div>
          )
        ) : (
          <div className="text-center text-gray-500">
            <FileText className="h-16 w-16 mx-auto mb-4 opacity-50" />
            <p>No preview available</p>
            <p className="text-xs mt-2 text-gray-400">{imageError ? "Failed to load file" : "Original file not stored"}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default InvoicePdfPreview;
