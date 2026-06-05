import React, { useState } from "react";
import { ChevronLeft, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { Button } from "../../../components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../../../components/ui/dialog";
import { isSavedInvoiceStatus } from "../../../utils/approvalWorkflow";

const EditDialog = ({
  editDialogOpen,
  setEditDialogOpen,
  selectedInvoice,
  formData,
  handleUpdateInvoice,
  handleForwardSavedInvoice,
  canForwardSavedDraft = false,
  forwardSavedInvoiceLoading = false,
  renderPdfPreview,
  pdfZoom,
  viewPreviewError,
  setViewPreviewError,
  renderInvoiceForm,
}) => {
  const isSavedDraft = isSavedInvoiceStatus(selectedInvoice?.status);
  const isSaving = forwardSavedInvoiceLoading;
  const [previewOpen, setPreviewOpen] = useState(true);

  return (
    <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
      <DialogContent
        className="w-[96vw] max-w-[96vw] h-[92vh] max-h-[92vh] p-0 overflow-hidden"
        data-testid="edit-invoice-dialog"
      >
        <DialogHeader className="sr-only">
          <DialogTitle>
            {isSavedDraft ? "Edit Saved Draft" : "Edit Invoice"}{" "}
            {selectedInvoice?.invoiceNumber || ""}
          </DialogTitle>
        </DialogHeader>
        {selectedInvoice && formData && (
          <div className="h-full min-h-0 flex flex-col overflow-hidden ">
            <div className="flex shrink-0 items-center justify-between gap-3 px-4 py-2 border-b bg-gray-50 pr-9">
              <div className="min-w-0 flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setEditDialogOpen(false)}
                  className="text-gray-600 hover:text-gray-800 p-1"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="truncate font-semibold text-sm">
                  {isSavedDraft ? "Edit Saved Draft" : "Edit Invoice"} -{" "}
                  {selectedInvoice.invoiceNumber || "Draft"}
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
                  onClick={() => setEditDialogOpen(false)}
                  disabled={isSaving}
                >
                  Cancel
                </Button>
                <Button
                  variant={isSavedDraft ? "secondary" : "default"}
                  size="sm"
                  onClick={handleUpdateInvoice}
                  disabled={isSaving}
                >
                  {isSavedDraft ? "Save Draft" : "Update Invoice"}
                </Button>
                {isSavedDraft && (
                  <Button
                    variant="default"
                    size="sm"
                    onClick={handleForwardSavedInvoice}
                    disabled={!canForwardSavedDraft || isSaving}
                    data-testid="submit-saved-invoice-btn"
                  >
                    {isSaving ? "Submitting..." : "Submit to Checker"}
                  </Button>
                )}
              </div>
            </div>

            <div className="flex flex-1 min-h-0 overflow-hidden">
              <div
                className={`transition-all duration-300 ease-in-out min-h-0 overflow-hidden border-r flex-shrink-0 ${
                  previewOpen ? "w-[35%]" : "w-0 border-r-0"
                }`}
              >
                {renderPdfPreview({
                  invoice: selectedInvoice,
                  zoom: pdfZoom,
                  imageError: viewPreviewError,
                  setImageError: setViewPreviewError,
                })}
              </div>
              <div className="flex-1 min-w-0 min-h-0 p-4 flex flex-col">
                {renderInvoiceForm({
                  isEdit: true,
                  hideActions: true,
                  isSavedDraft,
                })}
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default EditDialog;
