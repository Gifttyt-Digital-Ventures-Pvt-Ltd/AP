import React, { useMemo, useState } from "react";
import { format } from "date-fns";
import {
  Ban,
  CheckCircle,
  FileText,
  History,
  Landmark,
  Link2,
  Pencil,
  PanelLeftClose,
  PanelLeftOpen,
  RotateCcw,
  XCircle,
} from "lucide-react";
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
import { useGetInvoiceFundingHistoryQuery } from "../../../Services/apis/invoicesVendorsApi";
import { formatCurrency, normalizeCurrencyCode } from "../../../utils/currency";
import AccountingLockBanner from "../../../components/AccountingLockBanner";
import InvoiceReadOnlyDetails from "./InvoiceReadOnlyDetails";
import InvoiceChecklist from "./InvoiceFormChecklist";
import InvoiceFundingEditDialog from "./InvoiceFundingEditDialog";
import { buildInvoiceEditFormData } from "../utils/invoiceFormData";
import { isProformaInvoice, canMapTaxInvoiceToProforma } from "../constants/proformaInvoice";

const getFundingEntryTimestamp = (entry = {}) =>
  entry.updatedAt ||
  entry.updated_at ||
  entry.createdAt ||
  entry.created_at ||
  entry.timestamp ||
  entry.date ||
  "";

const formatFundingEntryTimestamp = (entry = {}) => {
  const value = getFundingEntryTimestamp(entry);
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return String(value);
  return format(parsed, "dd MMM yyyy, hh:mm a");
};

const formatFundingEntryDateTime = (entry = {}) => {
  const formattedTimestamp = formatFundingEntryTimestamp(entry);
  if (formattedTimestamp) return formattedTimestamp;

  const dateText = [entry.dayOfWeek, entry.date].filter(Boolean).join(", ");
  return [dateText, entry.time].filter(Boolean).join(" ");
};

const hasFundingAmount = (value) =>
  value !== undefined && value !== null && value !== "";

