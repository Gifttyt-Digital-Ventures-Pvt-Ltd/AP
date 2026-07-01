import React, { useEffect, useMemo, useState } from "react";
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
import { resolvePoTotals } from "../utils/poTotals";
import MeteredActionCostHint from "../../../components/credits/MeteredActionCostHint";
import { CREDIT_ACTION_CODES } from "../../../constants/creditActions";
import { useMeteredActionEstimate } from "../../../hooks/useMeteredActionEstimate";
import PoLogo from "./PoLogo";
import TdsSelectionField from "../../invoices/components/TdsSelectionField";
import { TAX_RATES } from "../../invoices/constants";
import { parseTaxRateFromLabel } from "../../invoices/utils/invoiceTax";
import { buildTdsValue } from "../../invoices/utils/tds";

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

const getRegistrationValue = (registration, ...keys) => {
  for (const key of keys) {
    const value = registration?.[key];
    if (value !== undefined && value !== null && value !== "") return value;
  }
  return "";
};

const normalizeGstin = (value = "") => String(value || "").trim().toUpperCase();

const formatRegistrationLocation = (registration = {}) => {
  const location = registration.location ?? registration.addressDetails ?? registration.address_details;
  if (location && typeof location === "object") {
    return [
      location.addressLine1 ?? location.address_line1,
      location.addressLine2 ?? location.address_line2,
      location.city,
      location.state,
      location.pincode ?? location.postalCode ?? location.postal_code,
      location.country,
    ]
      .filter(Boolean)
      .join(", ");
  }

  return getRegistrationValue(registration, "address", "principalAddress", "principal_address");
};

const getVendorGstRegistrationsForPo = (vendor = {}) => {
  const registrations = vendor.gstRegistrations ?? vendor.gst_regs ?? vendor.gstRegs ?? vendor.gst_registrations;
  const mapped = Array.isArray(registrations)
    ? registrations
      .map((registration) => {
        const gstin = normalizeGstin(getRegistrationValue(registration, "gstin", "gstIn", "gst"));
        if (!gstin) return null;
        return {
          ...registration,
          id: getRegistrationValue(registration, "id", "registrationId", "registration_id") || gstin,
          gstin,
          pan: getRegistrationValue(registration, "pan", "vendorPan", "vendor_pan") || vendor.pan || "",
          state: getRegistrationValue(registration, "state", "stateName", "state_name") || vendor.state || "",
          address: formatRegistrationLocation(registration),
        };
      })
      .filter(Boolean)
    : [];

  const vendorLevelGstin = normalizeGstin(vendor.gstin);
  if (vendorLevelGstin && !mapped.some((registration) => registration.gstin === vendorLevelGstin)) {
    mapped.unshift({
      id: vendorLevelGstin,
      gstin: vendorLevelGstin,
      pan: vendor.pan || "",
      state: vendor.state || "",
      address: [vendor.address_line1 || vendor.addressLine1, vendor.address_line2 || vendor.addressLine2]
        .filter(Boolean)
        .join(", "),
    });
  }

  return mapped;
};

const resolvePoGstSelectionValue = (item = {}) => {
  if (item.gst_tax_label && TAX_RATES.some((option) => option.value === item.gst_tax_label)) {
    return item.gst_tax_label;
  }

  const rate = Number(item.gst_rate);
  const fallback =
    TAX_RATES.find((option) => parseTaxRateFromLabel(option.value) === rate && option.value.startsWith("IGST")) ||
    TAX_RATES.find((option) => parseTaxRateFromLabel(option.value) === rate);

  return fallback?.value || "Exempt";
};

