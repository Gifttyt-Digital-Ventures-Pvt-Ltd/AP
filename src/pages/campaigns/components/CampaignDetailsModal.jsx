import React, { useState } from "react";
import { ChevronDown, ChevronRight, Copy, Eye } from "lucide-react";
import { toast } from "sonner";
import { Button } from "../../../components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../../../components/ui/dialog";
import AppDataTable from "../../../components/common/AppDataTable";
import { TableCell, TableRow } from "../../../components/ui/table";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../../../components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "../../../components/ui/tooltip";
import ViewDialog from "../../invoices/components/ViewDialog";
import InvoicePdfPreview from "../../invoices/components/InvoicePdfPreview";
import {
  CampaignStatusBadge,
  InvoiceStatusBadge,
  SummaryTile,
} from "./CampaignShared";
import {
  calculateCampaignGstAmounts,
  formatCampaignGstOption,
  formatCurrency,
  formatDate,
  resolveVendorBreakdownVariance,
  invoiceStatusBadgeClass,
  PAYMENT_MODE_LABELS,
} from "../utils/campaignFormatters";
import { getVendorRowActions } from "../utils/campaignPermissions";

const getPaymentModeLabel = (mode) =>
  PAYMENT_MODE_LABELS[mode] ||
  PAYMENT_MODE_LABELS[String(mode || "").toUpperCase()] ||
  mode ||
  "-";

const ClippedVendorName = ({ name, className = "" }) => {
  const value = String(name || "").trim() || "-";
  if (value === "-") return value;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className={`block max-w-[200px] truncate ${className}`.trim()}>
          {value}
        </span>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs break-words">
        {value}
      </TooltipContent>
    </Tooltip>
  );
};

const CampaignAmountField = ({ label, value }) => (
  <div className="flex min-w-0 items-center justify-between gap-1.5 text-xs">
    <span className="shrink-0 text-muted-foreground">{label}</span>
    <span className="truncate text-right font-medium tabular-nums">
      {value}
    </span>
  </div>
);

const CampaignTaxAmountSummary = ({
  sectionLabel,
  netAmount,
  gstOption,
  grossAmount,
}) => (
  <div className="rounded-lg border border-border p-2.5">
    <p className="mb-1.5 text-xs font-medium">{sectionLabel}</p>
    <div className="grid grid-cols-3 gap-2">
      <CampaignAmountField label="Net (₹)" value={formatCurrency(netAmount)} />
      <CampaignAmountField
        label="Tax"
        value={formatCampaignGstOption(gstOption)}
      />
      <CampaignAmountField
        label="Gross (₹)"
        value={formatCurrency(grossAmount)}
      />
    </div>
  </div>
);

const vendorBreakdownHeader = [
  { key: "expand", title: "", cellClassName: "w-8" },
  {
    key: "vendor",
    title: "Vendor",
    cellClassName: "font-medium max-w-[200px]",
  },

  { key: "campaignCost", title: "Campaign Cost" },
  { key: "invoiceNo", title: "Invoice No." },
  { key: "invoiceAmount", title: "Invoice Amount" },
  { key: "advances", title: "Advances" },
  { key: "variance", title: "Variance" },
  { key: "outstanding", title: "Outstanding" },
  { key: "status", title: "Status" },
  {
    key: "actions",
    title: "Actions",
    headerClassName: "text-left",
    cellClassName: "text-left",
  },
];

const invoiceListHeader = [
  { key: "invoiceNumber", title: "Invoice No." },
  {
    key: "vendorName",
    title: "Vendor",
    cellClassName: "max-w-[200px]",
  },
  { key: "submittedDate", title: "Submitted Date" },
  { key: "amount", title: "Amount" },
  { key: "status", title: "Status" },
  {
    key: "actions",
    title: "Actions",
    headerClassName: "text-left",
    cellClassName: "text-left",
  },
];

const getInvoiceReadOnlyPayload = (invoice, campaign) => {
  if (!invoice) return null;
  if (!invoice.details) {
    return {
      ...invoice,
      campaignId: invoice.campaignId || campaign.id,
      campaignName: invoice.campaignName || campaign.name,
      referenceNumber: invoice.referenceNumber || campaign.referenceCode,
    };
  }

  return {
    ...invoice.details,
    id: invoice.details.id || invoice.id,
    vendorId: invoice.details.vendorId || invoice.vendorId,
    vendorName: invoice.details.vendorName || invoice.vendorName,
    invoiceNumber: invoice.details.invoiceNumber || invoice.invoiceNumber,
    amount: invoice.details.amount ?? invoice.amount,
    status: invoice.details.status || invoice.status,
    campaignId: invoice.details.campaignId || campaign.id,
    campaignName: invoice.details.campaignName || campaign.name,
    referenceNumber: invoice.details.referenceNumber || campaign.referenceCode,
  };
};

