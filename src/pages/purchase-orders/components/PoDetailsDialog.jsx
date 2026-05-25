import React from "react";
import { Building2, CheckCircle, Download, FileText, Loader2, Package, Send, XCircle } from "lucide-react";
import { Badge } from "../../../components/ui/badge";
import { Button } from "../../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../../components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "../../../components/ui/dialog";
import AppDataTable from "../../../components/common/AppDataTable";
import { TableCell, TableRow } from "../../../components/ui/table";
import { isFormatFieldEnabled, isFormatSectionEnabled, normalizePoTemplateCode } from "../utils";

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
  const isDownloading = Boolean(selectedPoId && downloadingPoId === selectedPoId);
  const poCurrency = selectedPO?.currency || "INR";
  const isInr = poCurrency === "INR";
  const templateCode = normalizePoTemplateCode(selectedPO?.template_code || selectedPO?.templateCode || "T1");
  const documentBorderClass = templateCode === "T3" ? "border-2 border-slate-900" : "border";
  const headerBorderClass = templateCode === "T4" ? "border-b-4 border-emerald-600" : "border-b";

  const selectedFormat =
    selectedPO?.formatConfigSnapshot ||
    selectedPO?.format_snapshot ||
    selectedPO?.formatSnapshot ||
    selectedPO?.po_format_config ||
    selectedPO?.poFormatConfig ||
    selectedPO?.formatConfig ||
    null;

  const sectionOn = (sectionKey) => (selectedFormat ? isFormatSectionEnabled(selectedFormat, sectionKey) : true);
  const fieldOn = (sectionKey, fieldKey) => (selectedFormat ? isFormatFieldEnabled(selectedFormat, sectionKey, fieldKey) : true);

  const renderLineItemRow = (item, rowIndex, headers) => {
    const lineItem = {
      lineNumber: item.line_number ?? item.lineNumber ?? rowIndex + 1,
      description: item.item_description ?? item.description ?? "-",
      hsnSacCode: item.hsn_sac_code ?? item.hsnSac ?? "-",
      quantity: `${Number(item.quantity ?? 0)} ${item.unit_of_measure ?? item.uom ?? ""}`.trim(),
      unitPrice: formatCurrency(Number(item.unit_price ?? item.unitPrice ?? 0), poCurrency),
      taxAmount: formatCurrency(Number(item.tax_amount ?? item.taxAmount ?? item.igst_amount ?? item.igstAmount ?? 0), poCurrency),
      totalAmount: formatCurrency(Number(item.total_amount ?? item.totalAmount ?? item.line_amount ?? item.lineAmount ?? item.amount ?? 0), poCurrency),
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
      <DialogContent className="max-w-6xl max-h-[92vh] overflow-y-auto p-0">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 px-6 pt-6 pb-3 border-b">
            <FileText className="h-5 w-5" />
            Purchase Order: {selectedPO?.po_number}
          </DialogTitle>
        </DialogHeader>

        {selectedPO && (
          <div className="bg-slate-100 px-6 py-5 space-y-6">
            <div className={`bg-white shadow-sm ${documentBorderClass} p-6 md:p-8`}>
              {sectionOn("HEADER") && (
                <header className={`mb-5 pb-5 ${headerBorderClass}`}>
                  <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_360px]">
                    <div className="flex items-start gap-3">
                      {fieldOn("HEADER", "h_logo") && (
                        <div className="grid h-12 w-12 shrink-0 place-items-center rounded bg-emerald-700 text-lg font-semibold text-white">
                          {(selectedPO?.company_name || "O").charAt(0)}
                        </div>
                      )}
                      <div>
                        <h2 className="text-xl font-bold">{selectedPO?.company_name || "Company Name"}</h2>
                        <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Purchase Order</p>
                        <p className="mt-2 text-xs text-muted-foreground">
                          {selectedPO.po_format_name || "PO Format"} - {templateCode}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-1 text-right text-sm">
                      <p>
                        <span className="text-muted-foreground">Status:</span>{" "}
                        <Badge className={`${statusColors[selectedPO.status] || "bg-gray-500"} text-white`}>
                          {selectedPO.status}
                        </Badge>
                      </p>
                      {fieldOn("HEADER", "po_number") && (
                        <p><span className="text-muted-foreground">PO No:</span> {selectedPO.po_number || "-"}</p>
                      )}
                      {fieldOn("HEADER", "po_date") && (
                        <p><span className="text-muted-foreground">Date:</span> {formatDate(selectedPO.po_date)}</p>
                      )}
                      {fieldOn("HEADER", "valid_till") && (
                        <p><span className="text-muted-foreground">Valid Till:</span> {formatDate(selectedPO.valid_till)}</p>
                      )}
                      <p><span className="text-muted-foreground">Currency:</span> {selectedPO.currency || "INR"}</p>
                      <p><span className="text-muted-foreground">Tax Mode:</span> {selectedPO.tax_mode || "-"}</p>
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
                    {fieldOn("VENDOR", "vendor_name") && <p className="font-medium">{selectedPO.vendor_name || "-"}</p>}
                    {isInr && fieldOn("VENDOR", "vendor_gstin") && selectedPO.vendor_gstin && (
                      <p className="text-sm text-muted-foreground">GSTIN: {selectedPO.vendor_gstin}</p>
                    )}
                    {isInr && fieldOn("VENDOR", "vendor_pan") && selectedPO.vendor_pan && (
                      <p className="text-sm text-muted-foreground">PAN: {selectedPO.vendor_pan}</p>
                    )}
                  </section>
                )}

                {sectionOn("SHIP_BILL") && (
                  <section className="rounded border p-4">
                    <h3 className="mb-2 text-sm font-semibold">Ship & Bill</h3>
                    {fieldOn("SHIP_BILL", "ship_to_address") && (
                      <p className="text-sm">Ship To: {selectedPO.shipping_address || "-"}</p>
                    )}
                    {fieldOn("SHIP_BILL", "billing_address") && (
                      <p className="text-sm">Bill To: {selectedPO.billing_address || "-"}</p>
                    )}
                    {isInr && fieldOn("SHIP_BILL", "place_of_supply") && (
                      <p className="text-sm text-muted-foreground">Place of Supply: {selectedPO.place_of_supply || "-"}</p>
                    )}
                    <p className="text-sm text-muted-foreground mt-1">Delivery Date: {formatDate(selectedPO.expected_delivery_date)}</p>
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
                      {fieldOn("PAYMENT", "delivery_terms") && <p>Delivery Terms: {selectedPO.delivery_terms || "-"}</p>}
                      {fieldOn("PAYMENT", "freight_terms") && <p>Freight Terms: {selectedPO.freight_terms || "-"}</p>}
                      {fieldOn("PAYMENT", "payment_terms") && <p>Payment Terms: {selectedPO.payment_terms || "-"}</p>}
                    </div>
                  </section>
                )}

                <section className="rounded border bg-white p-4 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span>{formatCurrency(selectedPO.subtotal, poCurrency)}</span>
                  </div>
                  <div className="flex justify-between mt-1">
                    <span className="text-muted-foreground">Tax</span>
                    <span>{formatCurrency(selectedPO.tax_amount, poCurrency)}</span>
                  </div>
                  <div className="mt-3 flex justify-between border-t pt-3 text-base font-semibold">
                    <span>Total</span>
                    <span>{formatCurrency(selectedPO.total_amount, poCurrency)}</span>
                  </div>
                  {selectedPO.tds_amount > 0 && (
                    <>
                      <div className="mt-2 flex justify-between text-muted-foreground">
                        <span>Less: TDS</span>
                        <span>- {formatCurrency(selectedPO.tds_amount, poCurrency)}</span>
                      </div>
                      <div className="mt-1 flex justify-between font-semibold">
                        <span>Net Payable</span>
                        <span>{formatCurrency(selectedPO.net_payable, poCurrency)}</span>
                      </div>
                    </>
                  )}
                </section>
              </div>

              {selectedPO.remarks && (
                <section className="mt-6 rounded border bg-slate-50/60 p-4 text-sm">
                  <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground mb-1">Remarks</p>
                  <p>{selectedPO.remarks}</p>
                </section>
              )}
            </div>

            {(selectedPO.approvals?.length > 0 || selectedPO.approval_records?.length > 0 || selectedPO.approvalRecords?.length > 0) && (
              <Card>
                <CardHeader className="py-3">
                  <CardTitle className="text-sm">Approval History</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {(selectedPO.approvals || selectedPO.approval_records || selectedPO.approvalRecords || []).map((approval, idx) => (
                      <div key={idx} className="flex items-center gap-4 text-sm">
                        {approval.action === "Approved" ? <CheckCircle className="h-4 w-4 text-green-500" /> : <XCircle className="h-4 w-4 text-red-500" />}
                        <span className="font-medium">Level {approval.approval_level}</span>
                        <span>{approval.approver_name}</span>
                        <Badge variant={approval.action === "Approved" ? "default" : "destructive"}>{approval.action}</Badge>
                        {approval.comments && <span className="text-muted-foreground">"{approval.comments}"</span>}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        <DialogFooter className="px-6 py-4 border-t">
          <Button variant="outline" onClick={() => setShowViewDialog(false)}>Close</Button>
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
            <Button onClick={() => handleSubmitForApproval(selectedPoId)} disabled={submitting} data-testid="submit-for-approval-btn">
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
