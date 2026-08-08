import React from "react";
import { Download, FileText, X } from "lucide-react";
import { Button } from "../../../components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../../../components/ui/dialog";
import { resolveVendorDocumentUrl } from "../utils/vendorDocuments";

const isPdfDocument = (fileName = "", mimeType = "") =>
  mimeType.includes("pdf") || fileName.toLowerCase().endsWith(".pdf");

const isImageDocument = (fileName = "", mimeType = "") =>
  mimeType.includes("image") ||
  [".png", ".jpg", ".jpeg", ".gif", ".webp"].some((ext) => fileName.toLowerCase().endsWith(ext));

const VendorDocumentPreviewDialog = ({ open, onOpenChange, label, document }) => {
  const fileUrl = document?.fileUrl ? resolveVendorDocumentUrl(document.fileUrl) : "";
  const fileName = document?.fileName || "Document";
  const mimeType = document?.mimeType || "";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        fullscreen
        hideClose
        overlayClassName="bg-black/80"
        data-testid="vendor-document-preview-dialog"
      >
        <DialogHeader className="sr-only">
          <DialogTitle>{label ? `${label} — ${fileName}` : fileName}</DialogTitle>
        </DialogHeader>
        <div className="flex h-full min-h-0 w-full flex-col overflow-hidden bg-muted/30">
          <div className="flex shrink-0 items-center justify-between gap-3 border-b bg-background px-4 py-2">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-foreground">{label || fileName}</p>
              <p className="truncate text-xs text-muted-foreground">{fileName}</p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {fileUrl ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(fileUrl, "_blank", "noopener,noreferrer")}
                >
                  <Download className="mr-2 h-4 w-4" />
                  Download
                </Button>
              ) : null}
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => onOpenChange(false)}
                aria-label="Close preview"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
          </div>

          <div className="flex flex-1 items-center justify-center overflow-auto p-4">
            {fileUrl ? (
              isPdfDocument(fileName, mimeType) ? (
                <iframe src={fileUrl} title={fileName} className="h-full w-full bg-white shadow-lg" />
              ) : isImageDocument(fileName, mimeType) ? (
                <img
                  src={fileUrl}
                  alt={fileName}
                  className="max-h-full max-w-full bg-white object-contain shadow-lg"
                />
              ) : (
                <div className="text-center text-muted-foreground">
                  <FileText className="mx-auto mb-4 h-16 w-16 opacity-50" />
                  <p>Preview not available for this file type.</p>
                </div>
              )
            ) : (
              <div className="text-center text-muted-foreground">
                <FileText className="mx-auto mb-4 h-16 w-16 opacity-50" />
                <p>No file to preview.</p>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default VendorDocumentPreviewDialog;
