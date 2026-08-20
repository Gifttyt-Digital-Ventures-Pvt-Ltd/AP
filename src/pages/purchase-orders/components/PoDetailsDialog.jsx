import React, { useEffect, useMemo, useState } from "react";
import {
  Building2,
  Download,
  ExternalLink,
  FileText,
  History,
  Loader2,
  Package,
  Send,
  WalletCards,
  XCircle,
} from "lucide-react";
import { Badge } from "../../../components/ui/badge";
import { Button } from "../../../components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
import { Label } from "../../../components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../components/ui/select";
import { Textarea } from "../../../components/ui/textarea";
import {
  getPoReferenceDocumentName,
  getPoReferenceDocumentS3Key,
  getPoReferenceDocumentType,
  getPoReferenceDocumentUrl,
  isFormatFieldEnabled,
  isFormatSectionEnabled,
} from "../utils";
import { DELIVERY_STATUS_OPTIONS } from "../constants";
import PoLogo from "./PoLogo";
import { OrgBranchDetail, VendorBranchDetail } from "../../../components/common/BranchTableCells";
import AccountingLockBanner from "../../../components/AccountingLockBanner";
import { isAccountingReadyLocked } from "../../../utils/accountingLock";
import ApprovalHistoryTimeline from "../../../components/common/ApprovalHistoryTimeline";
import { useGetPurchaseOrderHistoryQuery } from "../../../Services/apis/purchaseOrdersMasterDataApi";
import {
  useGetDocumentPaymentScheduleHistoryQuery,
  useGetDocumentPaymentScheduleQuery,
} from "../../../Services/apis/paymentSchedulesApi";
import PoPaymentScheduleSection from "./PoPaymentScheduleSection";
import { normalizePaymentScheduleRows } from "../utils/poPaymentSchedule";
import AdvanceContextPanel from "../../../components/vendor-advances/AdvanceContextPanel";
import { InvoicePdfPreview } from "../../invoices/components/InvoicePdfPreview";
import PoSpreadsheetPreview from "./PoSpreadsheetPreview";

