import { LINE_ITEM_MODE_SUMMARY_ONLY, isInrInvoiceCurrency, parseTaxRateFromLabel } from "../invoiceTax";
import { calculateInvoiceDataTotals } from "../invoicePayloadBuilders";
import { resolveTdsRate, CUSTOM_TDS_SECTION_ID, buildTdsOptionsFromSection, parseTdsSelection } from "../tds";
import { hasConfiguredVendorTds, normalizeVendorTds } from "../../../vendors/utils/vendorTds";

const AMOUNT_TOLERANCE = 1; // ₹1 — same tolerance used throughout extractionMismatch.js
const TDS_RATE_TOLERANCE = 0.01; // percentage points — float-safety only, not a real business tolerance
// MD §5.5, verbatim: "isn't a recognised GST slab (0, 0.25, 3, 5, 12, 18, 28%)".
const RECOGNISED_GST_SLABS = [0, 0.25, 3, 5, 12, 18, 28];
const round2 = (value) => Math.round(value * 100) / 100;

/**
 * §5.5 Tax and compliance — GST Treatment Not Set, Tax Total Does Not
 * Reconcile, Net Payable Manually Overridden, Tax Type Contradicts Place Of
 * Supply, Tax Charged By Unregistered Vendor. Phase 3 adds the remaining 7
 * §5.5 flags later, same shape.
 */
