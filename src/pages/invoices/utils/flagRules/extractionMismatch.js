import { DEFAULT_CURRENCY } from "../../../../utils/currency";
import { calculateInvoiceDataTotals } from "../invoicePayloadBuilders";
import { getTotalTaxAmountFromTotals } from "../invoiceTax";
import { matchesExtracted, matchesExtractedLoosely, isLowConfidenceOverride } from "../extractionComparison";

// MD §5.7: "Tax amount or rate differs from the document by more than ₹1."
// Reused for Form Total Differs From Document (§5.1), which gives no explicit
// number of its own — a small tolerance avoids floating-point false positives either way.
const AMOUNT_TOLERANCE = 1;

const round2 = (value) => Math.round(value * 100) / 100;

/**
 * §5.7 AI-extraction-comparison + §5.1's Form Total Differs From Document
 * (see constants/invoiceFlags.js for why the latter's evaluator lives here).
 * Manually-created invoices (extractedSnapshot === null) short-circuit
 * immediately — there's nothing to compare against.
 *
 * Simple field-value comparisons, confidence-gated per §5.7 "When the AI
 * wasn't sure": correcting a field the AI wasn't confident about never
 * raises a flag. snapshotField is the key both extractedSnapshot and
 * extractedSnapshot.fieldConfidence are read under; formField is where the
 * live value lives on formData (differs only for vendor GSTIN today).
 * matcher defaults to strict matchesExtracted; address fields opt into
 * matchesExtractedLoosely (MD: "names and addresses are compared loosely").
 */
const SIMPLE_FIELDS = [
  { formField: "invoiceNumber", snapshotField: "invoiceNumber", key: "INVOICE_NUMBER_CHANGED_AFTER_EXTRACTION" },
  { formField: "invoiceDate", snapshotField: "invoiceDate", key: "BILLING_DATE_CHANGED_AFTER_EXTRACTION" },
  { formField: "billingGstin", snapshotField: "billingGstin", key: "ORGANISATION_GSTIN_CHANGED_AFTER_EXTRACTION" },
  { formField: "gstin", snapshotField: "vendorGstin", key: "VENDOR_GSTIN_CHANGED_AFTER_EXTRACTION" },
  // Suppresses DOCUMENT_TYPE_MISMATCH (organisationDocument.js) when this
  // one fires — see that flag's evaluator for why both exist.
  { formField: "documentType", snapshotField: "documentType", key: "DOCUMENT_TYPE_CHANGED_AFTER_EXTRACTION" },
  // Suppresses BILLING_ADDRESS_DIFFERS_FROM_DOCUMENT (completeness.js) when
  // this one fires — same pattern as Document Type. Shipping has no §5.6
  // sibling, so nothing to suppress there.
  {
    formField: "billingAddress",
    snapshotField: "billingAddress",
    key: "BILLING_ADDRESS_CHANGED_AFTER_EXTRACTION",
    matcher: matchesExtractedLoosely,
  },
  {
    formField: "shippingAddress",
    snapshotField: "shippingAddress",
    key: "SHIPPING_ADDRESS_CHANGED_AFTER_EXTRACTION",
    matcher: matchesExtractedLoosely,
  },
];

const pushMismatch = (
  instances,
  key,
  snapshotField,
  extractedSnapshot,
  currentValue,
  aiConfidenceThreshold,
  matcher = matchesExtracted,
) => {
  const trimmedCurrent = String(currentValue ?? "").trim();
  if (!trimmedCurrent) return; // empty is Required/Recommended Details Missing's job, not this one's
  if (matcher(extractedSnapshot, snapshotField, currentValue)) return;
  if (isLowConfidenceOverride(extractedSnapshot, snapshotField, aiConfidenceThreshold)) return;

  const extractedValue = String(extractedSnapshot[snapshotField] ?? "").trim();
  instances.push({
    key,
    instanceId: key,
    situationSignature: { field: snapshotField, extractedValue, currentValue: trimmedCurrent },
    evidence: { extractedValue, currentValue: trimmedCurrent },
  });
};

