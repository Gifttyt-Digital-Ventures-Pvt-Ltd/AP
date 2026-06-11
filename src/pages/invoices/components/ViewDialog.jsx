import React, { useMemo, useState } from "react";
import { format } from "date-fns";
import { FileText, History, Pencil, PanelLeftClose, PanelLeftOpen } from "lucide-react";
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
import InvoiceChecklist from "./InvoiceFormChecklist";
import { buildInvoiceEditFormData } from "../utils/invoiceFormData";

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
  showCampaignField = false,
  isCampaignFeatureEnabled = false,
  findVendorByName,
  findVendorById,
  departmentMandatory = false,
  categoryMandatory = false,
}) => {
  // Normalize the raw invoice into form-data shape so checklist fields
  // like `vendorMatched` are properly resolved (raw invoice only has `vendorId`).
  const checklistFormData = useMemo(
    () =>
      selectedInvoice
        ? buildInvoiceEditFormData(selectedInvoice, {
            isCategoryFeatureEnabled: isCategoryFeatureEnabled,
            isCampaignFeatureEnabled: isCampaignFeatureEnabled,
            findVendorByName,
            findVendorById,
          })
        : null,
    [
      selectedInvoice,
      isCategoryFeatureEnabled,
      isCampaignFeatureEnabled,
      findVendorByName,
      findVendorById,
    ],
  );
  const [previewOpen, setPreviewOpen] = useState(true);

  return (
    <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
      <DialogContent
        className="w-[96vw] max-w-6xl h-[90vh] max-h-[90vh] p-0 overflow-hidden flex flex-col"
        data-testid="view-invoice-dialog"
      >
        {selectedInvoice && (
          <div className="flex h-full min-h-0 flex-col overflow-hidden">
            {/* Top Toolbar */}
            <div className="flex shrink-0 items-center justify-between gap-3 px-4 py-2 border-b bg-gray-50 pr-12">
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setPreviewOpen((p) => !p)}
                  className="h-7 gap-1.5 text-xs text-muted-foreground hover:text-foreground"
                  title={previewOpen ? "Hide preview" : "Show preview"}
                >
                  {previewOpen ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeftOpen className="h-4 w-4" />}
                  <span className="hidden sm:inline">{previewOpen ? "Hide Preview" : "Show Preview"}</span>
                </Button>
              </div>
              <span
                className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border shrink-0 ${getStatusBadgeClass(selectedInvoice.status)}`}
              >
                {formatWorkflowStatus(selectedInvoice.status)}
              </span>
            </div>

            {/* Content Split */}
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

              <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
              <div className="p-6 min-h-0 flex-1 flex flex-col">
                <DialogHeader className="mb-4">
                  <DialogTitle className="text-2xl font-bold flex items-center justify-between gap-3">
                    <div>
                      <span>Invoice {selectedInvoice.invoiceNumber}</span>
                      <p className="mt-1 text-xs font-normal text-muted-foreground">
                        Created by {selectedInvoice.createdByName || "-"}
                        {selectedInvoice.createdAt &&
                          ` on ${format(
                            new Date(selectedInvoice.createdAt),
                            "dd MMM yyyy, hh:mm a",
                          )}`}
                      </p>
                    </div>
                  </DialogTitle>
                </DialogHeader>

                <Tabs
                  value={viewTab}
                  onValueChange={setViewTab}
                  className="w-full flex-1 flex flex-col min-h-0"
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

                  <TabsContent value="details" className="mt-0 flex-1 min-h-0">
                    <div className="flex flex-row items-stretch gap-4 w-full h-full min-h-0">
                      <div className="flex-1 min-w-0 overflow-y-auto pr-3 scrollbar-thin-muted">
                        <InvoiceReadOnlyDetails
                          invoice={selectedInvoice}
                          showCategoryField={showCategoryField}
                          isCategoryFeatureEnabled={isCategoryFeatureEnabled}
                          showCampaignField={showCampaignField}
                          isCampaignFeatureEnabled={isCampaignFeatureEnabled}
                          findVendorByName={findVendorByName}
                          findVendorById={findVendorById}
                        />
                      </div>
                      <InvoiceChecklist
                        formData={checklistFormData}
                        departmentMandatory={departmentMandatory}
                        categoryMandatory={categoryMandatory}
                        showCategoryField={showCategoryField}
                        showCampaignField={showCampaignField}
                      />
                    </div>
                  </TabsContent>

                  <TabsContent value="history" className="space-y-4 mt-0 flex-1 overflow-y-auto scrollbar-thin-muted pr-3">
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
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ViewDialog;