const PoFormDialog = ({
  showCreateDialog,
  setShowCreateDialog,
  poForm,
  setPoForm,
  isEditMode = false,
  editingStatus = "",
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
  onBeforePreview,
  taxMode,
  createAction,
  embedded = false,
  hideFooter = false,
  plainDataMode = false,
  scannedVendorHint = null,
  onRequestVendor,
  requestingVendor = false,
}) => {
  const [previewAction, setPreviewAction] = useState(null);

  const isInr = taxMode === "GST";
  const selectedFormat = formatConfigs.find((format) => format.id === (poForm.po_format_id || activeFormatId)) || formatConfigs[0] || {};
  const sectionOn = (sectionKey) => plainDataMode || isFormatSectionEnabled(selectedFormat, sectionKey);
  const fieldOn = (sectionKey, fieldKey) => plainDataMode || isFormatFieldEnabled(selectedFormat, sectionKey, fieldKey);
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
  const showTdsControls = !plainDataMode && isInr && fieldOn("TAX_TOTALS", "is_tds_applicable");
  const showTdsPreview = showTdsControls && Boolean(poForm.tds_applicable);
  const poTaxableSubtotal = (poForm.line_items || []).reduce((sum, item) => {
    const amount = (Number(item.quantity) || 0) * (Number(item.unit_price) || 0);
    const discount = amount * (Number(item.discount_percent) || 0) / 100;
    return sum + Math.max(amount - discount, 0);
  }, 0);
  const poPreviewTotal = calculatePOTotal();
  const poTotals = useMemo(() => resolvePoTotals(poForm), [poForm]);
  const displayTotal = plainDataMode ? poTotals.total_amount : poPreviewTotal;
  const poTdsPercent = showTdsPreview ? Number(poForm.tds_percent) || 0 : 0;
  const poTdsAmount = showTdsPreview ? poTaxableSubtotal * poTdsPercent / 100 : 0;
  const poNetPayable = poPreviewTotal - poTdsAmount;
  const poTdsSelectionValue = showTdsPreview
    ? buildTdsValue({
        tdsSectionId: poForm.tds_section || undefined,
        tdsSectionCode: poForm.tds_section || null,
        tdsRate: poForm.tds_percent,
      })
    : "";
  const selectedVendor = vendors.find((vendor) => String(vendor.id) === String(poForm.vendor_id));
  const vendorGstRegistrations = useMemo(
    () => getVendorGstRegistrationsForPo(selectedVendor),
    [selectedVendor],
  );
  const selectedVendorRegistration = vendorGstRegistrations.find((registration) =>
    String(registration.id) === String(poForm.vendor_gst_registration_id) ||
    registration.gstin === normalizeGstin(poForm.vendor_gstin),
  );

  useEffect(() => {
    if (!showCreateDialog && !embedded) setPreviewAction(null);
  }, [embedded, showCreateDialog]);

  useEffect(() => {
    if (!isInr || !poForm.vendor_id || vendorGstRegistrations.length === 0) return;

    const scannedMatch = vendorGstRegistrations.find(
      (registration) => registration.gstin === normalizeGstin(poForm.scanned_vendor_gstin),
    );
    const currentMatch = vendorGstRegistrations.find(
      (registration) =>
        String(registration.id) === String(poForm.vendor_gst_registration_id) ||
        registration.gstin === normalizeGstin(poForm.vendor_gstin),
    );
    const nextRegistration = currentMatch || scannedMatch || (vendorGstRegistrations.length === 1 ? vendorGstRegistrations[0] : null);
    if (!nextRegistration) return;

    setPoForm((prev) => {
      if (
        String(prev.vendor_gst_registration_id || "") === String(nextRegistration.id || "") &&
        normalizeGstin(prev.vendor_gstin) === nextRegistration.gstin &&
        String(prev.vendor_pan || "") === String(nextRegistration.pan || "")
      ) {
        return prev;
      }

      return {
        ...prev,
        vendor_gst_registration_id: nextRegistration.id,
        vendor_gstin: nextRegistration.gstin,
        vendor_pan: nextRegistration.pan || "",
      };
    });
  }, [
    isInr,
    poForm.vendor_id,
    poForm.vendor_gst_registration_id,
    poForm.vendor_gstin,
    poForm.scanned_vendor_gstin,
    setPoForm,
    vendorGstRegistrations,
  ]);

  const handleOpenChange = (open) => {
    if (!open) setPreviewAction(null);
    setShowCreateDialog?.(open);
  };

  const handlePreviewAction = (action) => {
    const canPreview = onBeforePreview?.({ submitForApproval: action === "submit" });
    if (canPreview === false) return;
    setPreviewAction(action);
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
              <Select
                value={resolvePoGstSelectionValue(item)}
                onValueChange={(value) => {
                  const nextRate = parseTaxRateFromLabel(value);
                  setPoForm((prev) => ({
                    ...prev,
                    line_items: prev.line_items.map((lineItem, lineIndex) =>
                      lineIndex === idx
                        ? {
                            ...lineItem,
                            gst_rate: nextRate,
                            gst_tax_label: value,
                          }
                        : lineItem,
                    ),
                  }));
                }}
              >
                <SelectTrigger className="h-9 min-w-[150px] bg-white/80">
                  <SelectValue placeholder="Select tax" />
                </SelectTrigger>
                <SelectContent>
                  {TAX_RATES.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
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

  const dialogFooter = (
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
            {previewSubmitForApproval ? "Confirm & Submit" : isEditMode ? "Confirm & Save Changes" : "Confirm & Save Draft"}
          </Button>
        </>
      ) : (
        <>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>
          <Button
            variant="outline"
            onClick={() => handlePreviewAction("draft")}
            disabled={isCreating}
            data-testid="save-draft-po-btn"
          >
            {isEditMode ? "Save Changes" : "Save as Draft"}
          </Button>
          <Button
            onClick={() => handlePreviewAction("submit")}
            disabled={isCreating}
            data-testid="submit-po-btn"
          >
            Submit for Approval
          </Button>
        </>
      )}
    </DialogFooter>
  );

  const formContent = (
    <>
      <div className={`overflow-y-auto bg-slate-100 ${embedded ? 'px-4 py-4' : 'px-6 py-5'}`}>
        <div className="mx-auto max-w-5xl space-y-4">
          {!plainDataMode && isPreviewing && (
            <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
              Review this PO exactly as it will be saved with the selected format. Go back to edit if anything needs changing.
            </div>
          )}
          {!plainDataMode && isPreviewing && (
            <MeteredActionCostHint actionCode={CREDIT_ACTION_CODES.PO_UPLOAD} />
          )}
          {!plainDataMode ? (
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
          ) : (
            <div className="rounded-md border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">
              Data extracted from the uploaded vendor PO. The original document is shown on the left — review and correct fields before saving.
            </div>
          )}

          <div className={isPreviewing ? "pointer-events-none" : ""}>
            <div className={`bg-white shadow-sm ${plainDataMode ? 'rounded-lg border p-4 md:p-6' : `${documentBorderClass} p-6 md:p-8`}`}>
              {plainDataMode ? (
                <div className="mb-5 space-y-4 border-b pb-5">
                  <div>
                    <h2 className="text-lg font-semibold">Vendor Purchase Order</h2>
                    <p className="text-xs text-muted-foreground">Extracted from uploaded document — not an internal PO format.</p>
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    <FieldBlock label="PO Number">
                      <Input
                        value={poForm.po_number || ''}
                        onChange={(e) => setPoForm((prev) => ({ ...prev, po_number: e.target.value }))}
                        placeholder="As on vendor PO"
                        className={inputClassName}
                        data-testid="upload-po-number-input"
                      />
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
                    <FieldBlock label="PO Date">
                      <Input type="date" value={poForm.po_date} onChange={(e) => setPoForm((prev) => ({ ...prev, po_date: e.target.value }))} className={inputClassName} data-testid="po-date-input" />
                    </FieldBlock>
                    <FieldBlock label="Valid Till">
                      <Input type="date" value={poForm.valid_till} onChange={(e) => setPoForm((prev) => ({ ...prev, valid_till: e.target.value }))} className={inputClassName} data-testid="valid-till-input" />
                    </FieldBlock>
                    <FieldBlock label="Delivery Date">
                      <Input type="date" value={poForm.expected_delivery_date} onChange={(e) => setPoForm((prev) => ({ ...prev, expected_delivery_date: e.target.value }))} className={inputClassName} data-testid="delivery-date-input" />
                    </FieldBlock>
                  </div>
                </div>
              ) : null}
              {!plainDataMode && sectionOn("HEADER") && (
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
                      <Select
                        value={poForm.vendor_id}
                        onValueChange={(v) =>
                          setPoForm((prev) => ({
                            ...prev,
                            vendor_id: v,
                            vendor_gst_registration_id: "",
                            vendor_gstin: "",
                            vendor_pan: "",
                          }))
                        }
                      >
                        <SelectTrigger className="h-9 bg-white/80" data-testid="vendor-select">
                          <SelectValue placeholder="Select vendor" />
                        </SelectTrigger>
                        <SelectContent>
                          {vendors.map((v) => (
                            <SelectItem key={v.id} value={String(v.id)}>
                              {v.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FieldBlock>
                    {scannedVendorHint && !poForm.vendor_id ? (
                      <div className="mt-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2">
                        <p className="text-xs text-amber-800">
                          Scanned vendor: {scannedVendorHint.name}
                          {scannedVendorHint.gstin ? ` · ${scannedVendorHint.gstin}` : ''}. Select a matching vendor or request addition.
                        </p>
                        {onRequestVendor ? (
                          <Button
                            type="button"
                            size="sm"
                            className="mt-2"
                            onClick={onRequestVendor}
                            disabled={requestingVendor}
                            data-testid="po-upload-request-vendor-btn"
                          >
                            {requestingVendor ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            Request Vendor
                          </Button>
                        ) : null}
                      </div>
                    ) : null}
                    {isInr && poForm.vendor_id && vendorGstRegistrations.length > 1 ? (
                      <FieldBlock label="Vendor GST Registration" className="mt-3">
                        <Select
                          value={String(selectedVendorRegistration?.id || "")}
                          onValueChange={(registrationId) => {
                            const registration = vendorGstRegistrations.find((item) => String(item.id) === String(registrationId));
                            setPoForm((prev) => ({
                              ...prev,
                              vendor_gst_registration_id: registration?.id || "",
                              vendor_gstin: registration?.gstin || "",
                              vendor_pan: registration?.pan || "",
                            }));
                          }}
                        >
                          <SelectTrigger className="h-9 bg-white/80" data-testid="vendor-gst-registration-select">
                            <SelectValue placeholder="Select GSTIN / location" />
                          </SelectTrigger>
                          <SelectContent>
                            {vendorGstRegistrations.map((registration) => (
                              <SelectItem key={registration.id} value={String(registration.id)}>
                                {registration.gstin}
                                {registration.state ? ` · ${registration.state}` : ""}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {selectedVendorRegistration?.address ? (
                          <p className="mt-1 text-xs text-muted-foreground">
                            {selectedVendorRegistration.address}
                          </p>
                        ) : null}
                      </FieldBlock>
                    ) : null}
                    {isInr && (fieldOn("VENDOR", "vendor_gstin") || fieldOn("VENDOR", "vendor_pan")) && poForm.vendor_id ? (
                      <p className="mt-2 text-xs text-muted-foreground">
                        {selectedVendorRegistration
                          ? `Using verified GSTIN ${selectedVendorRegistration.gstin}${selectedVendorRegistration.pan ? ` and PAN ${selectedVendorRegistration.pan}` : ""}.`
                          : "Select a GST registration to use verified GSTIN, PAN, and address details."}
                      </p>
                    ) : null}
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
                          <Input
                            value={poForm.place_of_supply}
                            onChange={(e) => setPoForm((prev) => ({ ...prev, place_of_supply: plainDataMode ? e.target.value : e.target.value.toUpperCase().slice(0, 2) }))}
                            placeholder={plainDataMode ? 'State or place of supply' : 'State code, e.g. MH'}
                            className={inputClassName}
                            data-testid="place-of-supply-input"
                          />
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
                        <TdsSelectionField
                          value={poTdsSelectionValue}
                          onChange={(selection) =>
                            setPoForm((prev) => ({
                              ...prev,
                              tds_applicable: Boolean(selection.tdsRate),
                              tds_section: selection.tdsSectionCode || "",
                              tds_percent: selection.tdsRate ?? "",
                            }))
                          }
                          label="TDS"
                          selectClassName="h-9 min-w-[220px] bg-white/80"
                          inputClassName="h-9 w-24 bg-white/80"
                          testIdPrefix="po-tds"
                        />
                      </div>
                    )}
                    {!isInr && (
                      <div className="mt-1 flex justify-between text-muted-foreground">
                        <span>Tax</span>
                        <span>{formatPoCurrency(0)}</span>
                      </div>
                    )}
                    {plainDataMode && isInr ? (
                      <>
                        <div className="mt-3 flex justify-between text-muted-foreground">
                          <span>Subtotal</span>
                          <span>{formatPoCurrency(poTotals.subtotal)}</span>
                        </div>
                        {poTotals.total_discount > 0 ? (
                          <div className="mt-1 flex justify-between text-muted-foreground">
                            <span>Discount</span>
                            <span>- {formatPoCurrency(poTotals.total_discount)}</span>
                          </div>
                        ) : null}
                        {poTotals.total_taxable_value > 0 &&
                        poTotals.total_taxable_value !== poTotals.subtotal - poTotals.total_discount ? (
                          <div className="mt-1 flex justify-between text-muted-foreground">
                            <span>Taxable Value</span>
                            <span>{formatPoCurrency(poTotals.total_taxable_value)}</span>
                          </div>
                        ) : null}
                        {poTotals.total_cgst > 0 ? (
                          <div className="mt-1 flex justify-between text-muted-foreground">
                            <span>CGST</span>
                            <span>{formatPoCurrency(poTotals.total_cgst)}</span>
                          </div>
                        ) : null}
                        {poTotals.total_sgst > 0 ? (
                          <div className="mt-1 flex justify-between text-muted-foreground">
                            <span>SGST</span>
                            <span>{formatPoCurrency(poTotals.total_sgst)}</span>
                          </div>
                        ) : null}
                        {poTotals.total_igst > 0 ? (
                          <div className="mt-1 flex justify-between text-muted-foreground">
                            <span>IGST</span>
                            <span>{formatPoCurrency(poTotals.total_igst)}</span>
                          </div>
                        ) : null}
                        {poTotals.total_cess > 0 ? (
                          <div className="mt-1 flex justify-between text-muted-foreground">
                            <span>CESS</span>
                            <span>{formatPoCurrency(poTotals.total_cess)}</span>
                          </div>
                        ) : null}
                        <div className="mt-1 flex justify-between text-muted-foreground">
                          <span>Tax</span>
                          <span>{formatPoCurrency(poTotals.tax_amount)}</span>
                        </div>
                        <div className="mt-3 flex justify-between border-t pt-3 text-base font-semibold">
                          <span>Total</span>
                          <span>{formatPoCurrency(displayTotal)}</span>
                        </div>
                      </>
                    ) : (
                      <div className="mt-3 flex justify-between border-t pt-3 text-base font-semibold">
                        <span>Preview Total</span>
                        <span>{formatPoCurrency(poPreviewTotal)}</span>
                      </div>
                    )}
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
    </>
  );

  if (embedded) {
    return (
      <div className="flex h-full min-h-0 flex-col overflow-hidden">
        {formContent}
      </div>
    );
  }

  return (
    <Dialog open={showCreateDialog} onOpenChange={handleOpenChange}>
      <DialogContent className="flex flex-col w-[96vw] max-w-6xl max-h-[92vh] overflow-hidden p-0">
        <DialogHeader className="border-b px-6 pt-6 pb-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <DialogTitle>{isEditMode ? "Edit Purchase Order" : "Create Purchase Order"}</DialogTitle>
              <p className="mt-1 text-xs text-muted-foreground">
                {isPreviewing
                  ? "Preview before saving in"
                  : isEditMode
                    ? `Revising ${editingStatus || "purchase order"} in`
                    : "Editing in selected format:"} {selectedFormat.name || "PO Format"} ({templateCode})
              </p>
            </div>
          </div>
        </DialogHeader>

        {formContent}

        {!hideFooter ? dialogFooter : null}
      </DialogContent>
    </Dialog>
  );
};

export default PoFormDialog;