const FundingHistoryTimeline = ({
  history = [],
  loading = false,
  currency = "INR",
}) => {
  if (loading) {
    return (
      <div className="rounded-lg border bg-muted/20 p-4 text-sm text-muted-foreground">
        Loading funding history...
      </div>
    );
  }

  if (!history.length) {
    return (
      <div className="rounded-lg border bg-muted/20 p-6 text-center">
        <Landmark className="mx-auto mb-2 h-5 w-5 text-muted-foreground" />
        <p className="text-sm font-medium text-foreground">
          No funding history available
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Funding changes will appear here once the invoice funding split is updated.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {history.map((entry, index) => {
        const statusValue = entry.isFunded ?? entry.is_funded;
        const hasStatusValue =
          statusValue !== undefined && statusValue !== null && statusValue !== "";
        const orgAmount = entry.orgAmount ?? entry.org_amount;
        const financierAmount = entry.financierAmount ?? entry.financier_amount;
        const hasStructuredAmounts =
          hasFundingAmount(orgAmount) || hasFundingAmount(financierAmount);

        return (
          <div
            key={`${entry.id || getFundingEntryTimestamp(entry) || index}-${index}`}
            className="rounded-lg border bg-background p-4"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-foreground">
                  {entry.message || entry.action || "Funding updated"}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {entry.updatedByName ||
                    entry.userName ||
                    entry.userEmail ||
                    entry.updatedBy ||
                    "System"}
                  {formatFundingEntryDateTime(entry)
                    ? ` - ${formatFundingEntryDateTime(entry)}`
                    : ""}
                </p>
              </div>
              {hasStatusValue ? (
                <span className="rounded-full border px-2 py-0.5 text-xs font-medium text-muted-foreground">
                  {statusValue ? "Funded" : "Non-Funded"}
                </span>
              ) : null}
            </div>
            {hasStructuredAmounts ? (
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <div className="rounded-md bg-muted/30 px-3 py-2">
                  <p className="text-[11px] uppercase text-muted-foreground">
                    Organization Amount
                  </p>
                  <p className="text-sm font-semibold">
                    {hasFundingAmount(orgAmount)
                      ? formatCurrency(orgAmount, currency)
                      : "-"}
                  </p>
                </div>
                <div className="rounded-md bg-muted/30 px-3 py-2">
                  <p className="text-[11px] uppercase text-muted-foreground">
                    Financier Amount
                  </p>
                  <p className="text-sm font-semibold">
                    {hasFundingAmount(financierAmount)
                      ? formatCurrency(financierAmount, currency)
                      : "-"}
                  </p>
                </div>
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
};

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
  showDepartmentField = true,
  showCategoryField = true,
  isCategoryFeatureEnabled = true,
  showCampaignField = false,
  isCampaignFeatureEnabled = false,
  showRefNoField = false,
  showInvoiceFunding = false,
  findVendorByName,
  findVendorById,
  departmentMandatory = false,
  categoryMandatory = false,
  showProformaInvoiceFields = false,
  showErpIntegrationFields = false,
  showInternalChecklist = false,
  internalChecklistItems,
  canEditInternalChecklist = false,
  onSaveInternalChecklist,
  savingInternalChecklist = false,
  canEditInvoiceFunding = false,
  onSaveInvoiceFunding,
  savingInvoiceFunding = false,
  onMapTaxInvoice,
  onViewLinkedInvoice,
  allInvoices = [],
  canCancelLinkedInvoice = false,
  onCancelLinkedInvoice,
  showAccountingLockBanner = true,
  approvalActionConfig = null,
  // Optional — only used by GST Overview's "View" flow. Absent for every other ViewDialog
  // caller, so this section renders nothing and existing behavior is unchanged.
  gstReconDetail = null,
  // Generic content slot, rendered exactly where the Invoice Flags strip
  // used to be wired in directly. ViewDialog deliberately has zero
  // knowledge of what this is — only InvoicesDialogs.jsx (maker) and
  // Approvals.jsx (checker/approver) pass a value (InvoiceViewFlagsSection),
  // so useInvoiceFlags/InvoiceFlagsStrip/InvoiceFlagsDialog and their
  // dependency graph are never imported here, and never bundled into the
  // other 6 ViewDialog callers (Payments, Accounting, Order Tracking, Tax
  // Management, GST Recon, Campaigns) that never pass this prop.
  flagsSlot = null,
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
  const [fundingEditContext, setFundingEditContext] = useState(null);
  const invoiceIdForFundingHistory =
    selectedInvoice?.id || selectedInvoice?.invoiceId;
  const invoiceCurrency = normalizeCurrencyCode(selectedInvoice?.currency);
  const selectedIsProformaInvoice = Boolean(selectedInvoice) && isProformaInvoice(selectedInvoice);
  const effectiveShowInvoiceFunding = Boolean(showInvoiceFunding && !selectedIsProformaInvoice);
  const {
    data: fundingHistory = [],
    isFetching: fundingHistoryLoading,
  } = useGetInvoiceFundingHistoryQuery(invoiceIdForFundingHistory, {
    skip: !effectiveShowInvoiceFunding || !invoiceIdForFundingHistory,
  });
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

                {flagsSlot}

                <Tabs
                  value={viewTab}
                  onValueChange={setViewTab}
                  className="w-full flex-1 flex flex-col min-h-0"
                >
                  <TabsList
                    className={`grid w-full mb-4 ${
                      effectiveShowInvoiceFunding ? "grid-cols-3" : "grid-cols-2"
                    }`}
                  >
                    <TabsTrigger value="details">
                      <FileText className="h-4 w-4 mr-2" />
                      Details
                    </TabsTrigger>
                    <TabsTrigger value="history">
                      <History className="h-4 w-4 mr-2" />
                      History ({invoiceHistory.length})
                    </TabsTrigger>
                    {effectiveShowInvoiceFunding ? (
                      <TabsTrigger value="funding-history">
                        <Landmark className="h-4 w-4 mr-2" />
                        Funding ({fundingHistory.length})
                      </TabsTrigger>
                    ) : null}
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
                          showDepartmentField={showDepartmentField}
                          showCategoryField={showCategoryField}
                          isCategoryFeatureEnabled={isCategoryFeatureEnabled}
                          showCampaignField={showCampaignField}
                          isCampaignFeatureEnabled={isCampaignFeatureEnabled}
                          showRefNoField={showRefNoField}
                          showInvoiceFunding={effectiveShowInvoiceFunding}
                          findVendorByName={findVendorByName}
                          findVendorById={findVendorById}
                          showProformaInvoiceFields={showProformaInvoiceFields}
                          showErpIntegrationFields={showErpIntegrationFields}
                          showInternalChecklist={showInternalChecklist}
                          internalChecklistItems={internalChecklistItems}
                          canEditInternalChecklist={canEditInternalChecklist}
                          onSaveInternalChecklist={onSaveInternalChecklist}
                          savingInternalChecklist={savingInternalChecklist}
                          canEditInvoiceFunding={canEditInvoiceFunding}
                          onEditInvoiceFunding={setFundingEditContext}
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
                        showDepartmentField={showDepartmentField}
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
                  {effectiveShowInvoiceFunding ? (
                    <TabsContent
                      value="funding-history"
                      className="mt-0 flex-1 overflow-y-auto pr-3 scrollbar-thin-muted"
                    >
                      <FundingHistoryTimeline
                        history={fundingHistory}
                        loading={fundingHistoryLoading}
                        currency={invoiceCurrency}
                      />
                    </TabsContent>
                  ) : null}
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
                {approvalActionConfig?.canAct && (
                  <>
                    <Button
                      onClick={() =>
                        approvalActionConfig.onAction?.(
                          selectedInvoice,
                          approvalActionConfig.primaryAction,
                        )
                      }
                      className="flex-1"
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      {approvalActionConfig.primaryLabel}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() =>
                        approvalActionConfig.onAction?.(
                          selectedInvoice,
                          approvalActionConfig.needsCorrectionAction,
                        )
                      }
                      className="flex-1"
                    >
                      <RotateCcw className="h-4 w-4 mr-2" />
                      Needs Correction
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={() =>
                        approvalActionConfig.onAction?.(
                          selectedInvoice,
                          approvalActionConfig.rejectAction,
                        )
                      }
                      className="flex-1"
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      Reject
                    </Button>
                  </>
                )}
              </div>
            </div>
              </div>

              <InvoiceFundingEditDialog
                open={Boolean(fundingEditContext)}
                onOpenChange={(open) => {
                  if (!open) setFundingEditContext(null);
                }}
                invoice={fundingEditContext?.invoice}
                invoiceTotal={fundingEditContext?.invoiceTotal || 0}
                currency={fundingEditContext?.currency || invoiceCurrency}
                saving={savingInvoiceFunding}
                onSave={async (payload) => {
                  const saved = await onSaveInvoiceFunding?.(
                    fundingEditContext?.invoice,
                    payload,
                  );
                  if (saved !== false) setFundingEditContext(null);
                }}
              />
            </div>
          )}
      </DialogContent>
    </Dialog>
  );
};

export default ViewDialog;
