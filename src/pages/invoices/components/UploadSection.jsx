import React from "react";
import { ChevronLeft } from "lucide-react";
import { Button } from "../../../components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../../../components/ui/dialog";

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
        className="w-screen max-w-none h-screen max-h-none p-0 m-0 rounded-none border-0 overflow-hidden"
        data-testid="upload-invoice-dialog"
      >
        <DialogHeader className="sr-only">
          <DialogTitle>Upload & Scan Invoice</DialogTitle>
        </DialogHeader>
        <div className="h-full min-h-0 flex flex-col overflow-hidden">
          <div className="flex shrink-0 items-center justify-between gap-3 px-4 py-2 border-b bg-gray-50">
          <div className="min-w-0 flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={closeUpload}
                className="text-gray-600 hover:text-gray-800 p-1"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="truncate font-semibold text-sm">
                Upload & Scan Invoice - {uploadedFile?.name || "Draft"}
              </span>
            </div>
            <div className="shrink-0 flex items-center gap-2">
            </div>
          </div>

          <div className="relative grid grid-cols-1 lg:grid-cols-[35%_65%] h-[calc(100%-49px)] min-h-0 overflow-hidden">
            <div className="border-r h-full min-h-0 overflow-hidden">
              {renderPdfPreview({
                fileURL: uploadedFileURL,
                file: uploadedFile,
                zoom: pdfZoom,
                imageError: uploadPreviewError,
                setImageError: setUploadPreviewError,
              })}
            </div>

            <div className="min-h-0 overflow-hidden p-4 flex flex-col">
              {scanning ? (
                <div className="flex flex-col items-center justify-center h-full">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
                  <p className="text-muted-foreground">Scanning invoice with AI...</p>
                </div>
              ) : (
                <>
                  <div className="flex-1 min-h-0 overflow-y-auto pr-2 scrollbar-thin-muted">
                    {renderInvoiceForm({ isEdit: false, hideActions: true })}
                  </div>
                  <div className="shrink-0 flex gap-3 pt-4 mt-4 border-t bg-white">
                    <Button
                      variant="outline"
                      onClick={closeUpload}
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleAddInvoice}
                      className="flex-1"
                      data-testid="add-invoice-btn"
                      disabled={scanning}
                    >
                      Add Invoice
                    </Button>
                  </div>
                </>
              )}
            </div>

            {scanning && (
              <div className="absolute inset-0 z-20 bg-white/80 backdrop-blur-sm rounded-lg flex flex-col items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
                <p className="text-sm font-medium text-primary">Extracting bill details...</p>
                <p className="text-xs text-muted-foreground mt-1">Please wait while AI reads your invoice</p>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default UploadSection;
