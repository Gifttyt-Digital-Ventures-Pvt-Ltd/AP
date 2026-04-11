import React from "react";
import { ChevronLeft } from "lucide-react";
import { Button } from "../../../components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../../../components/ui/dialog";

const EditDialog = ({
  editDialogOpen,
  setEditDialogOpen,
  selectedInvoice,
  formData,
  handleUpdateInvoice,
  renderPdfPreview,
  pdfZoom,
  viewPreviewError,
  setViewPreviewError,
  renderInvoiceForm,
}) => {
  return (
    <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
      <DialogContent className="max-w-[95vw] max-h-[95vh] p-0" data-testid="edit-invoice-dialog">
        <DialogHeader className="sr-only">
          <DialogTitle>Edit Invoice {selectedInvoice?.invoice_number || ""}</DialogTitle>
        </DialogHeader>
        {selectedInvoice && formData && (
          <div className="h-[90vh]">
            <div className="flex items-center justify-between px-4 py-2 border-b bg-gray-50">
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={() => setEditDialogOpen(false)} className="text-gray-600 hover:text-gray-800 p-1">
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="font-semibold text-sm">Edit Invoice - {selectedInvoice.invoice_number}</span>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setEditDialogOpen(false)}>Cancel</Button>
                <Button size="sm" onClick={handleUpdateInvoice}>Update Invoice</Button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-[35%_65%] h-[calc(100%-50px)]">
              <div className="border-r h-full">
                {renderPdfPreview({
                  invoice: selectedInvoice,
                  zoom: pdfZoom,
                  imageError: viewPreviewError,
                  setImageError: setViewPreviewError,
                })}
              </div>
              <div className="p-4 overflow-y-auto">{renderInvoiceForm({ isEdit: true })}</div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default EditDialog;