const CampaignDetailsModal = ({
  open,
  onOpenChange,
  campaign,
  access,
  onRecordAdvance,
  onSubmitInvoice,
  onReviewInvoice,
  onMarkPaid,
}) => {
  const [expandedRows, setExpandedRows] = useState([]);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [viewTab, setViewTab] = useState("details");
  const [pdfZoom, setPdfZoom] = useState(100);
  const [viewPreviewError, setViewPreviewError] = useState(false);
  if (!campaign) return null;

  const toggleExpanded = (vendorId) => {
    setExpandedRows((prev) =>
      prev.includes(vendorId)
        ? prev.filter((id) => id !== vendorId)
        : [...prev, vendorId],
    );
  };

  const summary = campaign.invoiceSummary || {};
  const isApproved = campaign.status === "approved";
  const showCampaignRemark =
    ["rejected", "correction_needed"].includes(campaign.status) &&
    Boolean(campaign.remark);
  const renderPdfPreview = (props = {}) => (
    <InvoicePdfPreview
      {...props}
      setPdfZoom={setPdfZoom}
      getInvoiceFileUrl={(invoice) =>
        invoice?.invoiceFileUrl || invoice?.fileUrl || invoice?.file_url || null
      }
    />
  );
  const budgetGstOption =
    campaign.budgetGstOption ??
    campaign.budget_gst_option ??
    campaign.gstOption ??
    "";
  const totalCostGstOption =
    campaign.totalCostGstOption ??
    campaign.total_cost_gst_option ??
    campaign.gstOption ??
    "";
  const budgetNetAmount = campaign.budgetNetAmount ?? campaign.budget;
  const totalCostNetAmount = campaign.netAmount ?? campaign.totalCost;
  const budgetGrossAmount =
    campaign.budgetGrossAmount ??
    calculateCampaignGstAmounts({
      netAmount: budgetNetAmount,
      gstOption: budgetGstOption,
    }).grossAmount;
  const totalCostGrossAmount =
    campaign.grossAmount ??
    calculateCampaignGstAmounts({
      netAmount: totalCostNetAmount,
      gstOption: totalCostGstOption,
    }).grossAmount;

  const copyReferenceCode = async () => {
    try {
      await navigator.clipboard?.writeText(campaign.referenceCode);
      toast.success("Reference number copied");
    } catch {
      toast.error("Failed to copy reference number");
    }
  };

  const renderVendorRow = (row, rowIndex, headers) => {
    const isExpanded = expandedRows.includes(row.vendorId);
    const invoice = row.invoice;
    const actions = getVendorRowActions({ row, campaign, access });
    const rowInvoices = row.invoices?.length
      ? row.invoices
      : invoice
        ? [invoice]
        : [];
    const payments = [
      ...(row.advances || []),
      ...(row.payments || []),
      ...(invoice?.payments || []).filter(
        (payment) => payment.paymentType !== "advance",
      ),
    ];
    const renderInvoiceRow = (invoiceItem, invoiceIndex, invoiceHeaders) => (
      <TableRow key={invoiceItem.id || invoiceIndex}>
        {invoiceHeaders.map((header) => {
          let value;
          switch (header.key) {
            case "submittedDate":
              value = formatDate(invoiceItem.submittedDate);
              break;
            case "amount":
              value = formatCurrency(invoiceItem.amount);
              break;
            case "status":
              value = <InvoiceStatusBadge status={invoiceItem.status} />;
              break;
            case "vendorName":
              value = <ClippedVendorName name={invoiceItem.vendorName} />;
              break;
            case "actions":
              value = (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  title="View invoice"
                  onClick={(event) => {
                    event.stopPropagation();
                    setViewTab("details");
                    setViewPreviewError(false);
                    setSelectedInvoice(
                      getInvoiceReadOnlyPayload(invoiceItem, campaign),
                    );
                  }}
                >
                  <Eye className="h-4 w-4" />
                </Button>
              );
              break;
            default:
              value = invoiceItem?.[header.key] || "-";
          }

          return (
            <TableCell key={header.key} className={header.cellClassName}>
              {value}
            </TableCell>
          );
        })}
      </TableRow>
    );

    return (
      <React.Fragment key={row.vendorId || rowIndex}>
        <TableRow
          className="cursor-pointer hover:bg-muted/30"
          onClick={() => toggleExpanded(row.vendorId)}
        >
          {headers.map((header) => {
            let value;
            switch (header.key) {
              case "expand":
                value = isExpanded ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                );
                break;
              case "vendor":
                value = <ClippedVendorName name={row.vendorName} />;
                break;
              case "campaignCost":
                value = formatCurrency(row.cost);
                break;
              case "invoiceNo":
                value = invoice?.invoiceNumber || "-";
                break;
              case "invoiceAmount":
                value =
                  row.invoiceCost || invoice
                    ? formatCurrency(row.invoiceCost || invoice?.amount)
                    : "-";
                break;
              case "advances":
                value = formatCurrency(row.advancesTotal);
                break;
              case "variance":
                value = formatCurrency(resolveVendorBreakdownVariance(row));
                break;
              case "outstanding":
                value = formatCurrency(row.outstanding);
                break;
              case "status":
                value =
                  String(campaign?.status || "").toLowerCase() ===
                  "rejected" ? (
                    "-"
                  ) : campaign?.status !== "approved" ? (
                    <CampaignStatusBadge status={campaign.status} />
                  ) : String(row.status || "").toLowerCase() === "rejected" ? (
                    "-"
                  ) : (
                    <InvoiceStatusBadge status={row.status} />
                  );
                break;
              case "actions":
                value = (
                  <div className="flex flex-wrap gap-2">
                    {actions.recordAdvance && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onRecordAdvance(row)}
                      >
                        Record Advance
                      </Button>
                    )}
                    {actions.submitInvoice && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(event) => {
                          event.stopPropagation();
                          onSubmitInvoice(row);
                        }}
                      >
                        Submit Invoice
                      </Button>
                    )}
                    {actions.markPaid && (
                      <Button size="sm" onClick={() => onMarkPaid(row)}>
                        Mark Paid
                      </Button>
                    )}
                    {!Object.values(actions).some(Boolean) && (
                      <span className="text-xs text-muted-foreground">-</span>
                    )}
                  </div>
                );
                break;
              default:
                value = row?.[header.key] || "-";
            }

            return (
              <TableCell
                key={header.key}
                className={header.cellClassName}
                onClick={
                  header.key === "actions"
                    ? (event) => event.stopPropagation()
                    : undefined
                }
              >
                {value}
              </TableCell>
            );
          })}
        </TableRow>
        {isExpanded && (
          <TableRow>
            <TableCell />
            <TableCell colSpan={headers.length - 1} className="bg-muted/20 p-4">
              <Tabs defaultValue="payments" className="w-full">
                <TabsList>
                  <TabsTrigger value="payments">Payments</TabsTrigger>
                  <TabsTrigger value="invoices">Invoices</TabsTrigger>
                </TabsList>
                <TabsContent value="payments" className="mt-4">
                  {payments.length > 0 ? (
                    <div className="space-y-2">
                      {payments.map((payment) => (
                        <div
                          key={payment.id}
                          className="rounded-md border bg-background p-3 text-sm text-muted-foreground"
                        >
                          <span className="font-medium text-foreground">
                            {getPaymentModeLabel(payment.mode)}
                          </span>{" "}
                          · {formatCurrency(payment.amount)} ·{" "}
                          {payment.referenceNo || "No ref"} ·{" "}
                          {formatDate(payment.paymentDate)} ·{" "}
                          {payment.recordedBy || "-"}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      No payments recorded.
                    </p>
                  )}
                </TabsContent>
                <TabsContent value="invoices" className="mt-4">
                  <div className="rounded-lg border bg-background">
                    <AppDataTable
                      tableHeader={invoiceListHeader}
                      tableData={rowInvoices}
                      renderRow={renderInvoiceRow}
                      emptyMessage="No invoice available"
                      stickyHeader={false}
                    />
                  </div>
                </TabsContent>
              </Tabs>
            </TableCell>
          </TableRow>
        )}
      </React.Fragment>
    );
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          className="flex max-h-[92vh] max-w-7xl flex-col gap-3 overflow-y-auto"
          onInteractOutside={(event) => event.preventDefault()}
        >
          <DialogHeader className="space-y-1">
            <DialogTitle className="flex items-center gap-2 text-lg">
              {campaign.name}
              <CampaignStatusBadge status={campaign.status} />
            </DialogTitle>
            <DialogDescription className="text-xs">
              Campaign and per-vendor invoice/payment breakdown.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2.5 rounded-lg border border-border p-3">
            <div className="flex flex-wrap items-center gap-1.5 text-xs">
              <span className="text-muted-foreground">
                UAC/Reference No./Coupon Code
              </span>
              <span className="font-medium">
                {campaign.referenceCode || "-"}
              </span>
              {campaign.referenceCode && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0"
                  onClick={copyReferenceCode}
                >
                  <Copy className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
              <p>
                <span className="text-muted-foreground">Created:</span>{" "}
                {formatDate(campaign.createdDate)}
              </p>
              <p>
                <span className="text-muted-foreground">Created By:</span>{" "}
                {campaign.createdBy || "-"}
              </p>
              <p>
                <span className="text-muted-foreground">Approved By:</span>{" "}
                {campaign.approvedBy || "-"}
              </p>
              <p>
                <span className="text-muted-foreground">Period:</span>{" "}
                {formatDate(campaign.startDate)} -{" "}
                {formatDate(campaign.endDate)}
              </p>
            </div>

            <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
              <CampaignTaxAmountSummary
                sectionLabel="Selling Price / Budget"
                netAmount={budgetNetAmount}
                gstOption={budgetGstOption}
                grossAmount={budgetGrossAmount}
              />

              <CampaignTaxAmountSummary
                sectionLabel="Cost Price / Total Cost"
                netAmount={totalCostNetAmount}
                gstOption={totalCostGstOption}
                grossAmount={totalCostGrossAmount}
              />
            </div>
          </div>

          {showCampaignRemark && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-2.5 text-xs text-amber-900">
              <p className="font-medium">
                {campaign.status === "rejected"
                  ? "Rejection Remark"
                  : "Correction Remark"}
              </p>
              <p className="mt-1 whitespace-pre-wrap">{campaign.remark}</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2 md:grid-cols-3 lg:grid-cols-6">
            <SummaryTile
              inline
              label="Total Vendors"
              value={summary.totalVendors || 0}
            />
            <SummaryTile
              inline
              label="Pending Invoices"
              value={summary.noInvoice || 0}
            />
            <SummaryTile
              inline
              label="Pending"
              value={
                summary.pending ||
                summary.pendingCheck +
                  summary.pendingApproval +
                  summary.pendingPayment ||
                0
              }
            />
            <SummaryTile inline label="Paid" value={summary.paid || 0} />
            <SummaryTile
              inline
              label="Rejected"
              value={summary.rejected || 0}
            />
            <SummaryTile
              inline
              label="Variance"
              value={formatCurrency(campaign.variance)}
            />
          </div>

          {!isApproved && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-2 text-xs text-amber-900">
              Invoice and advance actions are available only after campaign
              approval.
            </div>
          )}

          <div className="rounded-lg border border-border overflow-hidden">
            <AppDataTable
              tableHeader={vendorBreakdownHeader}
              tableData={campaign.vendorBreakdown || []}
              renderRow={renderVendorRow}
              emptyMessage="No campaign vendors found"
            />
          </div>
        </DialogContent>
      </Dialog>

      <ViewDialog
        viewDialogOpen={Boolean(selectedInvoice)}
        setViewDialogOpen={(nextOpen) => {
          if (!nextOpen) setSelectedInvoice(null);
        }}
        selectedInvoice={selectedInvoice}
        renderPdfPreview={renderPdfPreview}
        pdfZoom={pdfZoom}
        viewPreviewError={viewPreviewError}
        setViewPreviewError={setViewPreviewError}
        getStatusBadgeClass={invoiceStatusBadgeClass}
        viewTab={viewTab}
        setViewTab={setViewTab}
        invoiceHistory={selectedInvoice?.approvalRecords || []}
        loadingHistory={false}
        canEdit={() => false}
        handleEditInvoice={() => {}}
        showCategoryField
        isCategoryFeatureEnabled
        showCampaignField
        isCampaignFeatureEnabled
      />
    </>
  );
};

export default CampaignDetailsModal;