export const evaluateTaxComplianceFlags = (formData, context = {}) => {
  const instances = [];
  if (!formData) return instances;

  // "Both parties are GST-registered but the GST treatment is left as N/A."
  // Mirrors InvoiceFormChecklist.jsx's own isGstinRequired check.
  const orgIsGstRegistered = (context.organisationGstins || []).length > 0;
  const vendorIsGstRegistered = !!context.selectedVendor?.gstin;
  if (orgIsGstRegistered && vendorIsGstRegistered && formData.gstTreatment === "N/A") {
    instances.push({
      key: "GST_TREATMENT_NOT_SET",
      instanceId: "GST_TREATMENT_NOT_SET",
      situationSignature: { gstTreatment: "N/A" },
      evidence: null,
    });
  }

  // Tax Total Does Not Reconcile — see the design notes in
  // invoicePayloadBuilders.js (lastReconciledTaxTotal) and
  // invoiceMappers.js. Both sides of this comparison are checkpoint-only
  // values (totalTaxAmount isn't live-synced by any edit handler in detailed
  // mode; lastReconciledTaxTotal is deliberately built the same way), so an
  // ordinary line-item edit moves neither side and can't flip this flag's
  // state by itself — it can only be active because the two were already
  // inconsistent at the last reconciliation checkpoint (bad OCR/import data),
  // never because of live editing. Summary-only mode has no line items to
  // reconcile against.
  if (formData.lineItemMode !== LINE_ITEM_MODE_SUMMARY_ONLY) {
    const declaredTaxTotal = Number(formData.totalTaxAmount);
    const reconciledTaxTotal = Number(formData.lastReconciledTaxTotal);
    if (
      Number.isFinite(declaredTaxTotal) &&
      Number.isFinite(reconciledTaxTotal) &&
      Math.abs(declaredTaxTotal - reconciledTaxTotal) > AMOUNT_TOLERANCE
    ) {
      instances.push({
        key: "TAX_TOTAL_DOES_NOT_RECONCILE",
        instanceId: "TAX_TOTAL_DOES_NOT_RECONCILE",
        situationSignature: {
          declaredTaxTotal: round2(declaredTaxTotal),
          reconciledTaxTotal: round2(reconciledTaxTotal),
        },
        evidence: {
          declaredTaxTotal: round2(declaredTaxTotal),
          reconciledTaxTotal: round2(reconciledTaxTotal),
        },
      });
    }
  }

  // Tax Type Contradicts Place Of Supply / Tax Charged By Unregistered
  // Vendor — both read the same live tax breakdown, computed once here and
  // shared between them (not merged with Net Payable Manually Overridden's
  // own totals computation below — that flag is explicitly out of scope to
  // touch in this change, so it keeps its own separate, untouched call).
  // GST (CGST/SGST/IGST) is an INR-only concept, so both are gated on
  // isInrInvoiceCurrency — calculateInvoiceDataTotals handles both invoice-
  // level and line-item-level tax modes internally already, no extra gating needed.
  if (isInrInvoiceCurrency(formData.currency)) {
    const totals = calculateInvoiceDataTotals(formData);
    const appliedIgst = (Number(totals.igst) || 0) > 0;
    const appliedCgstSgst = (Number(totals.cgst) || 0) > 0 || (Number(totals.sgst) || 0) > 0;

    // "Source and destination are the same state but IGST is applied, or
    // they're different states but CGST/SGST is applied." Only evaluated
    // when both places are actually known — can't judge same-vs-different
    // state from one missing value, and firing on a guess would be worse
    // than staying silent for a Must-explain flag.
    const sourceOfSupply = String(formData.sourceOfSupply ?? "").trim();
    const destinationOfSupply = String(formData.destinationOfSupply ?? "").trim();
    if (sourceOfSupply && destinationOfSupply && (appliedIgst || appliedCgstSgst)) {
      const sameState = sourceOfSupply.toLowerCase() === destinationOfSupply.toLowerCase();
      const contradicts = (sameState && appliedIgst) || (!sameState && appliedCgstSgst);
      if (contradicts) {
        instances.push({
          key: "TAX_TYPE_CONTRADICTS_PLACE_OF_SUPPLY",
          instanceId: "TAX_TYPE_CONTRADICTS_PLACE_OF_SUPPLY",
          situationSignature: { sourceOfSupply, destinationOfSupply, appliedTaxType: appliedIgst ? "IGST" : "CGST/SGST" },
          evidence: { sourceOfSupply, destinationOfSupply, appliedTaxType: appliedIgst ? "IGST" : "CGST/SGST" },
        });
      }
    }

    // "The vendor has no GSTIN but the invoice charges GST." Reads the
    // invoice-level formData.gstin (the field the form and checklist both
    // already treat as this invoice's vendor GSTIN), not a vendor-dropdown
    // object — the lesson from GST_TREATMENT_NOT_SET's original bug.
    const vendorHasNoGstin = !String(formData.gstin ?? "").trim();
    if (vendorHasNoGstin && (appliedIgst || appliedCgstSgst)) {
      instances.push({
        key: "TAX_CHARGED_BY_UNREGISTERED_VENDOR",
        instanceId: "TAX_CHARGED_BY_UNREGISTERED_VENDOR",
        situationSignature: { appliedTaxType: appliedIgst ? "IGST" : "CGST/SGST" },
        evidence: { appliedTaxType: appliedIgst ? "IGST" : "CGST/SGST" },
      });
    }
  }

  // Net Payable Manually Overridden — recomputes the exact same formula
  // InvoiceForm.jsx uses for its live auto-sync effect (fallbackTdsAmount /
  // calculatedNetPayable), so this can only diverge from formData.netAmount
  // when there's a genuine override: either a live in-session edit (which
  // suspends that auto-sync effect) or a value already persisted from a
  // prior session. An ordinary line-item/tax edit moves totals.total, which
  // moves calculatedNetPayable, which the form's own sync effect immediately
  // mirrors into formData.netAmount too — both sides move together, so
  // ordinary edits can't create a false positive here.
  if (context.isNetPayableEditEnabled !== false) {
    const netAmount = Number(formData.netAmount);
    if (Number.isFinite(netAmount) && (formData.lineItems?.length > 0 || formData.subTotal)) {
      const totals = calculateInvoiceDataTotals(formData);
      const tdsRate = resolveTdsRate(formData.tds, formData.tdsRate);
      const fallbackTdsAmount = round2((Number(totals.subTotal) || 0) * tdsRate / 100);
      const calculatedNetPayable = Math.max(round2((Number(totals.total) || 0) - fallbackTdsAmount), 0);
      if (Math.abs(netAmount - calculatedNetPayable) > AMOUNT_TOLERANCE) {
        instances.push({
          key: "NET_PAYABLE_MANUALLY_OVERRIDDEN",
          instanceId: "NET_PAYABLE_MANUALLY_OVERRIDDEN",
          situationSignature: { calculatedAmount: calculatedNetPayable, currentAmount: round2(netAmount) },
          evidence: { calculatedAmount: calculatedNetPayable, currentAmount: round2(netAmount) },
        });
      }
    }
  }

  // "A different TDS section is selected than the one on the vendor
  // record." Reuses hasConfiguredVendorTds/normalizeVendorTds — the exact
  // helpers TDS_MAPPING_NOT_APPLIED already proved safe (flagRules/vendor.js)
  // — but fires in the opposite direction: that flag requires formData.tds
  // to be falsy, this requires it to be truthy. Compares by sectionCode
  // (human-meaningful, e.g. "194C"), not tdsSectionId, since the vendor-side
  // TDS picker's id space hasn't been verified to share the invoice-side
  // one — sectionCode is what the MD itself calls "the section."
  // normalizeVendorTds already trims+uppercases sectionCode;
  // formData.tdsSectionCode gets the same treatment inline for a safe,
  // symmetric comparison.
  if (formData.tds && context.selectedVendorDetail && hasConfiguredVendorTds(context.selectedVendorDetail)) {
    const vendorSectionCode = normalizeVendorTds(context.selectedVendorDetail).sectionCode;
    const invoiceSectionCode = String(formData.tdsSectionCode ?? "").trim().toUpperCase();
    if (vendorSectionCode && invoiceSectionCode && vendorSectionCode !== invoiceSectionCode) {
      instances.push({
        key: "TDS_SECTION_DIFFERS_FROM_VENDOR_MASTER",
        instanceId: "TDS_SECTION_DIFFERS_FROM_VENDOR_MASTER",
        situationSignature: { vendorId: formData.vendorId ?? null, vendorSectionCode, invoiceSectionCode },
        evidence: { vendorSectionCode, invoiceSectionCode },
      });
    }
  }

  // "The TDS rate applied isn't the statutory rate for the selected
  // section" — compares against the SECTION's own statutory rate, not the
  // vendor's configured rate (that's the flag above; a genuinely different
  // reference point). context.tdsSections is the merged live+default list
  // useInvoiceFlags.js fetches via the same useGetTdsSectionsQuery()
  // TdsSelectionField.jsx already uses. Reuses buildTdsOptionsFromSection +
  // parseTdsSelection — the exact pair TdsSelectionField's own emitChange
  // uses to produce formData.tdsSectionId in the first place — so matching
  // by tdsSectionId here is symmetric with how that id was set, not a new
  // normalization system. One section code can have multiple statutory
  // rates for different sub-categories (e.g. 194C: 1% individual/HUF vs 2%
  // others), which is exactly why this matches by the exact row id, not
  // sectionCode. Silent for CUSTOM_TDS_SECTION_ID (no statutory row to
  // compare a deliberately custom rate against) and when no matching row is
  // found (unresolved id, or context.tdsSections hasn't loaded yet — fails
  // safe rather than guessing).
  const invoiceTdsSectionId = formData.tdsSectionId;
  if (
    formData.tds &&
    invoiceTdsSectionId &&
    invoiceTdsSectionId !== CUSTOM_TDS_SECTION_ID &&
    Array.isArray(context.tdsSections) &&
    context.tdsSections.length > 0
  ) {
    const statutoryOption = context.tdsSections
      .flatMap(buildTdsOptionsFromSection)
      .find((option) => parseTdsSelection(option.value).tdsSectionId === invoiceTdsSectionId);

    if (statutoryOption) {
      const statutoryRate = parseTdsSelection(statutoryOption.value).tdsRate;
      const appliedRate = resolveTdsRate(formData.tds, formData.tdsRate);
      if (
        Number.isFinite(statutoryRate) &&
        Number.isFinite(appliedRate) &&
        Math.abs(appliedRate - statutoryRate) > TDS_RATE_TOLERANCE
      ) {
        instances.push({
          key: "TDS_RATE_OVERRIDDEN",
          instanceId: "TDS_RATE_OVERRIDDEN",
          situationSignature: { tdsSectionId: invoiceTdsSectionId, statutoryRate, appliedRate },
          evidence: { statutoryRate, appliedRate },
        });
      }
    }
  }

  // HSN/SAC Code Missing + Unusual Tax Rate — the first two per-line flags.
  // Both are GST-specific concepts (HSN/SAC is an Indian GST classification;
  // the MD's own slab list is explicitly "GST slab"), so gated to INR
  // invoices the same way TAX_TYPE_CONTRADICTS_PLACE_OF_SUPPLY/
  // TAX_CHARGED_BY_UNREGISTERED_VENDOR already are above. Skipped entirely
  // in Summary-Only mode (no line items to inspect), same gate
  // TAX_TOTAL_DOES_NOT_RECONCILE uses. instanceId is `${key}:${line.id}` —
  // line.id is the stable, index-independent identity every line item now
  // carries (see generateLineItemId/mapExtractedLineItemToForm in
  // invoiceTax.js) — a line with no id (shouldn't be reachable in practice
  // once every creation path is covered) is skipped rather than falling
  // back to an unstable, position-derived identity.
  if (
    isInrInvoiceCurrency(formData.currency) &&
    formData.lineItemMode !== LINE_ITEM_MODE_SUMMARY_ONLY &&
    Array.isArray(formData.lineItems)
  ) {
    formData.lineItems.forEach((line, index) => {
      const lineId = line?.id;
      if (!lineId) return;

      const lineNumber = index + 1;
      const lineDescription = String(line?.description ?? "").trim();
      const effectiveRate = parseTaxRateFromLabel(line?.tax);

      // "Tax is being charged on a line with no HSN code." Only fires when
      // tax is actually applied (rate > 0) — an exempt/unedited line has
      // nothing to reconcile against an HSN code for.
      const hsnSac = String(line?.hsnSac ?? "").trim();
      if (!hsnSac && effectiveRate > 0) {
        instances.push({
          key: "HSN_SAC_CODE_MISSING",
          instanceId: `HSN_SAC_CODE_MISSING:${lineId}`,
          situationSignature: { lineId },
          evidence: { lineNumber, lineDescription, lineId },
        });
      }

      // "The effective rate on a line isn't a recognised GST slab." 0% is a
      // recognised slab, so a blank/unedited line (rate resolves to 0) and a
      // genuinely exempt line both stay silent.
      if (!RECOGNISED_GST_SLABS.includes(effectiveRate)) {
        instances.push({
          key: "UNUSUAL_TAX_RATE",
          instanceId: `UNUSUAL_TAX_RATE:${lineId}`,
          situationSignature: { lineId, effectiveRate },
          evidence: { lineNumber, lineDescription, effectiveRate, lineId },
        });
      }
    });
  }

  return instances;
};
