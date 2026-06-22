import React, { useEffect, useState } from "react";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { Button } from "../../../components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "../../../components/ui/dialog";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../../components/ui/select";
import AppDataTable from "../../../components/common/AppDataTable";
import { TableCell, TableRow } from "../../../components/ui/table";
import { Textarea } from "../../../components/ui/textarea";
import { isFormatFieldEnabled, isFormatSectionEnabled, normalizePoTemplateCode } from "../utils";
import MeteredActionCostHint from "../../../components/credits/MeteredActionCostHint";
import { CREDIT_ACTION_CODES } from "../../../constants/creditActions";
import { useMeteredActionEstimate } from "../../../hooks/useMeteredActionEstimate";
import PoLogo from "./PoLogo";

const getPoFormLineItemTableHeader = ({ isInr, fieldOn }) => [
  ...(fieldOn("LINE_ITEM", "item_name") ? [{ key: "item_description", title: "Description *", headerClassName: "w-[220px]" }] : []),
  ...(isInr && fieldOn("LINE_ITEM", "hsn_sac_code") ? [{ key: "hsn_sac_code", title: "HSN/SAC" }] : []),
  ...(fieldOn("LINE_ITEM", "quantity") ? [{ key: "quantity", title: "Qty", headerClassName: "w-[80px]" }] : []),
  ...(fieldOn("LINE_ITEM", "uom") ? [{ key: "unit_of_measure", title: "Unit", headerClassName: "w-[88px]" }] : []),
  ...(fieldOn("LINE_ITEM", "unit_rate") ? [{ key: "unit_price", title: "Unit Price", headerClassName: "w-[120px]" }] : []),
  ...(fieldOn("LINE_ITEM", "discount_percent") ? [{ key: "discount_percent", title: "Disc %", headerClassName: "w-[82px]" }] : []),
  ...(isInr && fieldOn("LINE_ITEM", "gst_rate") ? [{ key: "gst_rate", title: "GST %", headerClassName: "w-[82px]" }] : []),
  { key: "total", title: "Total", headerClassName: "w-[120px]", cellClassName: "font-medium text-right" },
  { key: "actions", title: "", headerClassName: "w-[48px]" },
];

const FieldBlock = ({ label, children, className = "" }) => (
  <div className={`space-y-1 ${className}`}>
    <Label className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</Label>
    {children}
  </div>
);

const inputClassName = "h-9 bg-white/80 text-sm";

