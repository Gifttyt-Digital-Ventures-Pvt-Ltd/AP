import React, { useMemo, useState } from "react";
import {
  Building2,
  CheckCircle,
  Clock3,
  Download,
  FileText,
  History,
  Loader2,
  Package,
  Send,
  User,
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
import {
  isFormatFieldEnabled,
  isFormatSectionEnabled,
  normalizePoTemplateCode,
} from "../utils";
import PoLogo from "./PoLogo";

const poLineItemTableHeader = [
  { key: "lineNumber", title: "#" },
  { key: "description", title: "Description" },
  { key: "hsnSacCode", title: "HSN/SAC" },
  { key: "quantity", title: "Qty" },
  { key: "unitPrice", title: "Unit Price" },
  { key: "taxAmount", title: "Tax" },
  { key: "totalAmount", title: "Amount", cellClassName: "font-medium" },
];

const PoDetailsDialog = ({
  showViewDialog,
  setShowViewDialog,
  selectedPO,
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
}) => {
  const selectedPoId = selectedPO?.id || selectedPO?.po_id || selectedPO?.poId;
  const [viewTab, setViewTab] = useState("details");
  const isDownloading = Boolean(
    selectedPoId && downloadingPoId === selectedPoId,
  );
  const poCurrency = selectedPO?.currency || "INR";
  const isInr = poCurrency === "INR";
  const templateCode = normalizePoTemplateCode(
    selectedPO?.template_code || selectedPO?.templateCode || "T1",
  );
  const documentBorderClass =
    templateCode === "T3" ? "border-2 border-slate-900" : "border";
  const headerBorderClass =
    templateCode === "T4" ? "border-b-4 border-emerald-600" : "border-b";

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

  const renderLineItemRow = (item, rowIndex, headers) => {
    const lineItem = {
      lineNumber: item.line_number ?? item.lineNumber ?? rowIndex + 1,
      description: item.item_description ?? item.description ?? "-",
      hsnSacCode: item.hsn_sac_code ?? item.hsnSac ?? "-",
      quantity:
        `${Number(item.quantity ?? 0)} ${item.unit_of_measure ?? item.uom ?? ""}`.trim(),
      unitPrice: formatCurrency(
        Number(item.unit_price ?? item.unitPrice ?? 0),
        poCurrency,
      ),
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

  const approvalHistory = useMemo(() => {
    const candidates = [
      selectedPO?.approval_records,
      selectedPO?.approvalRecords,
      selectedPO?.approvals,
    ];
    const firstPopulated = candidates.find(
      (entry) => Array.isArray(entry) && entry.length > 0,
    );
    if (firstPopulated) return firstPopulated;
    return candidates.find(Array.isArray) || [];
  }, [selectedPO]);

  const getHistoryIcon = (action = "") => {
    const normalized = String(action || "").toLowerCase();
    if (normalized.includes("approve"))
      return <CheckCircle className="h-4 w-4 text-emerald-700" />;
    if (normalized.includes("reject"))
      return <XCircle className="h-4 w-4 text-red-700" />;
    return <Clock3 className="h-4 w-4 text-slate-600" />;
  };

  const getHistoryBadgeClass = (action = "") => {
    const normalized = String(action || "").toLowerCase();
    if (normalized.includes("approve"))
      return "bg-emerald-100 text-emerald-800 border-emerald-200";
    if (normalized.includes("reject"))
      return "bg-red-100 text-red-800 border-red-200";
    return "bg-slate-100 text-slate-700 border-slate-200";
  };

  return (
    <Dialog open={showViewDialog} onOpenChange={setShowViewDialog}>
      <DialogContent className="max-w-6xl max-h-[92vh] overflow-y-auto p-0">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 px-6 pt-6 pb-3 border-b">
            <FileText className="h-5 w-5" />
            Purchase Order: {selectedPO?.po_number}
          </DialogTitle>
          <DialogDescription className="sr-only">
            Review purchase order details, download, submit, or approve based on
            status and permissions.
          </DialogDescription>
        </DialogHeader>

        {selectedPO && (
          <div className="bg-slate-100 px-6 py-5 space-y-6">
            <Tabs value={viewTab} onValueChange={setViewTab}>
              <TabsList className="grid w-full max-w-sm grid-cols-2">
                <TabsTrigger value="details">Details</TabsTrigger>
                <TabsTrigger value="history">
                  <History className="h-4 w-4 mr-1" />
                  History ({approvalHistory.length})
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
                              {selectedPO.po_format_name || "PO Format"} -{" "}
                              {templateCode}
                            </p>
                          </div>
                        </div>

                        <div className="space-y-1 text-right text-sm">
                          <div>
                            <span className="text-muted-foreground">
                              Status:
                            </span>{" "}
                            <Badge
                              className={`${statusColors[selectedPO.status] || "bg-gray-500"} text-white`}
                            >
                              {selectedPO.status}
                            </Badge>
                          </div>
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
                </div>
              </TabsContent>

              <TabsContent value="history" className="mt-4 space-y-4">
                {approvalHistory.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground border border-dashed rounded-lg bg-white">
                    <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No history records found</p>
                  </div>
                ) : (
                  <div className="relative">
                    <div className="absolute left-[19px] top-0 bottom-0 w-0.5 bg-border" />
                    <div className="space-y-4">
                      {approvalHistory.map((approval, idx) => {
                        const action =
                          approval.action || approval.status || "Updated";
                        const actor =
                          approval.userName ||
                          approval.user_name ||
                          approval.approver_name ||
                          "-";
                        const level =
                          approval.level || approval.approval_level || "-";
                        const timestamp =
                          approval.timestamp || approval.created_at;

                        return (
                          <div key={idx} className="relative flex gap-4">
                            <div className="relative z-10 w-10 h-10 rounded-full flex items-center justify-center border-2 border-background shadow-sm bg-white">
                              {getHistoryIcon(action)}
                            </div>
                            <div className="flex-1 pb-4">
                              <div className="bg-card border rounded-lg p-4 shadow-sm">
                                <div className="flex items-start justify-between mb-2">
                                  <span
                                    className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium border ${getHistoryBadgeClass(action)}`}
                                  >
                                    {action}
                                  </span>
                                  {timestamp && (
                                    <div className="text-right text-xs text-muted-foreground">
                                      <p>{formatDate(timestamp)}</p>
                                    </div>
                                  )}
                                </div>
                                <p className="text-sm mb-3 font-bold"> {level}</p>
                                {approval.comments && (
                                  <div className="mb-3 rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
                                    <p className="text-xs font-medium text-slate-700">
                                      Comments
                                    </p>
                                    <p className="mt-1 text-sm text-slate-900 whitespace-pre-line">
                                      {approval.comments}
                                    </p>
                                  </div>
                                )}
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                  <User className="h-3 w-3" />
                                  <span className="font-medium">{actor}</span>
                                  {/* <span>|</span>
                                  <span className="bg-muted px-2 py-0.5 rounded">
                                    Level {level}
                                  </span> */}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        )}

        <DialogFooter className="px-6 py-4 border-t">
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
          {selectedPO?.status === "Draft" && canManagePo && (
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
    </Dialog>
  );
};

export default PoDetailsDialog;
