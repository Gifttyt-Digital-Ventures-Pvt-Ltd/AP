import React, { useMemo, useState } from "react";
import { format } from "date-fns";
import { Ban, FileText, History, Link2, Pencil, PanelLeftClose, PanelLeftOpen } from "lucide-react";
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
import AccountingLockBanner from "../../../components/AccountingLockBanner";
import InvoiceReadOnlyDetails from "./InvoiceReadOnlyDetails";
import InvoiceChecklist from "./InvoiceFormChecklist";
import { buildInvoiceEditFormData } from "../utils/invoiceFormData";
import { isProformaInvoice, canMapTaxInvoiceToProforma } from "../constants/proformaInvoice";

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
  canCancel,
  handleCancelInvoice,
  showCategoryField = true,
  isCategoryFeatureEnabled = true,
  showCampaignField = false,
  isCampaignFeatureEnabled = false,
  showRefNoField = false,
  findVendorByName,
  findVendorById,
  departmentMandatory = false,
  categoryMandatory = false,
  showProformaInvoiceFields = false,
  onMapTaxInvoice,
  onViewLinkedInvoice,
  allInvoices = [],
  canCancelLinkedInvoice = false,
  onCancelLinkedInvoice,
  showAccountingLockBanner = true,
  // Optional — only used by GST Overview's "View" flow. Absent for every other ViewDialog
  // caller, so this section renders nothing and existing behavior is unchanged.
  gstReconDetail = null,
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
  const selectedIsProformaInvoice = Boolean(selectedInvoice) && isProformaInvoice(selectedInvoice);
  const accountingObjectType = selectedIsProformaInvoice ? "PI" : "INVOICE";
  const accountingObjectLabel = selectedIsProformaInvoice ? "proforma invoice" : "invoice";
  const renderInvoiceTitle = (titleClassName = "text-2xl", subtitleClassName = "text-xs") => (
    <div>
      <span className={`${titleClassName} font-bold`}>
        Invoice {selectedInvoice.invoiceNumber}
      </span>
      <p className={`mt-1 font-normal text-muted-foreground ${subtitleClassName}`}>
        Created by {selectedInvoice.createdByName || "-"}
        {selectedInvoice.createdAt &&
          ` on ${format(
            new Date(selectedInvoice.createdAt),
            "dd MMM yyyy, hh:mm a",
          )}`}
      </p>
    </div>
  );

  return (
    <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
      <DialogContent
        className="w-[96vw] max-w-[96vw] h-[92vh] max-h-[92vh] p-0 overflow-hidden flex flex-col"
        data-testid="view-invoice-dialog"
      >
        {selectedInvoice && (
          <div className="flex h-full min-h-0 flex-col overflow-hidden">
            {/* Top Toolbar */}
            <div className="flex shrink-0 items-stretch border-b bg-gray-50 pr-12">
              <div
                className={`flex min-w-0 items-center gap-2 px-4 py-2 transition-all duration-300 ease-in-out ${
                  previewOpen ? "w-[35%] border-r" : "w-auto"
                }`}
              >
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
              <div className="flex min-w-0 flex-1 items-center justify-between gap-3 px-4 py-2">
                <DialogHeader className="min-w-0 text-left">
                  <DialogTitle className="min-w-0">
                    {renderInvoiceTitle("block truncate text-base", "truncate text-[11px]")}
                  </DialogTitle>
                </DialogHeader>
                <span
                  className={`inline-flex shrink-0 items-center rounded-full border px-3 py-1 text-sm font-medium ${getStatusBadgeClass(selectedInvoice.status)}`}
                >
                  {formatWorkflowStatus(selectedInvoice.status)}
                </span>
              </div>
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
                {showAccountingLockBanner && (
                  <AccountingLockBanner
                    record={selectedInvoice}
                    objectLabel={accountingObjectLabel}
                    objectType={accountingObjectType}
                    objectId={selectedInvoice?.id}
                  />
                )}

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
                        {gstReconDetail && (
                          <div className="mb-4 rounded-md border bg-muted/20 p-3">
                            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                              GST Reconciliation
                            </p>
                            <pre className="whitespace-pre-wrap break-words text-xs text-muted-foreground">
                              {JSON.stringify(gstReconDetail, null, 2)}
                            </pre>
                          </div>
                        )}
                        <InvoiceReadOnlyDetails
                          invoice={selectedInvoice}
                          showCategoryField={showCategoryField}
                          isCategoryFeatureEnabled={isCategoryFeatureEnabled}
                          showCampaignField={showCampaignField}
                          isCampaignFeatureEnabled={isCampaignFeatureEnabled}
                          showRefNoField={showRefNoField}
                          findVendorByName={findVendorByName}
                          findVendorById={findVendorById}
                          showProformaInvoiceFields={showProformaInvoiceFields}
                          onMapTaxInvoice={onMapTaxInvoice}
                          onViewLinkedInvoice={onViewLinkedInvoice}
                          allInvoices={allInvoices}
                          getStatusBadgeClass={getStatusBadgeClass}
                          canCancelLinkedInvoice={canCancelLinkedInvoice}
                          onCancelLinkedInvoice={onCancelLinkedInvoice}
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
                {showProformaInvoiceFields &&
                  isProformaInvoice(selectedInvoice) &&
                  canMapTaxInvoiceToProforma(selectedInvoice) &&
                  onMapTaxInvoice && (
                    <Button
                      variant="secondary"
                      onClick={() => onMapTaxInvoice(selectedInvoice)}
                      className="flex-1"
                    >
                      <Link2 className="h-4 w-4 mr-2" />
                      Map Tax Invoice
                    </Button>
                  )}
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
                {canCancel?.(selectedInvoice) && (
                  <Button
                    variant="destructive"
                    onClick={() => handleCancelInvoice?.(selectedInvoice)}
                    className="flex-1"
                  >
                    <Ban className="h-4 w-4 mr-2" />
                    Cancel Invoice
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
