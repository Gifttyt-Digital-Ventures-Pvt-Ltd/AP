import React from "react";
import { ChevronLeft } from "lucide-react";
import { Button } from "../../../components/ui/button";

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

  return (
    <div className="h-[calc(100vh-130px)]">
      <div className="mb-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setUploadedFile(null);
            setUploadedFileURL(null);
            setFormData(null);
            setActiveTab("list");
          }}
          className="text-gray-600 hover:text-gray-800"
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Back to Invoices
        </Button>
      </div>

      <div className="relative grid grid-cols-1 lg:grid-cols-[35%_65%] gap-3 h-[calc(100%-40px)]">
        {renderPdfPreview({
          fileURL: uploadedFileURL,
          file: uploadedFile,
          zoom: pdfZoom,
          imageError: uploadPreviewError,
          setImageError: setUploadPreviewError,
        })}

        <div className="bg-white rounded-lg border shadow-sm p-4 flex flex-col overflow-hidden">
          {scanning ? (
            <div className="flex flex-col items-center justify-center h-full">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
              <p className="text-muted-foreground">Scanning invoice with AI...</p>
            </div>
          ) : (
            <>
              <div className="flex-1 overflow-y-auto pr-2">{renderInvoiceForm({ isEdit: false, hideActions: true })}</div>
              <div className="flex gap-3 pt-4 mt-4 border-t bg-white">
                <Button
                  variant="outline"
                  onClick={() => {
                    setUploadedFile(null);
                    setUploadedFileURL(null);
                    setFormData(null);
                    setActiveTab("list");
                  }}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button onClick={handleAddInvoice} className="flex-1" data-testid="add-invoice-btn">
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
  );
};

export default UploadSection;
