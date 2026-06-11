import React, { useState } from "react";
import { ChevronLeft, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { Button } from "../../../components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../../../components/ui/dialog";

const BulkEditDialog = ({
  open,
  setOpen,
  bulkCreating,
  bulkEditForm,
  bulkEditItemId,
  bulkPreviewItems,
  bulkEditFileURL,
  pdfZoom,
  bulkEditPreviewError,
  setBulkEditPreviewError,
  saveBulkEditChanges,
  renderPdfPreview,
  renderBulkEditInvoiceForm,
}) => {
  const selectedItem =
    bulkPreviewItems.find((item) => item.id === bulkEditItemId) || null;
  const selectedFile = selectedItem?.file || null;
  const [previewOpen, setPreviewOpen] = useState(true);

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => !bulkCreating && setOpen(nextOpen)}
    >
      <DialogContent
        className="w-[96vw] max-w-[96vw] h-[92vh] max-h-[92vh] p-0 overflow-hidden"
        data-testid="bulk-edit-dialog"
      >
        <DialogHeader className="sr-only">
          <DialogTitle>Edit Extracted Invoice</DialogTitle>
        </DialogHeader>
        {bulkEditForm && (
          <div className="h-full min-h-0 flex flex-col overflow-hidden">
            <div className="flex shrink-0 items-center justify-between gap-3 px-4 py-2 border-b bg-gray-50">
              <div className="min-w-0 flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setOpen(false)}
                  className="text-gray-600 hover:text-gray-800 p-1"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="truncate font-semibold text-sm">
                  Bulk Edit Invoice -{" "}
                  {bulkEditForm.invoiceNumber ||
                    selectedItem?.filename ||
                    "Draft"}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setPreviewOpen((p) => !p)}
                  className="h-7 gap-1.5 text-xs text-muted-foreground hover:text-foreground ml-1"
                  title={previewOpen ? "Hide preview" : "Show preview"}
                >
                  {previewOpen ? (
                    <PanelLeftClose className="h-4 w-4" />
                  ) : (
                    <PanelLeftOpen className="h-4 w-4" />
                  )}
                  <span className="hidden sm:inline">
                    {previewOpen ? "Hide Preview" : "Show Preview"}
                  </span>
                </Button>
              </div>
              <div className="shrink-0 flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setOpen(false)}
                >
                  Cancel
                </Button>
                <Button size="sm" onClick={saveBulkEditChanges}>
                  Save Changes
                </Button>
              </div>
            </div>

            <div className="flex flex-1 min-h-0 overflow-hidden">
              <div
                className={`transition-all duration-300 ease-in-out min-h-0 overflow-hidden border-r flex-shrink-0 ${
                  previewOpen ? "w-[35%]" : "w-0 border-r-0"
                }`}
              >
                {renderPdfPreview({
                  fileURL: bulkEditFileURL,
                  file: selectedFile,
                  zoom: pdfZoom,
                  imageError: bulkEditPreviewError,
                  setImageError: setBulkEditPreviewError,
                })}
              </div>
              <div className="flex-1 min-w-0 min-h-0 p-4 flex flex-col">
                {renderBulkEditInvoiceForm()}
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default BulkEditDialog;
