import React from "react";
import { ChevronLeft } from "lucide-react";
import { Button } from "../../../components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../../../components/ui/dialog";

const ScanningOverlay = () => (
  <div
    className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-white/80 backdrop-blur-sm"
    data-testid="invoice-scanning-overlay"
  >
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4" />
    <p className="text-sm font-medium text-primary">Extracting bill details...</p>
    <p className="text-xs text-muted-foreground mt-1">
      Please wait while AI reads your invoice
    </p>
  </div>
);

const UploadSection = ({
  uploadedFile,
  setUploadedFile,
  setUploadedFileURL,
  setFormData,
  setActiveTab,
  renderPdfPreview,
  uploadedFileURL,
  pdfZoom,
  uploadPreviewError,
  setUploadPreviewError,
  scanning,
  renderInvoiceForm,
  handleAddInvoice,
}) => {
  if (!uploadedFile) return null;
  const closeUpload = () => {
    setUploadedFile(null);
    setUploadedFileURL(null);
    setFormData(null);
    setActiveTab("list");
  };

  return (
    <Dialog open={Boolean(uploadedFile)} onOpenChange={(open) => !open && closeUpload()}>
      <DialogContent
        fullscreen
        hideClose
        overlayClassName="bg-black/80"
        data-testid="upload-invoice-dialog"
      >
        <DialogHeader className="sr-only">
          <DialogTitle>Upload & Scan Invoice</DialogTitle>
        </DialogHeader>
        <div className="flex h-full min-h-0 w-full flex-col overflow-hidden">
          <div className="flex shrink-0 items-center justify-between gap-3 border-b bg-gray-50 px-4 py-2">
            <div className="flex min-w-0 items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={closeUpload}
                className="p-1 text-gray-600 hover:text-gray-800"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="truncate text-sm font-semibold">
                Upload & Scan Invoice - {uploadedFile?.name || "Draft"}
              </span>
            </div>
          </div>

          <div className="relative min-h-0 flex-1 overflow-hidden">
            <div className="grid h-full min-h-0 grid-cols-1 overflow-hidden lg:grid-cols-[35%_65%]">
              <div className="min-h-0 h-full overflow-hidden border-r">
                {renderPdfPreview({
                  fileURL: uploadedFileURL,
                  file: uploadedFile,
                  zoom: pdfZoom,
                  imageError: uploadPreviewError,
                  setImageError: setUploadPreviewError,
                })}
              </div>

              <div className="flex min-h-0 flex-col overflow-hidden p-4">
                {!scanning ? (
                  <>
                    <div className="min-h-0 flex-1 overflow-y-auto pr-2 scrollbar-thin-muted">
                      {renderInvoiceForm({ isEdit: false, hideActions: true })}
                    </div>
                    <div className="mt-4 flex shrink-0 gap-3 border-t bg-white pt-4">
                      <Button variant="outline" onClick={closeUpload} className="flex-1">
                        Cancel
                      </Button>
                      <Button
                        onClick={handleAddInvoice}
                        className="flex-1"
                        data-testid="add-invoice-btn"
                      >
                        Add Invoice
                      </Button>
                    </div>
                  </>
                ) : null}
              </div>
            </div>
            {scanning ? <ScanningOverlay /> : null}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default UploadSection;