const normalizeReferenceDocumentUrl = (url = "") => {
  if (!url) return "";
  if (/^https?:\/\//i.test(url)) return url;
  return new URL(url, window.location.origin).toString();
};

const isSpreadsheetReferenceDocument = ({ name = "", type = "" } = {}) => {
  const normalizedType = String(type || "").trim().toUpperCase();
  const normalizedName = String(name || "").trim().toLowerCase();
  return (
    normalizedType === "EXCEL" ||
    normalizedType === "SPREADSHEET" ||
    normalizedName.endsWith(".xls") ||
    normalizedName.endsWith(".xlsx") ||
    normalizedName.endsWith(".csv")
  );
};

const getDocumentGrossTotal = (document = {}, po = {}) =>
  Number(
    document.totalAmount ??
      document.total_amount ??
      document.grossTotal ??
      document.gross_total ??
      document.documentGrossTotal ??
      document.document_gross_total ??
      po.total_amount ??
      po.totalAmount ??
      0,
  ) || 0;

const PoDetailsDialog = ({
  showViewDialog,
  setShowViewDialog,
  selectedPO,
  loadingDetails = false,
  statusColors,
  formatDate,
  formatCurrency,
  handleDownloadPO,
  handleSubmitForApproval,
  downloadingPoId,
  submitting,
  setShowApprovalDialog,
  canManagePo,
  canApprovePo,
  onEditPO,
  onSaveDeliveryStatus,
  savingDeliveryStatus,
  canRaiseAdvance = false,
  onRaiseAdvance,
  onCancelPO,
  cancelling = false,
  canEditPaymentSchedule = false,
  onSavePaymentSchedule,
  savingPaymentSchedule = false,
}) => {
  const selectedPoId =
    selectedPO?.id ||
    selectedPO?.po_id ||
    selectedPO?.poId ||
    selectedPO?.purchaseOrderId ||
    selectedPO?.purchase_order_id;
  const [viewTab, setViewTab] = useState("details");
  const [deliveryStatus, setDeliveryStatus] = useState(selectedPO?.delivery_status || "");
  const [deliveryRemarks, setDeliveryRemarks] = useState(selectedPO?.delivery_remarks || "");
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);
  const [scheduleDraftRows, setScheduleDraftRows] = useState([]);
  const [referencePreviewZoom, setReferencePreviewZoom] = useState(100);
  const [referencePreviewError, setReferencePreviewError] = useState(false);
  const {
    data: approvalHistory = [],
    isLoading: loadingApprovalHistory,
  } = useGetPurchaseOrderHistoryQuery(selectedPoId, {
    skip: !showViewDialog || !selectedPoId,
  });
  const {
    data: paymentScheduleHistory = [],
    isLoading: loadingPaymentScheduleHistory,
  } = useGetDocumentPaymentScheduleHistoryQuery(
    { documentType: "PO", documentId: selectedPoId },
    { skip: !showViewDialog || !selectedPoId },
  );
  const {
    data: documentScheduleData,
    isFetching: loadingPaymentSchedule,
  } = useGetDocumentPaymentScheduleQuery(
    { documentType: "PO", documentId: selectedPoId },
    { skip: !showViewDialog || !selectedPoId },
  );

  useEffect(() => {
    setDeliveryStatus(selectedPO?.delivery_status || "");
    setDeliveryRemarks(selectedPO?.delivery_remarks || "");
  }, [selectedPoId]);
  const isDownloading = Boolean(
    selectedPoId && downloadingPoId === selectedPoId,
  );
  const poCurrency = selectedPO?.currency || "INR";
  const isInr = poCurrency === "INR";
  const documentBorderClass = "border";
  const headerBorderClass = "border-b";
  const documentScheduleSource = useMemo(
    () =>
      Array.isArray(documentScheduleData)
        ? { paymentSchedule: documentScheduleData }
        : {
            ...(documentScheduleData || {}),
            paymentSchedule:
              documentScheduleData?.paymentSchedule ??
              documentScheduleData?.payment_schedule ??
              documentScheduleData?.rows ??
              documentScheduleData?.schedule,
          },
    [documentScheduleData],
  );
  const fetchedPaymentScheduleRows = useMemo(
    () => normalizePaymentScheduleRows(documentScheduleSource || {}),
    [documentScheduleSource],
  );
  const embeddedPaymentScheduleRows = useMemo(
    () => normalizePaymentScheduleRows(selectedPO || {}),
    [selectedPO],
  );
  const paymentScheduleRows = fetchedPaymentScheduleRows.length
    ? fetchedPaymentScheduleRows
    : embeddedPaymentScheduleRows;
  const documentGrossTotal = getDocumentGrossTotal(documentScheduleSource || {}, selectedPO || {});

  useEffect(() => {
    if (!scheduleDialogOpen) {
      setScheduleDraftRows(paymentScheduleRows);
    }
  }, [paymentScheduleRows, scheduleDialogOpen]);

  const openScheduleDialog = () => {
    setScheduleDraftRows(paymentScheduleRows);
    setScheduleDialogOpen(true);
  };

  const handleSaveSchedule = async () => {
    const saved = await onSavePaymentSchedule?.(selectedPO, scheduleDraftRows);
    if (saved !== false) {
      setScheduleDialogOpen(false);
    }
  };

  const selectedFormat =
    selectedPO?.formatConfigSnapshot ||
    selectedPO?.format_snapshot ||
    selectedPO?.formatSnapshot ||
    selectedPO?.po_format_config ||
    selectedPO?.poFormatConfig ||
    selectedPO?.formatConfig ||
    null;

  const sectionOn = (sectionKey) =>
    selectedFormat ? isFormatSectionEnabled(selectedFormat, sectionKey) : true;
  const fieldOn = (sectionKey, fieldKey) =>
    selectedFormat
      ? isFormatFieldEnabled(selectedFormat, sectionKey, fieldKey)
      : true;
  const poCompanyName =
    selectedFormat?.companyName ||
    selectedPO?.company_name ||
    selectedPO?.companyName ||
    "Company Name";
  const poLogoUrl =
    selectedFormat?.logoUrl ||
    selectedFormat?.logo_url ||
    selectedPO?.logoUrl ||
    selectedPO?.logo_url ||
    null;
  const referenceDocument = {
    type: getPoReferenceDocumentType(selectedPO),
    name: getPoReferenceDocumentName(selectedPO),
    url: normalizeReferenceDocumentUrl(getPoReferenceDocumentUrl(selectedPO)),
    s3Key: getPoReferenceDocumentS3Key(selectedPO),
  };
  const hasReferenceDocument = Boolean(
    referenceDocument.name ||
      referenceDocument.url ||
      referenceDocument.s3Key,
  );
  const hasReferencePreview = Boolean(referenceDocument.url);
  const isSpreadsheetReference = isSpreadsheetReferenceDocument(referenceDocument);
  const referencePreviewFile = referenceDocument.name
    ? { name: referenceDocument.name }
    : null;

  useEffect(() => {
    setReferencePreviewZoom(100);
    setReferencePreviewError(false);
  }, [selectedPoId, referenceDocument.url]);
  const vendorAddress =
    selectedPO?.vendor_address ||
    selectedPO?.vendorAddress ||
    selectedPO?.vendor_billing_address ||
    selectedPO?.vendorBillingAddress ||
    [
      selectedPO?.vendorSnapshot?.addressLine1 ?? selectedPO?.vendorSnapshot?.address_line1,
      selectedPO?.vendorSnapshot?.addressLine2 ?? selectedPO?.vendorSnapshot?.address_line2,
      selectedPO?.vendorSnapshot?.city,
      selectedPO?.vendorSnapshot?.state,
      selectedPO?.vendorSnapshot?.pincode ??
        selectedPO?.vendorSnapshot?.postalCode ??
        selectedPO?.vendorSnapshot?.postal_code,
      selectedPO?.vendorSnapshot?.country,
    ]
      .filter(Boolean)
      .join(", ");
  const hideStatusInDocument = ["Approved", "Issued"].includes(selectedPO?.status);
  const poLineItemTableHeader = [
    { key: "lineNumber", title: "#" },
    ...(fieldOn("LINE_ITEM", "item_name")
      ? [{ key: "description", title: "Description" }]
      : []),
    ...(isInr && fieldOn("LINE_ITEM", "hsn_sac_code")
      ? [{ key: "hsnSacCode", title: "HSN/SAC" }]
      : []),
    ...(fieldOn("LINE_ITEM", "quantity")
      ? [{ key: "quantity", title: "Qty" }]
      : []),
    ...(fieldOn("LINE_ITEM", "uom")
      ? [{ key: "unitOfMeasure", title: "Unit" }]
      : []),
    ...(fieldOn("LINE_ITEM", "unit_rate")
      ? [{ key: "unitPrice", title: "Unit Price" }]
      : []),
    ...(fieldOn("LINE_ITEM", "discount_percent")
      ? [{ key: "discountPercent", title: "Disc %" }]
      : []),
    ...(isInr && fieldOn("LINE_ITEM", "gst_rate")
      ? [{ key: "gstRate", title: "GST %" }]
      : []),
    ...(isInr && fieldOn("LINE_ITEM", "gst_rate")
      ? [{ key: "taxAmount", title: "Tax" }]
      : []),
    { key: "totalAmount", title: "Amount", cellClassName: "font-medium" },
  ];

  const renderLineItemRow = (item, rowIndex, headers) => {
    const lineItem = {
      lineNumber: item.line_number ?? item.lineNumber ?? rowIndex + 1,
      description: item.item_description ?? item.itemDescription ?? item.description ?? "-",
      hsnSacCode: item.hsn_sac_code ?? item.hsnSacCode ?? item.hsnSac ?? "-",
      quantity: Number(item.quantity ?? 0),
      unitOfMeasure: item.unit_of_measure ?? item.unitOfMeasure ?? item.uom ?? "-",
      unitPrice: formatCurrency(
        Number(item.unit_price ?? item.unitRate ?? item.unitPrice ?? 0),
        poCurrency,
      ),
      discountPercent: `${Number(item.discount_percent ?? item.discountPercent ?? 0)}%`,
      gstRate: `${Number(item.gst_rate ?? item.gstRate ?? 0)}%`,
      taxAmount: formatCurrency(
        Number(
          item.tax_amount ??
            item.taxAmount ??
            item.igst_amount ??
            item.igstAmount ??
            0,
        ),
        poCurrency,
      ),
      totalAmount: formatCurrency(
        Number(
          item.total_amount ??
            item.totalAmount ??
            item.line_amount ??
            item.lineAmount ??
            item.amount ??
            0,
        ),
        poCurrency,
      ),
    };

    return (
      <TableRow key={rowIndex}>
        {headers.map((header) => (
          <TableCell key={header.key} className={header.cellClassName}>
            {lineItem[header.key] || "-"}
          </TableCell>
        ))}
      </TableRow>
    );
  };

  return (
    <Dialog open={showViewDialog} onOpenChange={setShowViewDialog}>
      <DialogContent
        className={`flex max-h-[92vh] flex-col overflow-hidden p-0 ${
          hasReferencePreview ? "w-[96vw] max-w-[96vw]" : "max-w-6xl"
        }`}
      >
        <DialogHeader className="shrink-0">
          <DialogTitle className="flex items-center gap-2 px-6 pt-6 pb-3 border-b">
            <FileText className="h-5 w-5" />
            Purchase Order: {selectedPO?.po_number}
            {loadingDetails ? (
              <span className="ml-auto flex items-center gap-2 text-xs font-normal text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Loading details
              </span>
            ) : null}
          </DialogTitle>
          <DialogDescription className="sr-only">
            Review purchase order details, download, submit, or approve based on
            status and permissions.
          </DialogDescription>
        </DialogHeader>

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-slate-100 lg:flex-row">
          {hasReferencePreview ? (
            <aside className="h-[420px] min-h-0 w-full shrink-0 border-b bg-white lg:h-auto lg:w-[38%] lg:border-b-0 lg:border-r">
              {isSpreadsheetReference ? (
                <PoSpreadsheetPreview fileURL={referenceDocument.url} fileName={referenceDocument.name} />
              ) : (
                <InvoicePdfPreview
                  fileURL={referenceDocument.url}
                  file={referencePreviewFile}
                  zoom={referencePreviewZoom}
                  imageError={referencePreviewError}
                  setImageError={setReferencePreviewError}
                  setPdfZoom={setReferencePreviewZoom}
                />
              )}
            </aside>
          ) : null}

          <div className="min-h-0 flex-1 overflow-y-auto">
          {selectedPO ? (
            <div className="bg-background px-6 pt-4">
              <AccountingLockBanner
                record={selectedPO}
                objectLabel="purchase order"
                objectType="PO"
                objectId={selectedPO?.id}
              />
            </div>
          ) : null}

          {selectedPO && (
            <div className="px-6 py-5 space-y-6">
              <Tabs value={viewTab} onValueChange={setViewTab}>
              <TabsList className="grid w-full max-w-2xl grid-cols-3">
                <TabsTrigger value="details">Details</TabsTrigger>
                <TabsTrigger value="history">
                  <History className="h-4 w-4 mr-1" />
                  History ({approvalHistory.length})
                </TabsTrigger>
                <TabsTrigger value="schedule-history">
                  <History className="h-4 w-4 mr-1" />
                  Payment Schedule ({paymentScheduleHistory.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="details" className="mt-4 space-y-6">
                <div
                  className={`bg-white shadow-sm ${documentBorderClass} p-6 md:p-8`}
                >
                  {sectionOn("HEADER") && (
                    <header className={`mb-5 pb-5 ${headerBorderClass}`}>
                      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_360px]">
                        <div className="flex items-start gap-3">
                          {fieldOn("HEADER", "h_logo") && (
                            <PoLogo logoUrl={poLogoUrl} companyName={poCompanyName} />
                          )}
                          <div>
                            <h2 className="text-xl font-bold">
                              {poCompanyName}
                            </h2>
                            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                              Purchase Order
                            </p>
                            <p className="mt-2 text-xs text-muted-foreground">
                              {selectedPO.po_format_name || "PO Format"}
                            </p>
                          </div>
                        </div>

                        <div className="space-y-1 text-right text-sm">
                          {!hideStatusInDocument && (
                            <div>
                              <span className="text-muted-foreground">
                                Status:
                              </span>{" "}
                              <Badge
                                variant="outline"
                                className={`border-0 font-semibold ${statusColors[selectedPO.status] || statusColors.Draft}`}
                              >
                                {selectedPO.status}
                              </Badge>
                            </div>
                          )}
                          {fieldOn("HEADER", "po_number") && (
                            <p>
                              <span className="text-muted-foreground">
                                PO No:
                              </span>{" "}
                              {selectedPO.po_number || "-"}
                            </p>
                          )}
                          {fieldOn("HEADER", "po_date") && (
                            <p>
                              <span className="text-muted-foreground">
                                Date:
                              </span>{" "}
                              {formatDate(selectedPO.po_date)}
                            </p>
                          )}
                          {fieldOn("HEADER", "valid_till") && (
                            <p>
                              <span className="text-muted-foreground">
                                Valid Till:
                              </span>{" "}
                              {formatDate(selectedPO.valid_till)}
                            </p>
                          )}
                          <p>
                            <span className="text-muted-foreground">
                              Currency:
                            </span>{" "}
                            {selectedPO.currency || "INR"}
                          </p>
                          <p>
                            <span className="text-muted-foreground">
                              Tax Mode:
                            </span>{" "}
                            {selectedPO.tax_mode || "-"}
                          </p>
                        </div>
                      </div>
                    </header>
                  )}

                  <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                    {sectionOn("VENDOR") && (
                      <section className="rounded border p-4">
                        <h3 className="mb-2 text-sm font-semibold flex items-center gap-2">
                          <Building2 className="h-4 w-4" />
                          Vendor
                        </h3>
                        {fieldOn("VENDOR", "vendor_name") && (
                          <p className="font-medium">
                            {selectedPO.vendor_name || "-"}
                          </p>
                        )}
                        {vendorAddress ? (
                          <p className="mt-2 whitespace-pre-line text-sm text-muted-foreground">
                            Address: {vendorAddress}
                          </p>
                        ) : null}
                        {isInr &&
                          fieldOn("VENDOR", "vendor_gstin") &&
                          selectedPO.vendor_gstin && (
                            <p className="text-sm text-muted-foreground">
                              GSTIN: {selectedPO.vendor_gstin}
                            </p>
                          )}
                        {isInr &&
                          fieldOn("VENDOR", "vendor_pan") &&
                          selectedPO.vendor_pan && (
                            <p className="text-sm text-muted-foreground">
                              PAN: {selectedPO.vendor_pan}
                            </p>
                          )}
                        <OrgBranchDetail record={selectedPO} label="Organisation Branch" />
                        <VendorBranchDetail record={selectedPO} label="Vendor Branch" />
                      </section>
                    )}

                    {sectionOn("SHIP_BILL") && (
                      <section className="rounded border p-4">
                        <h3 className="mb-2 text-sm font-semibold">
                          Ship & Bill
                        </h3>
                        {fieldOn("SHIP_BILL", "ship_to_address") && (
                          <p className="text-sm">
                            Ship To: {selectedPO.shipping_address || "-"}
                          </p>
                        )}
                        {fieldOn("SHIP_BILL", "billing_address") && (
                          <p className="text-sm">
                            Bill To: {selectedPO.billing_address || "-"}
                          </p>
                        )}
                        {isInr && fieldOn("SHIP_BILL", "place_of_supply") && (
                          <p className="text-sm text-muted-foreground">
                            Place of Supply: {selectedPO.place_of_supply || "-"}
                          </p>
                        )}
                        <p className="text-sm text-muted-foreground mt-1">
                          Delivery Date:{" "}
                          {formatDate(selectedPO.expected_delivery_date)}
                        </p>
                      </section>
                    )}
                  </div>

                  {sectionOn("LINE_ITEM") && (
                    <section className="mt-6">
                      <h3 className="mb-3 text-sm font-semibold flex items-center gap-2">
                        <Package className="h-4 w-4" />
                        Line Items
                      </h3>
                      <div className="overflow-x-auto rounded border">
                        <AppDataTable
                          tableHeader={poLineItemTableHeader}
                          tableData={selectedPO.line_items || []}
                          renderRow={renderLineItemRow}
                          emptyMessage="No line items found"
                        />
                      </div>
                    </section>
                  )}

                  {/* <AdvanceContextPanel
                    source={selectedPO}
                    title="PO Advance Context"
                    description="Read-only PO-linked advance summary and history from backend."
                    currency={poCurrency}
                    className="mt-6"
                  /> */}

                  <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-[1fr_320px]">
                    {sectionOn("PAYMENT") && (
                      <section className="rounded border bg-slate-50/60 p-4">
                        <h3 className="mb-3 text-sm font-semibold">Terms</h3>
                        <div className="space-y-2 text-sm">
                          {fieldOn("PAYMENT", "delivery_terms") && (
                            <p>
                              Delivery Terms: {selectedPO.delivery_terms || "-"}
                            </p>
                          )}
                          {fieldOn("PAYMENT", "freight_terms") && (
                            <p>
                              Freight Terms: {selectedPO.freight_terms || "-"}
                            </p>
                          )}
                          {fieldOn("PAYMENT", "payment_terms") && (
                            <p>
                              Payment Terms: {selectedPO.payment_terms || "-"}
                            </p>
                          )}
                        </div>
                      </section>
                    )}

                    <section className="rounded border bg-white p-4 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Subtotal</span>
                        <span>
                          {formatCurrency(selectedPO.subtotal, poCurrency)}
                        </span>
                      </div>
                      <div className="flex justify-between mt-1">
                        <span className="text-muted-foreground">Tax</span>
                        <span>
                          {formatCurrency(selectedPO.tax_amount, poCurrency)}
                        </span>
                      </div>
                      <div className="mt-3 flex justify-between border-t pt-3 text-base font-semibold">
                        <span>Total</span>
                        <span>
                          {formatCurrency(selectedPO.total_amount, poCurrency)}
                        </span>
                      </div>
                      {selectedPO.convertToInr && Number(selectedPO.matchingInrValue) > 0 ? (
                        <div className="mt-2 flex justify-between text-sm font-semibold text-primary">
                          <span>Converted INR Amount</span>
                          <span>{formatCurrency(selectedPO.matchingInrValue, "INR")}</span>
                        </div>
                      ) : null}
                      {selectedPO.tds_amount > 0 && (
                        <>
                          <div className="mt-2 flex justify-between text-muted-foreground">
                            <span>Less: TDS</span>
                            <span>
                              -{" "}
                              {formatCurrency(
                                selectedPO.tds_amount,
                                poCurrency,
                              )}
                            </span>
                          </div>
                          <div className="mt-1 flex justify-between font-semibold">
                            <span>Net Payable</span>
                            <span>
                              {formatCurrency(
                                selectedPO.net_payable,
                                poCurrency,
                              )}
                            </span>
                          </div>
                        </>
                      )}
                    </section>
                  </div>

                  {selectedPO.remarks && (
                    <section className="mt-6 rounded border bg-slate-50/60 p-4 text-sm">
                      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground mb-1">
                        Remarks
                      </p>
                      <p>{selectedPO.remarks}</p>
                    </section>
                  )}

                  {hasReferenceDocument ? (
                    <section className="mt-6 rounded border bg-slate-50/60 p-4 text-sm">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground mb-1">
                            Reference Document
                          </p>
                          <div className="space-y-1">
                            {referenceDocument.name ? (
                              <p className="font-medium">{referenceDocument.name}</p>
                            ) : null}
                            {!referenceDocument.url && referenceDocument.s3Key ? (
                              <p className="text-xs text-muted-foreground">
                                Preview URL was not returned for this uploaded document.
                              </p>
                            ) : null}
                            {!referenceDocument.url && !referenceDocument.s3Key && isSpreadsheetReference ? (
                              <p className="text-xs text-muted-foreground">
                                Excel metadata was returned, but no preview/download URL was returned.
                              </p>
                            ) : null}
                          </div>
                        </div>
                        {referenceDocument.url ? (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => window.open(referenceDocument.url, "_blank", "noopener,noreferrer")}
                          >
                            <ExternalLink className="mr-2 h-4 w-4" />
                            Open Reference
                          </Button>
                        ) : null}
                      </div>
                    </section>
                  ) : null}

                  {paymentScheduleRows.length || canEditPaymentSchedule ? (
                    <div className="mt-6">
                      {canEditPaymentSchedule ? (
                        <div className="mb-2 flex justify-end">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={openScheduleDialog}
                            disabled={savingPaymentSchedule}
                            data-testid="edit-payment-schedule-btn"
                          >
                            Edit Payment Schedule
                          </Button>
                        </div>
                      ) : null}
                      {paymentScheduleRows.length ? (
                        <PoPaymentScheduleSection
                          rows={paymentScheduleRows}
                          documentGrossTotal={documentGrossTotal}
                          formatCurrency={(amount) => formatCurrency(amount, poCurrency)}
                          readOnly
                        />
                      ) : null}
                      {loadingPaymentSchedule && !paymentScheduleRows.length ? (
                        <div className="rounded border bg-slate-50/60 p-4 text-sm text-muted-foreground">
                          Loading payment schedule...
                        </div>
                      ) : null}
                    </div>
                  ) : null}

                  <section className="mt-6 rounded border bg-slate-50/60 p-4 text-sm">
                    <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground mb-3">
                      Asset Delivery Status
                    </p>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-[260px_1fr]">
                      <div className="space-y-1.5">
                        <Label htmlFor="po-delivery-status">Delivery Status</Label>
                        <Select value={deliveryStatus} onValueChange={setDeliveryStatus}>
                          <SelectTrigger id="po-delivery-status" className="bg-white" data-testid="delivery-status-select">
                            <SelectValue placeholder="Select delivery status" />
                          </SelectTrigger>
                          <SelectContent>
                            {DELIVERY_STATUS_OPTIONS.map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="po-delivery-remarks">Delivery Remarks</Label>
                        <Textarea
                          id="po-delivery-remarks"
                          value={deliveryRemarks}
                          onChange={(e) => setDeliveryRemarks(e.target.value)}
                          rows={2}
                          placeholder="Optional notes about asset delivery"
                          className="bg-white"
                        />
                      </div>
                    </div>
                    <div className="mt-3 flex justify-end">
                      <Button
                        type="button"
                        size="sm"
                        disabled={savingDeliveryStatus}
                        data-testid="save-delivery-status-btn"
                        onClick={() =>
                          onSaveDeliveryStatus?.(selectedPO, {
                            delivery_status: deliveryStatus || null,
                            delivery_remarks: deliveryRemarks,
                          })
                        }
                      >
                        {savingDeliveryStatus && (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        )}
                        Save Delivery Status
                      </Button>
                    </div>
                  </section>
                </div>
              </TabsContent>

              <TabsContent value="history" className="mt-4 space-y-4">
                <ApprovalHistoryTimeline
                  history={approvalHistory}
                  loading={loadingApprovalHistory}
                  emptyMessage="No purchase order history records found"
                />
              </TabsContent>
              <TabsContent value="schedule-history" className="mt-4 space-y-4">
                <ApprovalHistoryTimeline
                  history={paymentScheduleHistory}
                  loading={loadingPaymentScheduleHistory}
                  emptyMessage="No payment schedule history records found"
                />
              </TabsContent>
              </Tabs>
            </div>
          )}
          </div>
        </div>

        <DialogFooter className="shrink-0 border-t bg-background px-6 py-4">
          <Button variant="outline" onClick={() => setShowViewDialog(false)}>
            Close
          </Button>
          {selectedPO && (
            <Button
              variant="outline"
              onClick={() => handleDownloadPO(selectedPO)}
              disabled={isDownloading}
              data-testid="download-po-btn"
            >
              {isDownloading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Download className="h-4 w-4 mr-2" />
              )}
              Download PO
            </Button>
          )}
          {selectedPO && canRaiseAdvance ? (
            <Button
              variant="outline"
              onClick={() => onRaiseAdvance?.(selectedPO)}
              disabled={submitting || cancelling}
              data-testid="raise-advance-btn"
            >
              <WalletCards className="h-4 w-4 mr-2" />
              Raise Advance
            </Button>
          ) : null}
          {selectedPO && canManagePo && (selectedPO?.can_cancel ?? selectedPO?.actions?.can_cancel) ? (
            <Button
              variant="outline"
              onClick={() => onCancelPO?.(selectedPO)}
              disabled={submitting || cancelling}
              className="text-red-600 border-red-300 hover:bg-red-50 dark:hover:bg-red-950/50"
              title={selectedPO?.cancel_disabled_reason ?? selectedPO?.actions?.cancel_disabled_reason ?? "Cancel PO"}
              data-testid="cancel-po-btn"
            >
              {cancelling ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <XCircle className="h-4 w-4 mr-2" />}
              Cancel PO
            </Button>
          ) : null}
          {["Draft", "Sent Back"].includes(selectedPO?.status) &&
            canManagePo &&
            !isAccountingReadyLocked(selectedPO) && (
            <Button
              onClick={() => handleSubmitForApproval(selectedPoId)}
              disabled={submitting}
              data-testid="submit-for-approval-btn"
            >
              {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              <Send className="h-4 w-4 mr-2" />
              Submit for Approval
            </Button>
          )}
          {["Draft", "Sent Back"].includes(selectedPO?.status) &&
            canManagePo &&
            !isAccountingReadyLocked(selectedPO) && (
            <Button
              variant="outline"
              onClick={() => onEditPO?.(selectedPO)}
              disabled={submitting}
              data-testid="edit-po-btn"
            >
              Edit PO
            </Button>
          )}
          {selectedPO?.status === "Pending Approval" && canApprovePo && (
            <Button
              onClick={() => {
                setShowViewDialog(false);
                setShowApprovalDialog(true);
              }}
              data-testid="review-po-btn"
            >
              Review & Approve
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
      <Dialog open={scheduleDialogOpen} onOpenChange={setScheduleDialogOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Edit Payment Schedule</DialogTitle>
            <DialogDescription>
              Update the payment schedule without changing the rest of this document.
            </DialogDescription>
          </DialogHeader>
          <PoPaymentScheduleSection
            rows={scheduleDraftRows}
            documentGrossTotal={documentGrossTotal}
            formatCurrency={(amount) => formatCurrency(amount, poCurrency)}
            onChange={setScheduleDraftRows}
          />
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setScheduleDialogOpen(false)}
              disabled={savingPaymentSchedule}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveSchedule}
              disabled={savingPaymentSchedule}
              data-testid="save-payment-schedule-btn"
            >
              {savingPaymentSchedule ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Save Payment Schedule
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
};

export default PoDetailsDialog;