const PoFormDialog = ({
  showCreateDialog,
  setShowCreateDialog,
  poForm,
  setPoForm,
  formatConfigs = [],
  activeFormatId,
  applyPoFormat,
  updatePoCurrency,
  vendors,
  addLineItem,
  updateLineItem,
  removeLineItem,
  formatCurrency,
  calculateLineTotal,
  calculatePOTotal,
  handleCreatePO,
  taxMode,
  createAction,
}) => {
  const [previewAction, setPreviewAction] = useState(null);

  const isInr = taxMode === "GST";
  const selectedFormat = formatConfigs.find((format) => format.id === (poForm.po_format_id || activeFormatId)) || formatConfigs[0] || {};
  const sectionOn = (sectionKey) => isFormatSectionEnabled(selectedFormat, sectionKey);
  const fieldOn = (sectionKey, fieldKey) => isFormatFieldEnabled(selectedFormat, sectionKey, fieldKey);
  const tableHeader = getPoFormLineItemTableHeader({ isInr, fieldOn });
  const formatPoCurrency = (amount) => formatCurrency(amount, poForm.currency);
  const isSavingDraft = createAction === "draft";
  const isSubmittingForApproval = createAction === "submit";
  const isCreating = Boolean(createAction);
  const isPreviewing = Boolean(previewAction);
  const previewSubmitForApproval = previewAction === "submit";
  const poUploadEstimate = useMeteredActionEstimate(CREDIT_ACTION_CODES.PO_UPLOAD, 1);
  const templateCode = normalizePoTemplateCode(selectedFormat.templateCode || "T1");
  const documentBorderClass = templateCode === "T3" ? "border-2 border-slate-900" : "border";
  const headerBorderClass = templateCode === "T4" ? "border-b-4 border-emerald-600" : "border-b";
  const showTdsControls = isInr && fieldOn("TAX_TOTALS", "is_tds_applicable");
  const showTdsPreview = showTdsControls && Boolean(poForm.tds_applicable);
  const poTaxableSubtotal = (poForm.line_items || []).reduce((sum, item) => {
    const amount = (Number(item.quantity) || 0) * (Number(item.unit_price) || 0);
    const discount = amount * (Number(item.discount_percent) || 0) / 100;
    return sum + Math.max(amount - discount, 0);
  }, 0);
  const poPreviewTotal = calculatePOTotal();
  const poTdsPercent = showTdsPreview ? Number(poForm.tds_percent) || 0 : 0;
  const poTdsAmount = showTdsPreview ? poTaxableSubtotal * poTdsPercent / 100 : 0;
  const poNetPayable = poPreviewTotal - poTdsAmount;

  useEffect(() => {
    if (!showCreateDialog) setPreviewAction(null);
  }, [showCreateDialog]);

  const handleOpenChange = (open) => {
    if (!open) setPreviewAction(null);
    setShowCreateDialog(open);
  };

  const renderLineItemRow = (item, idx, headers) => (
    <TableRow key={idx} className="bg-white">
      {headers.map((header) => {
        let value;

        switch (header.key) {
          case "item_description":
            value = (
              <Input
                value={item.item_description}
                onChange={(e) => updateLineItem(idx, "item_description", e.target.value)}
                placeholder="Item description"
                className={inputClassName}
                data-testid={`line-item-desc-${idx}`}
              />
            );
            break;
          case "hsn_sac_code":
            value = (
              <Input
                value={item.hsn_sac_code}
                onChange={(e) => updateLineItem(idx, "hsn_sac_code", e.target.value)}
                placeholder="HSN/SAC"
                className={`${inputClassName} min-w-[110px]`}
                data-testid={`line-item-hsn-sac-${idx}`}
              />
            );
            break;
          case "quantity":
            value = (
              <Input
                type="number"
                value={item.quantity}
                onChange={(e) => updateLineItem(idx, "quantity", parseFloat(e.target.value) || 0)}
                className={inputClassName}
                data-testid={`line-item-qty-${idx}`}
              />
            );
            break;
          case "unit_of_measure":
            value = (
              <Select value={item.unit_of_measure} onValueChange={(v) => updateLineItem(idx, "unit_of_measure", v)}>
                <SelectTrigger className="h-9 bg-white/80">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NOS">NOS</SelectItem>
                  <SelectItem value="KG">KG</SelectItem>
                  <SelectItem value="MTR">MTR</SelectItem>
                  <SelectItem value="PCS">PCS</SelectItem>
                  <SelectItem value="HRS">HRS</SelectItem>
                </SelectContent>
              </Select>
            );
            break;
          case "unit_price":
            value = (
              <Input
                type="number"
                value={item.unit_price ?? ""}
                onChange={(e) => {
                  const rawValue = e.target.value;
                  if (rawValue === "") {
                    updateLineItem(idx, "unit_price", "");
                    return;
                  }
                  const parsedValue = Number(rawValue);
                  if (Number.isNaN(parsedValue)) return;
                  updateLineItem(idx, "unit_price", parsedValue);
                }}
                min="0"
                className={`${inputClassName} min-w-[110px]`}
                data-testid={`line-item-price-${idx}`}
              />
            );
            break;
          case "discount_percent":
            value = (
              <Input
                type="number"
                value={item.discount_percent ?? ""}
                onChange={(e) => updateLineItem(idx, "discount_percent", parseFloat(e.target.value) || 0)}
                min="0"
                max="100"
                className={inputClassName}
                data-testid={`line-item-discount-${idx}`}
              />
            );
            break;
          case "gst_rate":
            value = (
              <Select value={String(item.gst_rate)} onValueChange={(v) => updateLineItem(idx, "gst_rate", parseFloat(v))}>
                <SelectTrigger className="h-9 bg-white/80">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">0%</SelectItem>
                  <SelectItem value="5">5%</SelectItem>
                  <SelectItem value="12">12%</SelectItem>
                  <SelectItem value="18">18%</SelectItem>
                  <SelectItem value="28">28%</SelectItem>
                </SelectContent>
              </Select>
            );
            break;
          case "total":
            value = <span>{formatPoCurrency(calculateLineTotal(item))}</span>;
            break;
          case "actions":
            value = !isPreviewing && poForm.line_items.length > 1 && (
              <Button variant="ghost" size="icon" onClick={() => removeLineItem(idx)} data-testid={`remove-line-item-${idx}`}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            );
            break;
          default:
            value = item?.[header.key] || "-";
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
    <Dialog open={showCreateDialog} onOpenChange={handleOpenChange}>
      <DialogContent className="flex flex-col w-[96vw] max-w-6xl max-h-[92vh] overflow-hidden p-0">
        <DialogHeader className="border-b px-6 pt-6 pb-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <DialogTitle>Create Purchase Order</DialogTitle>
              <p className="mt-1 text-xs text-muted-foreground">
                {isPreviewing ? "Preview before saving in" : "Editing in selected format:"} {selectedFormat.name || "PO Format"} ({templateCode})
              </p>
            </div>
          </div>
        </DialogHeader>

        <div className="overflow-y-auto bg-slate-100 px-6 py-5">
          <div className="mx-auto max-w-5xl space-y-4">
            {isPreviewing && (
              <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
                Review this PO exactly as it will be saved with the selected format. Go back to edit if anything needs changing.
              </div>
            )}
            {isPreviewing && (
              <MeteredActionCostHint actionCode={CREDIT_ACTION_CODES.PO_UPLOAD} />
            )}
            <div className="rounded-lg border bg-white p-4">
              <FieldBlock label="PO Format">
                <Select value={poForm.po_format_id || activeFormatId} onValueChange={applyPoFormat} disabled={isPreviewing}>
                  <SelectTrigger data-testid="po-format-select">
                    <SelectValue placeholder="Select PO format" />
                  </SelectTrigger>
                  <SelectContent>
                    {formatConfigs.map((format) => (
                      <SelectItem key={format.id} value={format.id}>
                        {format.name} ({normalizePoTemplateCode(format.templateCode)}, {format.defaultCurrency})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FieldBlock>
            </div>

            <div className={isPreviewing ? "pointer-events-none" : ""}>
              <div className={`bg-white shadow-sm ${documentBorderClass} p-6 md:p-8`}>
              {sectionOn("HEADER") && (
                <header className={`mb-5 pb-5 ${headerBorderClass}`}>
                  <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_360px]">
                    <div className="flex items-start gap-3">
                      {fieldOn("HEADER", "h_logo") && (
                        <PoLogo logoUrl={selectedFormat.logoUrl} companyName={selectedFormat.companyName} />
                      )}
                      <div>
                        <h2 className="text-xl font-bold">{selectedFormat.companyName || "Company Name"}</h2>
                        <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Purchase Order</p>
                        <p className="mt-2 text-xs text-muted-foreground">
                          {selectedFormat.name || "PO Format"} - {templateCode}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <FieldBlock label="PO No">
                        <Input value={`${selectedFormat.poNumberPrefix || "PO-"}AUTO`} disabled className={inputClassName} />
                      </FieldBlock>

                      <FieldBlock label="Currency">
                        <Select value={poForm.currency} onValueChange={updatePoCurrency}>
                          <SelectTrigger className="h-9 bg-white/80" data-testid="po-currency-select">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="INR">INR</SelectItem>
                            <SelectItem value="USD">USD</SelectItem>
                            <SelectItem value="EUR">EUR</SelectItem>
                            <SelectItem value="GBP">GBP</SelectItem>
                          </SelectContent>
                        </Select>
                      </FieldBlock>

                      {fieldOn("HEADER", "po_date") && (
                        <FieldBlock label="PO Date">
                          <Input type="date" value={poForm.po_date} onChange={(e) => setPoForm((prev) => ({ ...prev, po_date: e.target.value }))} className={inputClassName} data-testid="po-date-input" />
                        </FieldBlock>
                      )}

                      {fieldOn("HEADER", "valid_till") && (
                        <FieldBlock label="Valid Till">
                          <Input type="date" value={poForm.valid_till} onChange={(e) => setPoForm((prev) => ({ ...prev, valid_till: e.target.value }))} className={inputClassName} data-testid="valid-till-input" />
                        </FieldBlock>
                      )}

                      <FieldBlock label="Delivery Date">
                        <Input type="date" value={poForm.expected_delivery_date} onChange={(e) => setPoForm((prev) => ({ ...prev, expected_delivery_date: e.target.value }))} className={inputClassName} data-testid="delivery-date-input" />
                      </FieldBlock>
                    </div>
                  </div>
                </header>
              )}

              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                {sectionOn("VENDOR") && fieldOn("VENDOR", "vendor_name") && (
                  <section className="rounded border bg-slate-50/60 p-4">
                    <h3 className="mb-3 text-sm font-semibold">Vendor</h3>
                    <FieldBlock label="Vendor">
                      <Select value={poForm.vendor_id} onValueChange={(v) => setPoForm((prev) => ({ ...prev, vendor_id: v }))}>
                        <SelectTrigger className="h-9 bg-white/80" data-testid="vendor-select">
                          <SelectValue placeholder="Select vendor" />
                        </SelectTrigger>
                        <SelectContent>
                          {vendors.map((v) => (
                            <SelectItem key={v.id} value={v.id}>
                              {v.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FieldBlock>
                    {isInr && (fieldOn("VENDOR", "vendor_gstin") || fieldOn("VENDOR", "vendor_pan")) && (
                      <p className="mt-2 text-xs text-muted-foreground">
                        GSTIN/PAN will be taken from vendor master when backend is connected.
                      </p>
                    )}
                  </section>
                )}

                {sectionOn("SHIP_BILL") && (
                  <section className="rounded border bg-slate-50/60 p-4">
                    <h3 className="mb-3 text-sm font-semibold">Ship & Bill</h3>
                    <div className="space-y-3">
                      {fieldOn("SHIP_BILL", "ship_to_address") && (
                        <FieldBlock label="Ship To">
                          <Textarea value={poForm.shipping_address} onChange={(e) => setPoForm((prev) => ({ ...prev, shipping_address: e.target.value }))} rows={2} className="bg-white/80" data-testid="shipping-address-input" />
                        </FieldBlock>
                      )}
                      {fieldOn("SHIP_BILL", "billing_address") && (
                        <FieldBlock label="Bill To">
                          <Textarea value={poForm.billing_address} onChange={(e) => setPoForm((prev) => ({ ...prev, billing_address: e.target.value }))} rows={2} className="bg-white/80" data-testid="billing-address-input" />
                        </FieldBlock>
                      )}
                      {isInr && fieldOn("SHIP_BILL", "place_of_supply") && (
                        <FieldBlock label="Place of Supply">
                          <Input value={poForm.place_of_supply} onChange={(e) => setPoForm((prev) => ({ ...prev, place_of_supply: e.target.value.toUpperCase().slice(0, 2) }))} placeholder="State code, e.g. MH" className={inputClassName} data-testid="place-of-supply-input" />
                        </FieldBlock>
                      )}
                    </div>
                  </section>
                )}
              </div>

              {!isInr && (
                <section className="mt-5 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_220px] md:items-end">
                    <p>
                      Export mode: HSN/SAC, GST, cess, TDS, PAN and GSTIN fields are suppressed.
                    </p>
                    <FieldBlock label="Exchange Rate">
                      <Input
                        type="number"
                        min="0"
                        step="0.0001"
                        value={poForm.exchange_rate}
                        onChange={(e) => setPoForm((prev) => ({ ...prev, exchange_rate: e.target.value }))}
                        placeholder={`1 ${poForm.currency} in INR`}
                        className={inputClassName}
                        data-testid="exchange-rate-input"
                      />
                    </FieldBlock>
                  </div>
                </section>
              )}

              {sectionOn("LINE_ITEM") && (
                <section className="mt-6">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <h3 className="text-sm font-semibold">Line Items</h3>
                    {!isPreviewing && (
                      <Button variant="outline" size="sm" onClick={addLineItem} data-testid="add-line-item-btn">
                        <Plus className="h-4 w-4 mr-1" />
                        Add Item
                      </Button>
                    )}
                  </div>

                  <div className="overflow-x-auto rounded border">
                    <AppDataTable
                      tableHeader={tableHeader}
                      tableData={poForm.line_items}
                      renderRow={renderLineItemRow}
                      tableClassName={isInr ? "min-w-[980px]" : "min-w-[780px]"}
                    />
                  </div>
                </section>
              )}

              <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-[1fr_320px]">
                {sectionOn("PAYMENT") && (
                  <section className="rounded border bg-slate-50/60 p-4">
                    <h3 className="mb-3 text-sm font-semibold">Terms</h3>
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                      {fieldOn("PAYMENT", "delivery_terms") && (
                        <FieldBlock label="Delivery">
                          <Input value={poForm.delivery_terms} onChange={(e) => setPoForm((prev) => ({ ...prev, delivery_terms: e.target.value }))} className={inputClassName} data-testid="delivery-terms-input" />
                        </FieldBlock>
                      )}
                      {fieldOn("PAYMENT", "freight_terms") && (
                        <FieldBlock label="Freight">
                          <Input value={poForm.freight_terms} onChange={(e) => setPoForm((prev) => ({ ...prev, freight_terms: e.target.value }))} className={inputClassName} data-testid="freight-terms-input" />
                        </FieldBlock>
                      )}
                      {fieldOn("PAYMENT", "payment_terms") && (
                        <FieldBlock label="Payment">
                          <Input value={poForm.payment_terms} onChange={(e) => setPoForm((prev) => ({ ...prev, payment_terms: e.target.value }))} className={inputClassName} data-testid="payment-terms-input" />
                        </FieldBlock>
                      )}
                    </div>
                  </section>
                )}

                {sectionOn("TAX_TOTALS") && (
                  <section className="rounded border bg-white p-4 text-sm">
                    <div className="flex justify-between text-muted-foreground">
                      <span>Tax Mode</span>
                      <span>{taxMode}</span>
                    </div>
                    {showTdsControls && (
                      <div className="mt-3 rounded border bg-slate-50/60 p-3">
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                          <FieldBlock label="TDS">
                            <Select
                              value={poForm.tds_applicable ? "yes" : "no"}
                              onValueChange={(value) =>
                                setPoForm((prev) => ({
                                  ...prev,
                                  tds_applicable: value === "yes",
                                  tds_section: value === "yes" ? prev.tds_section : "",
                                  tds_percent: value === "yes" ? prev.tds_percent : "",
                                }))
                              }
                            >
                              <SelectTrigger className="h-9 bg-white/80" data-testid="tds-applicable-select">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="no">Not Applicable</SelectItem>
                                <SelectItem value="yes">Applicable</SelectItem>
                              </SelectContent>
                            </Select>
                          </FieldBlock>
                          {poForm.tds_applicable && (
                            <>
                              <FieldBlock label="TDS Section">
                                <Input
                                  value={poForm.tds_section}
                                  onChange={(e) => setPoForm((prev) => ({ ...prev, tds_section: e.target.value.toUpperCase() }))}
                                  placeholder="e.g. 194C"
                                  className={inputClassName}
                                  data-testid="tds-section-input"
                                />
                              </FieldBlock>
                              <FieldBlock label="TDS %">
                                <Input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  value={poForm.tds_percent}
                                  onChange={(e) => setPoForm((prev) => ({ ...prev, tds_percent: e.target.value }))}
                                  placeholder="Rate"
                                  className={inputClassName}
                                  data-testid="tds-percent-input"
                                />
                              </FieldBlock>
                            </>
                          )}
                        </div>
                      </div>
                    )}
                    {!isInr && (
                      <div className="mt-1 flex justify-between text-muted-foreground">
                        <span>Tax</span>
                        <span>{formatPoCurrency(0)}</span>
                      </div>
                    )}
                    <div className="mt-3 flex justify-between border-t pt-3 text-base font-semibold">
                      <span>Preview Total</span>
                      <span>{formatPoCurrency(poPreviewTotal)}</span>
                    </div>
                    {showTdsPreview && (
                      <>
                        <div className="mt-2 flex justify-between text-muted-foreground">
                          <span>Less: TDS{poForm.tds_section ? ` (${poForm.tds_section}, ${poTdsPercent}%)` : ` (${poTdsPercent}%)`}</span>
                          <span>- {formatPoCurrency(poTdsAmount)}</span>
                        </div>
                        <div className="mt-1 flex justify-between font-semibold">
                          <span>Net Payable</span>
                          <span>{formatPoCurrency(poNetPayable)}</span>
                        </div>
                      </>
                    )}
                  </section>
                )}
              </div>

              <section className="mt-6 rounded border bg-slate-50/60 p-4">
                <FieldBlock label="Remarks">
                  <Textarea
                    value={poForm.remarks}
                    onChange={(e) => setPoForm((prev) => ({ ...prev, remarks: e.target.value }))}
                    rows={2}
                    placeholder="Additional notes or comments"
                    className="bg-white/80"
                    data-testid="po-remarks-input"
                  />
                </FieldBlock>
              </section>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="border-t px-6 py-4">
          {isPreviewing ? (
            <>
              <Button variant="outline" onClick={() => setPreviewAction(null)} disabled={isCreating}>
                Back to Edit
              </Button>
              <Button
                onClick={() => handleCreatePO({ submitForApproval: previewSubmitForApproval })}
                disabled={isCreating || poUploadEstimate.isDisabled}
                data-testid={previewSubmitForApproval ? "confirm-submit-po-btn" : "confirm-save-draft-po-btn"}
              >
                {(isSavingDraft || isSubmittingForApproval) && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {previewSubmitForApproval ? "Confirm & Submit" : "Confirm & Save Draft"}
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => handleOpenChange(false)}>
                Cancel
              </Button>
              <Button
                variant="outline"
                onClick={() => setPreviewAction("draft")}
                disabled={isCreating}
                data-testid="save-draft-po-btn"
              >
                Save as Draft
              </Button>
              <Button
                onClick={() => setPreviewAction("submit")}
                disabled={isCreating}
                data-testid="submit-po-btn"
              >
                Submit for Approval
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PoFormDialog;
