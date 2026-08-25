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

const getReferenceUrlFileName = (url = "") => {
  if (!url) return "";
  try {
    return decodeURIComponent(new URL(url, window.location.origin).pathname.split("/").pop() || "");
  } catch {
    return decodeURIComponent(String(url).split("?")[0].split("/").pop() || "");
  }
};

const isSpreadsheetReferenceDocument = ({ name = "", type = "", url = "" } = {}) => {
  const normalizedType = String(type || "").trim().toUpperCase();
  const normalizedName = String(name || getReferenceUrlFileName(url)).trim().toLowerCase();
  return (
    normalizedType === "EXCEL" ||
    normalizedType === "SPREADSHEET" ||
    normalizedName.endsWith(".xls") ||
    normalizedName.endsWith(".xlsx") ||
    normalizedName.endsWith(".csv")
  );
};

const isPreviewableReferenceDocument = ({ name = "", type = "", url = "" } = {}) => {
  const normalizedType = String(type || "").trim().toLowerCase();
  const normalizedName = String(name || getReferenceUrlFileName(url)).trim().toLowerCase();
  return (
    normalizedType.includes("pdf") ||
    normalizedType.includes("image") ||
    normalizedName.endsWith(".pdf") ||
    [".png", ".jpg", ".jpeg", ".gif", ".webp"].some((ext) => normalizedName.endsWith(ext))
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

const normalizePoDetailForDisplay = (po = {}) => {
  const vendorSnapshot = po.vendorSnapshot || po.vendor_snapshot || {};
  const lineItems = po.line_items || po.lineItems || [];

  return {
    ...po,
    po_id: po.po_id ?? po.poId ?? po.id,
    po_number: po.po_number ?? po.poNumber,
    po_date: po.po_date ?? po.poDate,
    valid_till: po.valid_till ?? po.validTill,
    tax_mode: po.tax_mode ?? po.taxMode,
    vendor_name: po.vendor_name ?? po.vendorName ?? vendorSnapshot.name,
    vendor_gstin: po.vendor_gstin ?? po.vendorGstin ?? vendorSnapshot.gstin,
    vendor_pan: po.vendor_pan ?? po.vendorPan ?? vendorSnapshot.pan,
    vendor_address:
      po.vendor_address ??
      po.vendorAddress ??
      vendorSnapshot.address ??
      [vendorSnapshot.state, vendorSnapshot.country].filter(Boolean).join(", "),
    shipping_address: po.shipping_address ?? po.shippingAddress,
    billing_address: po.billing_address ?? po.billingAddress,
    place_of_supply: po.place_of_supply ?? po.placeOfSupply,
    expected_delivery_date: po.expected_delivery_date ?? po.expectedDeliveryDate,
    delivery_terms: po.delivery_terms ?? po.deliveryTerms,
    freight_terms: po.freight_terms ?? po.freightTerms,
    payment_terms: po.payment_terms ?? po.paymentTerms,
    subtotal: po.subtotal ?? po.subTotal ?? po.sub_total ?? 0,
    tax_amount: po.tax_amount ?? po.taxAmount ?? 0,
    total_amount: po.total_amount ?? po.totalAmount ?? 0,
    tds_amount: po.tds_amount ?? po.tdsAmount ?? 0,
    net_payable: po.net_payable ?? po.netPayable ?? po.netPayableAmount,
    line_items: lineItems,
    po_format_name: po.po_format_name ?? po.poFormatName ?? po.formatName,
    pdf_url: po.pdf_url ?? po.pdfUrl,
    pdfS3Key: po.pdfS3Key ?? po.pdf_s3_key,
    reference_document_name: po.reference_document_name ?? po.referenceDocumentName,
    reference_document_url: po.reference_document_url ?? po.referenceDocumentUrl,
    delivery_status: po.delivery_status ?? po.deliveryStatus,
    delivery_remarks: po.delivery_remarks ?? po.deliveryRemarks,
    matchingInrValue: po.matchingInrValue ?? po.matching_inr_value,
  };
};

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
  paymentScheduleData,
  loadingPaymentSchedule = false,
  paymentScheduleEnabledTriggers,
}) => {
  const displayPO = useMemo(() => normalizePoDetailForDisplay(selectedPO || {}), [selectedPO]);
  const selectedPoId =
    displayPO?.id ||
    displayPO?.po_id ||
    displayPO?.poId ||
    displayPO?.purchaseOrderId ||
    displayPO?.purchase_order_id;
  const embeddedPaymentScheduleRows = useMemo(
    () => normalizePaymentScheduleRows(displayPO || {}),
    [displayPO],
  );
  const hasEmbeddedPaymentSchedule = embeddedPaymentScheduleRows.length > 0;
  const poPaymentScheduleAvailable =
    displayPO?.paymentScheduleAvailable === true ||
    displayPO?.payment_schedule_available === true ||
    displayPO?.hasPaymentSchedule === true ||
    displayPO?.has_payment_schedule === true ||
    hasEmbeddedPaymentSchedule;
  const [viewTab, setViewTab] = useState("details");
  const [deliveryStatus, setDeliveryStatus] = useState(displayPO?.delivery_status || "");
  const [deliveryRemarks, setDeliveryRemarks] = useState(displayPO?.delivery_remarks || "");
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);
  const [scheduleDraftRows, setScheduleDraftRows] = useState([]);
  const [savedPaymentSchedule, setSavedPaymentSchedule] = useState(null);
  const [referencePreviewZoom, setReferencePreviewZoom] = useState(100);
  const [referencePreviewError, setReferencePreviewError] = useState(false);
  const {
    data: approvalHistory = [],
    isLoading: loadingApprovalHistory,
  } = useGetPurchaseOrderHistoryQuery(selectedPoId, {
    skip: !showViewDialog || !selectedPoId || viewTab !== "history",
  });
  const {
    data: paymentScheduleHistory = [],
    isLoading: loadingPaymentScheduleHistory,
  } = useGetDocumentPaymentScheduleHistoryQuery(
    { documentType: "PO", documentId: selectedPoId },
    {
      skip:
        !showViewDialog ||
        !selectedPoId ||
        !poPaymentScheduleAvailable ||
        viewTab !== "schedule-history",
    },
  );
  useEffect(() => {
    setDeliveryStatus(displayPO?.delivery_status || "");
    setDeliveryRemarks(displayPO?.delivery_remarks || "");
  }, [displayPO?.delivery_remarks, displayPO?.delivery_status, selectedPoId]);
  const isDownloading = Boolean(
    selectedPoId && downloadingPoId === selectedPoId,
  );
  const poStatus = String(displayPO?.status || "").trim().toUpperCase();
  const isPoCancelled = ["CANCELLED", "CANCELED"].includes(poStatus);
  const poCurrency = displayPO?.currency || "INR";
  const isInr = poCurrency === "INR";
  const documentBorderClass = "border";
  const headerBorderClass = "border-b";
  const documentScheduleSource = useMemo(
    () =>
      Array.isArray(paymentScheduleData)
        ? { paymentSchedule: paymentScheduleData }
        : {
            ...(paymentScheduleData || {}),
            paymentSchedule:
              paymentScheduleData?.paymentSchedule ??
              paymentScheduleData?.payment_schedule ??
              paymentScheduleData?.rows ??
              paymentScheduleData?.schedule,
          },
    [paymentScheduleData],
  );
  const fetchedPaymentScheduleRows = useMemo(
    () => normalizePaymentScheduleRows(documentScheduleSource || {}),
    [documentScheduleSource],
  );
  const paymentScheduleRows = fetchedPaymentScheduleRows.length
    ? fetchedPaymentScheduleRows
    : embeddedPaymentScheduleRows;
  const visiblePaymentScheduleRows =
    savedPaymentSchedule?.documentId === selectedPoId
      ? savedPaymentSchedule.rows
      : paymentScheduleRows;
  const documentGrossTotal = getDocumentGrossTotal(documentScheduleSource || {}, displayPO || {});

  useEffect(() => {
    if (!scheduleDialogOpen) {
      setScheduleDraftRows(visiblePaymentScheduleRows);
    }
  }, [visiblePaymentScheduleRows, scheduleDialogOpen]);

  const openScheduleDialog = () => {
    setScheduleDraftRows(visiblePaymentScheduleRows);
    setScheduleDialogOpen(true);
  };

  const handleSaveSchedule = async () => {
    const saved = await onSavePaymentSchedule?.(displayPO, scheduleDraftRows);
    if (saved !== false) {
      setSavedPaymentSchedule({ documentId: selectedPoId, rows: scheduleDraftRows });
      setScheduleDialogOpen(false);
    }
  };

  const selectedFormat =
    displayPO?.formatConfigSnapshot ||
    displayPO?.format_snapshot ||
    displayPO?.formatSnapshot ||
    displayPO?.po_format_config ||
    displayPO?.poFormatConfig ||
    displayPO?.formatConfig ||
    null;

  const sectionOn = (sectionKey) =>
    selectedFormat ? isFormatSectionEnabled(selectedFormat, sectionKey) : true;
  const fieldOn = (sectionKey, fieldKey) =>
    selectedFormat
      ? isFormatFieldEnabled(selectedFormat, sectionKey, fieldKey)
      : true;
  const poCompanyName =
    selectedFormat?.companyName ||
    displayPO?.company_name ||
    displayPO?.companyName ||
    "Company Name";
  const poLogoUrl =
    selectedFormat?.logoUrl ||
    selectedFormat?.logo_url ||
    displayPO?.logoUrl ||
    displayPO?.logo_url ||
    null;
  const referenceDocument = {
    type: getPoReferenceDocumentType(displayPO),
    name: getPoReferenceDocumentName(displayPO),
    url: normalizeReferenceDocumentUrl(getPoReferenceDocumentUrl(displayPO)),
    s3Key: getPoReferenceDocumentS3Key(displayPO),
  };
  const hasReferenceDocument = Boolean(
    referenceDocument.name ||
      referenceDocument.url ||
      referenceDocument.s3Key,
  );
  const isSpreadsheetReference = isSpreadsheetReferenceDocument(referenceDocument);
  const canPreviewReference = isPreviewableReferenceDocument(referenceDocument);
  const referencePreviewName = referenceDocument.name || getReferenceUrlFileName(referenceDocument.url);
  const hasReferencePreview = Boolean(referenceDocument.url && (canPreviewReference || isSpreadsheetReference));
  const referencePreviewFile = referencePreviewName
    ? { name: referencePreviewName }
    : null;

  useEffect(() => {
    setReferencePreviewZoom(100);
    setReferencePreviewError(false);
  }, [selectedPoId, referenceDocument.url]);
  const vendorAddress =
    displayPO?.vendor_address ||
    displayPO?.vendorAddress ||
    displayPO?.vendor_billing_address ||
    displayPO?.vendorBillingAddress ||
    [
      displayPO?.vendorSnapshot?.addressLine1 ?? displayPO?.vendorSnapshot?.address_line1,
      displayPO?.vendorSnapshot?.addressLine2 ?? displayPO?.vendorSnapshot?.address_line2,
      displayPO?.vendorSnapshot?.city,
      displayPO?.vendorSnapshot?.state,
      displayPO?.vendorSnapshot?.pincode ??
        displayPO?.vendorSnapshot?.postalCode ??
        displayPO?.vendorSnapshot?.postal_code,
      displayPO?.vendorSnapshot?.country,
    ]
      .filter(Boolean)
      .join(", ");
  const hideStatusInDocument = ["Approved", "Issued"].includes(displayPO?.status);
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
        onInteractOutside={(event) => {
          if (scheduleDialogOpen) event.preventDefault();
        }}
      >
        <DialogHeader className="shrink-0">
          <DialogTitle className="flex items-center gap-2 px-6 pt-6 pb-3 border-b">
            <FileText className="h-5 w-5" />
            Purchase Order: {displayPO?.po_number}
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
                <PoSpreadsheetPreview fileURL={referenceDocument.url} fileName={referencePreviewName} />
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
                record={displayPO}
                objectLabel="purchase order"
                objectType="PO"
                objectId={displayPO?.id}
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
                              {displayPO.po_format_name || "PO Format"}
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
                                className={`border-0 font-semibold ${statusColors[displayPO.status] || statusColors.Draft}`}
                              >
                                {displayPO.status}
                              </Badge>
                            </div>
                          )}
                          {fieldOn("HEADER", "po_number") && (
                            <p>
                              <span className="text-muted-foreground">
                                PO No:
                              </span>{" "}
                              {displayPO.po_number || "-"}
                            </p>
                          )}
                          {fieldOn("HEADER", "po_date") && (
                            <p>
                              <span className="text-muted-foreground">
                                Date:
                              </span>{" "}
                              {formatDate(displayPO.po_date)}
                            </p>
                          )}
                          {fieldOn("HEADER", "valid_till") && (
                            <p>
                              <span className="text-muted-foreground">
                                Valid Till:
                              </span>{" "}
                              {formatDate(displayPO.valid_till)}
                            </p>
                          )}
                          <p>
                            <span className="text-muted-foreground">
                              Currency:
                            </span>{" "}
                            {displayPO.currency || "INR"}
                          </p>
                          <p>
                            <span className="text-muted-foreground">
                              Tax Mode:
                            </span>{" "}
                            {displayPO.tax_mode || "-"}
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
                            {displayPO.vendor_name || "-"}
                          </p>
                        )}
                        {vendorAddress ? (
                          <p className="mt-2 whitespace-pre-line text-sm text-muted-foreground">
                            Address: {vendorAddress}
                          </p>
                        ) : null}
                        {isInr &&
                          fieldOn("VENDOR", "vendor_gstin") &&
                          displayPO.vendor_gstin && (
                            <p className="text-sm text-muted-foreground">
                              GSTIN: {displayPO.vendor_gstin}
                            </p>
                          )}
                        {isInr &&
                          fieldOn("VENDOR", "vendor_pan") &&
                          displayPO.vendor_pan && (
                            <p className="text-sm text-muted-foreground">
                              PAN: {displayPO.vendor_pan}
                            </p>
                          )}
                        <OrgBranchDetail record={displayPO} label="Organisation Branch" />
                        <VendorBranchDetail record={displayPO} label="Vendor Branch" />
                      </section>
                    )}

                    {sectionOn("SHIP_BILL") && (
                      <section className="rounded border p-4">
                        <h3 className="mb-2 text-sm font-semibold">
                          Ship & Bill
                        </h3>
                        {fieldOn("SHIP_BILL", "ship_to_address") && (
                          <p className="text-sm">
                            Ship To: {displayPO.shipping_address || "-"}
                          </p>
                        )}
                        {fieldOn("SHIP_BILL", "billing_address") && (
                          <p className="text-sm">
                            Bill To: {displayPO.billing_address || "-"}
                          </p>
                        )}
                        {isInr && fieldOn("SHIP_BILL", "place_of_supply") && (
                          <p className="text-sm text-muted-foreground">
                            Place of Supply: {displayPO.place_of_supply || "-"}
                          </p>
                        )}
                        <p className="text-sm text-muted-foreground mt-1">
                          Delivery Date:{" "}
                          {formatDate(displayPO.expected_delivery_date)}
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
                          tableData={displayPO.line_items || []}
                          renderRow={renderLineItemRow}
                          emptyMessage="No line items found"
                        />
                      </div>
                    </section>
                  )}

                  {/* <AdvanceContextPanel
                    source={displayPO}
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
                              Delivery Terms: {displayPO.delivery_terms || "-"}
                            </p>
                          )}
                          {fieldOn("PAYMENT", "freight_terms") && (
                            <p>
                              Freight Terms: {displayPO.freight_terms || "-"}
                            </p>
                          )}
                          {fieldOn("PAYMENT", "payment_terms") && (
                            <p>
                              Payment Terms: {displayPO.payment_terms || "-"}
                            </p>
                          )}
                        </div>
                      </section>
                    )}

                    <section className="rounded border bg-white p-4 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Subtotal</span>
                        <span>
                          {formatCurrency(displayPO.subtotal, poCurrency)}
                        </span>
                      </div>
                      <div className="flex justify-between mt-1">
                        <span className="text-muted-foreground">Tax</span>
                        <span>
                          {formatCurrency(displayPO.tax_amount, poCurrency)}
                        </span>
                      </div>
                      <div className="mt-3 flex justify-between border-t pt-3 text-base font-semibold">
                        <span>Total</span>
                        <span>
                          {formatCurrency(displayPO.total_amount, poCurrency)}
                        </span>
                      </div>
                      {displayPO.convertToInr && Number(displayPO.matchingInrValue) > 0 ? (
                        <div className="mt-2 flex justify-between text-sm font-semibold text-primary">
                          <span>Converted INR Amount</span>
                          <span>{formatCurrency(displayPO.matchingInrValue, "INR")}</span>
                        </div>
                      ) : null}
                      {displayPO.tds_amount > 0 && (
                        <>
                          <div className="mt-2 flex justify-between text-muted-foreground">
                            <span>Less: TDS</span>
                            <span>
                              -{" "}
                              {formatCurrency(
                                displayPO.tds_amount,
                                poCurrency,
                              )}
                            </span>
                          </div>
                          <div className="mt-1 flex justify-between font-semibold">
                            <span>Net Payable</span>
                            <span>
                              {formatCurrency(
                                displayPO.net_payable,
                                poCurrency,
                              )}
                            </span>
                          </div>
                        </>
                      )}
                    </section>
                  </div>

                  {displayPO.remarks && (
                    <section className="mt-6 rounded border bg-slate-50/60 p-4 text-sm">
                      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground mb-1">
                        Remarks
                      </p>
                      <p>{displayPO.remarks}</p>
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
                            {referenceDocument.url && !isSpreadsheetReference && !canPreviewReference ? (
                              <p className="text-xs text-muted-foreground">
                                Preview is not available for this reference file type. Use Open Reference when you need to view it.
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

                  {visiblePaymentScheduleRows.length || canEditPaymentSchedule ? (
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
                      {visiblePaymentScheduleRows.length ? (
                        <PoPaymentScheduleSection
                          rows={visiblePaymentScheduleRows}
                          documentGrossTotal={documentGrossTotal}
                          formatCurrency={(amount) => formatCurrency(amount, poCurrency)}
                          readOnly
                          enabledTriggerStages={paymentScheduleEnabledTriggers}
                        />
                      ) : null}
                      {loadingPaymentSchedule && !visiblePaymentScheduleRows.length ? (
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
                        <Select
                          value={deliveryStatus}
                          onValueChange={setDeliveryStatus}
                          disabled={isPoCancelled}
                        >
                          <SelectTrigger
                            id="po-delivery-status"
                            className={isPoCancelled ? "cursor-not-allowed bg-slate-100 text-slate-500" : "bg-white"}
                            data-testid="delivery-status-select"
                          >
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
                          disabled={isPoCancelled}
                          className={isPoCancelled ? "cursor-not-allowed bg-slate-100 text-slate-500" : "bg-white"}
                        />
                      </div>
                    </div>
                    <div className="mt-3 flex justify-end">
                      <Button
                        type="button"
                        size="sm"
                        disabled={savingDeliveryStatus || isPoCancelled}
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
          {["Draft", "Sent Back"].includes(displayPO?.status) &&
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
          {["Draft", "Sent Back"].includes(displayPO?.status) &&
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
          {displayPO?.status === "Pending Approval" && canApprovePo && (
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
      <Dialog open={scheduleDialogOpen} onOpenChange={setScheduleDialogOpen} modal={false}>
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
            enabledTriggerStages={paymentScheduleEnabledTriggers}
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
