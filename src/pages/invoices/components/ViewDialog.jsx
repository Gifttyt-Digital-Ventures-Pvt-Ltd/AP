import React from "react";
import { format } from "date-fns";
import { FileText, History, Pencil } from "lucide-react";
import ApprovalHistoryTimeline from "../../../components/common/ApprovalHistoryTimeline";
import { Button } from "../../../components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../../../components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../../../components/ui/tabs";
import { formatWorkflowStatus } from "../../../utils/approvalWorkflow";
import InvoiceReadOnlyDetails from "./InvoiceReadOnlyDetails";

const ViewDialog = ({
  viewDialogOpen,
  setViewDialogOpen,
  selectedInvoice,
  renderPdfPreview,
  pdfZoom,
  viewPreviewError,
  setViewPreviewError,
  getStatusBadgeClass,
  viewTab,
  setViewTab,
  invoiceHistory,
  loadingHistory,
  canEdit,
  handleEditInvoice,
  showCategoryField = true,
  isCategoryFeatureEnabled = true,
  findVendorByName,
  findVendorById,
}) => {
  return (
    <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
      <DialogContent
        className="w-[96vw] max-w-6xl h-[90vh] max-h-[90vh] p-0 overflow-hidden"
        data-testid="view-invoice-dialog"
      >
        {selectedInvoice && (
          /* Keep both panes constrained to the dialog height so content scrolls inside, not outside. */
          <div className="grid grid-cols-1 lg:grid-cols-[35%_65%] h-full min-h-0">
            <div className="border-r h-full min-h-0 overflow-hidden">
              {renderPdfPreview({
                invoice: selectedInvoice,
                zoom: pdfZoom,
                imageError: viewPreviewError,
                setImageError: setViewPreviewError,
              })}
            </div>

            <div className="min-h-0 overflow-hidden flex flex-col">
              <div className="p-6 min-h-0 overflow-y-auto flex-1 scrollbar-thin-muted">
                <DialogHeader className="mb-4">
                  <DialogTitle className="text-2xl font-bold flex items-center justify-between gap-3">
                    <div>
                      <span>Invoice {selectedInvoice.invoiceNumber}</span>
                      <p className="mt-1 text-xs font-normal text-muted-foreground">
                        Created by{" "}
                        {selectedInvoice.createdByName || "-"}
                        {selectedInvoice.createdAt &&
                          ` on ${format(
                            new Date(selectedInvoice.createdAt),
                            "dd MMM yyyy, hh:mm a",
                          )}`}
                      </p>
                    </div>
                    <span
                      className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border shrink-0 ${getStatusBadgeClass(selectedInvoice.status)}`}
                    >
                      {formatWorkflowStatus(selectedInvoice.status)}
                    </span>
                  </DialogTitle>
                </DialogHeader>

                <Tabs
                  value={viewTab}
                  onValueChange={setViewTab}
                  className="w-full"
                >
                  <TabsList className="grid w-full grid-cols-2 mb-4">
                    <TabsTrigger value="details">
                      <FileText className="h-4 w-4 mr-2" />
                      Details
                    </TabsTrigger>
                    <TabsTrigger value="history">
                      <History className="h-4 w-4 mr-2" />
                      History ({invoiceHistory.length})
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="details" className="mt-0">
                    <InvoiceReadOnlyDetails
                      invoice={selectedInvoice}
                      showCategoryField={showCategoryField}
                      isCategoryFeatureEnabled={isCategoryFeatureEnabled}
                      findVendorByName={findVendorByName}
                      findVendorById={findVendorById}
                    />
                  </TabsContent>

                  <TabsContent value="history" className="space-y-4 mt-0">
                    <ApprovalHistoryTimeline
                      history={invoiceHistory}
                      loading={loadingHistory}
                    />
                  </TabsContent>
                </Tabs>
              </div>

              <div className="flex gap-3 p-4 border-t bg-background shrink-0">
                <Button
                  variant="outline"
                  onClick={() => setViewDialogOpen(false)}
                  className="flex-1"
                >
                  Close
                </Button>
                {canEdit(selectedInvoice) && (
                  <Button
                    onClick={() => {
                      setViewDialogOpen(false);
                      handleEditInvoice(selectedInvoice);
                    }}
                    className="flex-1"
                  >
                    <Pencil className="h-4 w-4 mr-2" />
                    Edit Invoice
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ViewDialog;