export const evaluateExtractionMismatchFlags = (formData, context = {}) => {
  const instances = [];
  const extractedSnapshot = formData.extractedSnapshot;
  if (!extractedSnapshot) return instances;

  const aiConfidenceThreshold = context.aiConfidenceThreshold;

  SIMPLE_FIELDS.forEach(({ formField, snapshotField, key, matcher }) => {
    pushMismatch(instances, key, snapshotField, extractedSnapshot, formData[formField], aiConfidenceThreshold, matcher);
  });

  const currencyValue = (formData.currency || DEFAULT_CURRENCY).trim();
  pushMismatch(
    instances,
    "CURRENCY_CHANGED_AFTER_EXTRACTION",
    "currency",
    extractedSnapshot,
    currencyValue,
    aiConfidenceThreshold,
  );

  // Vendor Switched After Extraction — compares the resolved vendor record
  // (vendorId), not free-text name, so an ordinary rewording of the same
  // vendor's name never fires this (that's what Vendor Mismatch, §5.2, not
  // yet built, is for). Not confidence-gated: vendor matching is a system
  // decision, not an OCR field read with a confidence score attached to it.
  if (
    extractedSnapshot.vendorId &&
    formData.vendorId &&
    formData.vendorId !== extractedSnapshot.vendorId
  ) {
    instances.push({
      key: "VENDOR_SWITCHED_AFTER_EXTRACTION",
      instanceId: "VENDOR_SWITCHED_AFTER_EXTRACTION",
      situationSignature: {
        extractedVendorId: extractedSnapshot.vendorId,
        currentVendorId: formData.vendorId,
      },
      evidence: {
        extractedVendorName: extractedSnapshot.vendorName,
        currentVendorName: formData.vendorName,
      },
    });
  }

  // extractedSnapshot.total/taxAmount, NOT formData.scannedTotal/
  // scannedTaxAmount: the latter two are display-only overrides that
  // clearScannedTaxSummary() (InvoicesPage.jsx / useApprovalsInvoiceEdit.jsx
  // / InvoiceSingleUploadLayer.jsx) deliberately wipes on every line-item
  // edit — exactly the moment this comparison needs its baseline to still be
  // there. extractedSnapshot is never touched by that function, so it's the
  // only value in formData that stays a durable "what the document said"
  // baseline across edits. See invoicePayloadBuilders.js for where both are set.
  const extractedTotal = Number(extractedSnapshot.total);
  const extractedTaxAmount = Number(extractedSnapshot.taxAmount);
  const needsTotals = Number.isFinite(extractedTaxAmount) || extractedTotal > 0;
  const totals = needsTotals ? calculateInvoiceDataTotals(formData) : null;

  // Tax Changed After Extraction — amount-based (MD: "differs... by more
  // than ₹1"), not a label/string comparison, so relabeling a tax type
  // without changing what's actually owed never fires this. Assumes
  // fieldConfidence is keyed "invoiceTax" for tax, same as no real
  // confidence source exists yet either way — correct this key once one does.
  if (
    totals &&
    Number.isFinite(extractedTaxAmount) &&
    !isLowConfidenceOverride(extractedSnapshot, "invoiceTax", aiConfidenceThreshold)
  ) {
    const liveTaxAmount = getTotalTaxAmountFromTotals(totals);
    if (Math.abs(liveTaxAmount - extractedTaxAmount) > AMOUNT_TOLERANCE) {
      instances.push({
        key: "TAX_CHANGED_AFTER_EXTRACTION",
        instanceId: "TAX_CHANGED_AFTER_EXTRACTION",
        situationSignature: { extractedAmount: round2(extractedTaxAmount), currentAmount: round2(liveTaxAmount) },
        evidence: { extractedAmount: round2(extractedTaxAmount), currentAmount: round2(liveTaxAmount) },
      });
    }
  }

  // Form Total Differs From Document (§5.1) — deliberately reads
  // totals.calculatedTotal, not totals.total: `total` pins itself to
  // scannedTotal whenever one is present (see invoiceTax.js), so it can
  // never disagree with the document by construction. Not confidence-gated
  // — §9 scopes the confidence setting to §5.7 only.
  if (totals && extractedTotal > 0) {
    const calculatedTotal = Number(totals.calculatedTotal);
    if (Number.isFinite(calculatedTotal) && Math.abs(calculatedTotal - extractedTotal) > AMOUNT_TOLERANCE) {
      instances.push({
        key: "FORM_TOTAL_DIFFERS_FROM_DOCUMENT",
        instanceId: "FORM_TOTAL_DIFFERS_FROM_DOCUMENT",
        situationSignature: { extractedAmount: round2(extractedTotal), currentAmount: round2(calculatedTotal) },
        evidence: { extractedAmount: round2(extractedTotal), currentAmount: round2(calculatedTotal) },
      });
    }
  }

  return instances;
};
