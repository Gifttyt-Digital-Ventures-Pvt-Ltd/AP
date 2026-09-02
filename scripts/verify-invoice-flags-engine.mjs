/**
 * Standalone verification for the Invoice Flags rule engine — pure
 * functions, zero React/RTK Query dependency by design, so this runs
 * without spinning up the app. No test framework exists in this repo, so
 * this is committed (not disposable) given the size of the rule catalog.
 *
 * Run (bundles JSX out of the completeness.js -> InvoiceFormChecklist.jsx
 * import chain, since plain Node can't parse .jsx directly):
 *   npx esbuild --bundle --platform=node --format=esm --loader:.jsx=jsx \
 *     scripts/verify-invoice-flags-engine.mjs \
 *     --outfile=/tmp/verify-invoice-flags-engine.bundle.mjs \
 *   && node /tmp/verify-invoice-flags-engine.bundle.mjs
 */
import assert from "node:assert/strict";
import {
  evaluateInvoiceFlags,
  mergeFlagsWithResolutions,
} from "../src/pages/invoices/utils/invoiceFlagsEngine.js";
import { INVOICE_FLAG_CATALOG, INVOICE_FLAG_SEVERITY, INVOICE_FLAG_ACTION } from "../src/pages/invoices/constants/invoiceFlags.js";
import { calculateInvoiceDataTotals } from "../src/pages/invoices/utils/invoicePayloadBuilders.js";
import { LINE_ITEM_MODE_SUMMARY_ONLY } from "../src/pages/invoices/utils/invoiceTax.js";
import { resolveTdsRate, CUSTOM_TDS_SECTION_ID } from "../src/pages/invoices/utils/tds.js";
import { buildInvoiceEditFormData } from "../src/pages/invoices/utils/invoiceFormData.js";
import { selectBlockingFlagsResolvedByOthers, BLOCKING_SEVERITIES } from "../src/pages/invoices/utils/flagLifecycleSelectors.js";
import { canReopenInvoiceFlagsForInvoice, canResolveInvoiceFlag } from "../src/utils/approvalWorkflow.js";
import {
  buildInvoiceApiPayload,
  buildCreateInvoiceRequestBody,
  toInvoiceApiPayload,
  normalizeInvoiceResponse,
} from "../src/Services/utils/invoiceMappers.js";
import { resolveFixInFormFieldKey } from "../src/pages/invoices/utils/invoiceFieldNavigation.js";
import {
  INVOICE_CONFIG_SECTIONS,
  isChecklistFlagsEnabled,
} from "../src/utils/invoiceConfiguration.js";

let passed = 0;
const check = (label, fn) => {
  try {
    fn();
    passed += 1;
    console.log(`  ok  ${label}`);
  } catch (error) {
    console.error(`FAIL  ${label}`);
    console.error(error);
    process.exitCode = 1;
  }
};

const keysOf = (instances) => instances.map((instance) => instance.key).sort();

// ---------------------------------------------------------------------------
console.log("evaluateInvoiceFlags — GSTIN_MISMATCH");

check("fires when billingGstin isn't one of the org's registered GSTINs", () => {
  const instances = evaluateInvoiceFlags(
    { billingGstin: "27ZZZZZ0000Z1Z9" },
    { organisationGstins: ["27ABCDE1234F1Z5"] },
  );
  assert.ok(keysOf(instances).includes("GSTIN_MISMATCH"));
});

check("does not fire when billingGstin matches (case/whitespace-insensitive)", () => {
  const instances = evaluateInvoiceFlags(
    { billingGstin: " 27abcde1234f1z5 " },
    { organisationGstins: ["27ABCDE1234F1Z5"] },
  );
  assert.ok(!keysOf(instances).includes("GSTIN_MISMATCH"));
});

check("does not fire when there's no reference data yet (org GSTIN list not loaded)", () => {
  const instances = evaluateInvoiceFlags({ billingGstin: "27ZZZZZ0000Z1Z9" }, { organisationGstins: [] });
  assert.ok(!keysOf(instances).includes("GSTIN_MISMATCH"));
});

// ---------------------------------------------------------------------------
console.log("evaluateInvoiceFlags — DUPLICATE_INVOICE");

check("fires on a non-deemphasized exact match", () => {
  const instances = evaluateInvoiceFlags(
    { invoiceNumber: "INV-1", vendorId: "vendor-1" },
    { duplicateCandidates: { exactMatches: [{ id: "inv-9", deemphasized: false }] } },
  );
  assert.ok(keysOf(instances).includes("DUPLICATE_INVOICE"));
});

check("does not fire when the only exact match is cancelled/rejected (deemphasized)", () => {
  const instances = evaluateInvoiceFlags(
    { invoiceNumber: "INV-1", vendorId: "vendor-1" },
    { duplicateCandidates: { exactMatches: [{ id: "inv-9", deemphasized: true }] } },
  );
  assert.ok(!keysOf(instances).includes("DUPLICATE_INVOICE"));
});

// ---------------------------------------------------------------------------
console.log("evaluateInvoiceFlags — INVOICE_DATE_OUT_OF_PERIOD");

check("fires when invoiceDate is outside the current accounting period", () => {
  const instances = evaluateInvoiceFlags(
    { invoiceDate: "2026-07-15" },
    { currentAccountingPeriod: { start: "2026-08-01", end: "2026-08-31" } },
  );
  assert.ok(keysOf(instances).includes("INVOICE_DATE_OUT_OF_PERIOD"));
});

check("does not fire when invoiceDate is inside the current period", () => {
  const instances = evaluateInvoiceFlags(
    { invoiceDate: "2026-08-15" },
    { currentAccountingPeriod: { start: "2026-08-01", end: "2026-08-31" } },
  );
  assert.ok(!keysOf(instances).includes("INVOICE_DATE_OUT_OF_PERIOD"));
});

// ---------------------------------------------------------------------------
console.log("evaluateInvoiceFlags — MSME_VENDOR");

check("fires when the selected vendor is MSME", () => {
  const instances = evaluateInvoiceFlags({ vendorId: "vendor-1" }, { selectedVendor: { id: "vendor-1", msme: true } });
  assert.ok(keysOf(instances).includes("MSME_VENDOR"));
});

check("does not fire when the selected vendor is not MSME", () => {
  const instances = evaluateInvoiceFlags(
    { vendorId: "vendor-1" },
    { selectedVendor: { id: "vendor-1", msme: false } },
  );
  assert.ok(!keysOf(instances).includes("MSME_VENDOR"));
});

// ---------------------------------------------------------------------------
console.log("evaluateInvoiceFlags — DUE_DATE_PRECEDES_BILLING_DATE");

check("fires when dueDate is earlier than invoiceDate", () => {
  const instances = evaluateInvoiceFlags({ invoiceDate: "2026-08-10", dueDate: "2026-08-01" }, {});
  assert.ok(keysOf(instances).includes("DUE_DATE_PRECEDES_BILLING_DATE"));
});

check("does not fire when dueDate is on/after invoiceDate", () => {
  const instances = evaluateInvoiceFlags({ invoiceDate: "2026-08-10", dueDate: "2026-08-20" }, {});
  assert.ok(!keysOf(instances).includes("DUE_DATE_PRECEDES_BILLING_DATE"));
});

check("does not fire when dueDate is empty (Due Date is not required)", () => {
  const instances = evaluateInvoiceFlags({ invoiceDate: "2026-08-10", dueDate: "" }, {});
  assert.ok(!keysOf(instances).includes("DUE_DATE_PRECEDES_BILLING_DATE"));
});

// ---------------------------------------------------------------------------
console.log("evaluateInvoiceFlags — Future-Dated / Due Date Not Set / Already Past Due / Older Than Threshold / ITC Window");

// Fixed "now" so these tests never depend on the real system clock, unlike
// the rest of this file's date fixtures (which don't set context.today and
// are tolerant of that because they never assert on these new keys).
const PINNED_TODAY = "2026-08-26";
const isoDaysFrom = (baseIso, offsetDays) => {
  const date = new Date(`${baseIso}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + offsetDays);
  return date.toISOString().slice(0, 10);
};

check("FUTURE_DATED_INVOICE fires when the billing date is in the future", () => {
  const instances = evaluateInvoiceFlags({ invoiceDate: isoDaysFrom(PINNED_TODAY, 1) }, { today: PINNED_TODAY });
  assert.ok(keysOf(instances).includes("FUTURE_DATED_INVOICE"));
});

check("FUTURE_DATED_INVOICE does not fire when the billing date is today", () => {
  const instances = evaluateInvoiceFlags({ invoiceDate: PINNED_TODAY }, { today: PINNED_TODAY });
  assert.ok(!keysOf(instances).includes("FUTURE_DATED_INVOICE"));
});

check("FUTURE_DATED_INVOICE does not fire when the billing date is in the past", () => {
  const instances = evaluateInvoiceFlags({ invoiceDate: isoDaysFrom(PINNED_TODAY, -1) }, { today: PINNED_TODAY });
  assert.ok(!keysOf(instances).includes("FUTURE_DATED_INVOICE"));
});

check("FUTURE_DATED_INVOICE respects a configured tolerance from reference data", () => {
  const instances = evaluateInvoiceFlags(
    { invoiceDate: isoDaysFrom(PINNED_TODAY, 3) },
    { today: PINNED_TODAY, futureDatedToleranceDays: 5 },
  );
  assert.ok(!keysOf(instances).includes("FUTURE_DATED_INVOICE"));
});

check("DUE_DATE_NOT_SET fires when dueDate is empty", () => {
  const instances = evaluateInvoiceFlags({ invoiceDate: PINNED_TODAY, dueDate: "" }, { today: PINNED_TODAY });
  assert.ok(keysOf(instances).includes("DUE_DATE_NOT_SET"));
});

check("DUE_DATE_NOT_SET does not fire once a due date is set (even a past one — that's Already Past Due's job)", () => {
  const instances = evaluateInvoiceFlags(
    { invoiceDate: PINNED_TODAY, dueDate: isoDaysFrom(PINNED_TODAY, -5) },
    { today: PINNED_TODAY },
  );
  assert.ok(!keysOf(instances).includes("DUE_DATE_NOT_SET"));
});

check("DUE_DATE_NOT_SET firing does not make Due Date required-by-the-checklist (REQUIRED_DETAILS_MISSING stays silent on it)", () => {
  const instances = evaluateInvoiceFlags(
    {
      vendorName: "Acme Corp",
      vendorMatched: true,
      gstin: "27XYZAB1234F1Z9",
      gstTreatment: "Regular",
      invoiceNumber: "INV-001",
      invoiceDate: PINNED_TODAY,
      dueDate: "",
      currency: "INR",
      documentType: "TAX_INVOICE",
      lineItems: [{ description: "Item 1", unitRate: 100 }],
      taxesLevel: "At Invoice Level",
      invoiceTax: "GST 18%",
    },
    { today: PINNED_TODAY, checklistOptions: {} },
  );
  assert.ok(keysOf(instances).includes("DUE_DATE_NOT_SET"));
  assert.ok(!keysOf(instances).includes("REQUIRED_DETAILS_MISSING"));
});

check("ALREADY_PAST_DUE fires when the due date has already passed", () => {
  const instances = evaluateInvoiceFlags(
    { invoiceDate: isoDaysFrom(PINNED_TODAY, -10), dueDate: isoDaysFrom(PINNED_TODAY, -1) },
    { today: PINNED_TODAY },
  );
  assert.ok(keysOf(instances).includes("ALREADY_PAST_DUE"));
});

check("ALREADY_PAST_DUE does not fire when the due date is today or in the future", () => {
  const instances = evaluateInvoiceFlags(
    { invoiceDate: isoDaysFrom(PINNED_TODAY, -10), dueDate: PINNED_TODAY },
    { today: PINNED_TODAY },
  );
  assert.ok(!keysOf(instances).includes("ALREADY_PAST_DUE"));
});

check("ALREADY_PAST_DUE and DUE_DATE_NOT_SET are mutually exclusive", () => {
  const pastDue = evaluateInvoiceFlags(
    { invoiceDate: isoDaysFrom(PINNED_TODAY, -10), dueDate: isoDaysFrom(PINNED_TODAY, -1) },
    { today: PINNED_TODAY },
  );
  assert.ok(keysOf(pastDue).includes("ALREADY_PAST_DUE"));
  assert.ok(!keysOf(pastDue).includes("DUE_DATE_NOT_SET"));

  const notSet = evaluateInvoiceFlags({ invoiceDate: PINNED_TODAY, dueDate: "" }, { today: PINNED_TODAY });
  assert.ok(keysOf(notSet).includes("DUE_DATE_NOT_SET"));
  assert.ok(!keysOf(notSet).includes("ALREADY_PAST_DUE"));
});

check("DUE_DATE_NOT_SET is FIX_OR_RESOLVE, offers both actions, and carries a resolveWarning explaining the date stays empty", () => {
  const entry = INVOICE_FLAG_CATALOG.DUE_DATE_NOT_SET;
  assert.equal(entry.actionKind, "FIX_OR_RESOLVE");
  assert.equal(typeof entry.resolveWarning, "string");
  assert.ok(entry.resolveWarning.length > 0);
});

check("DUE_DATE_NOT_SET resolved with the date still empty stays RESOLVED after an unrelated edit (real path: raw invoice -> buildInvoiceEditFormData -> evaluateInvoiceFlags -> mergeFlagsWithResolutions)", () => {
  const rawInvoice = {
    invoiceDate: PINNED_TODAY,
    dueDate: "",
    description: "Consulting services", // the "unrelated edit"
  };
  const formData = buildInvoiceEditFormData(rawInvoice, {});
  const instances = evaluateInvoiceFlags(formData, { today: PINNED_TODAY });
  assert.ok(keysOf(instances).includes("DUE_DATE_NOT_SET"), "sanity: still genuinely firing (date still empty)");

  const signature = instances.find((i) => i.key === "DUE_DATE_NOT_SET").situationSignature;
  const resolutions = {
    DUE_DATE_NOT_SET: {
      key: "DUE_DATE_NOT_SET",
      status: "RESOLVED",
      reason: "No due date on the vendor's document; confirmed with vendor none applies.",
      resolvedSituationSignature: signature,
    },
  };
  const merged = mergeFlagsWithResolutions(instances, resolutions);
  assert.equal(merged.find((i) => i.key === "DUE_DATE_NOT_SET").status, "RESOLVED");
});

check("DUE_DATE_NOT_SET resolved with the date still empty auto-clears once a real due date is later entered (lifecycle-consistent with every other flag, no special-casing)", () => {
  const resolutions = {
    DUE_DATE_NOT_SET: {
      key: "DUE_DATE_NOT_SET",
      status: "RESOLVED",
      reason: "No due date on the vendor's document.",
      resolvedSituationSignature: {},
    },
  };
  const afterDueDateAdded = evaluateInvoiceFlags(
    { invoiceDate: PINNED_TODAY, dueDate: isoDaysFrom(PINNED_TODAY, 30) },
    { today: PINNED_TODAY },
  );
  assert.ok(!keysOf(afterDueDateAdded).includes("DUE_DATE_NOT_SET"), "sanity: no longer genuinely firing");
  const merged = mergeFlagsWithResolutions(afterDueDateAdded, resolutions);
  assert.equal(merged.find((i) => i.key === "DUE_DATE_NOT_SET").status, "AUTO_CLEARED");
});

check("DUE_DATE_NOT_SET fixed directly (never resolved) simply stops firing — no orphaned record, no Resolved-tab entry", () => {
  const beforeFix = evaluateInvoiceFlags({ invoiceDate: PINNED_TODAY, dueDate: "" }, { today: PINNED_TODAY });
  assert.ok(keysOf(beforeFix).includes("DUE_DATE_NOT_SET"));

  const afterFix = evaluateInvoiceFlags(
    { invoiceDate: PINNED_TODAY, dueDate: isoDaysFrom(PINNED_TODAY, 30) },
    { today: PINNED_TODAY },
  );
  const merged = mergeFlagsWithResolutions(afterFix, {}); // no resolution was ever recorded
  assert.ok(!merged.some((i) => i.key === "DUE_DATE_NOT_SET"), "no instance, no record -> nothing to show in either tab");
});

check("INVOICE_OLDER_THAN_THRESHOLD does not fire at exactly the default 90-day threshold", () => {
  const instances = evaluateInvoiceFlags({ invoiceDate: isoDaysFrom(PINNED_TODAY, -90) }, { today: PINNED_TODAY });
  assert.ok(!keysOf(instances).includes("INVOICE_OLDER_THAN_THRESHOLD"));
});

check("INVOICE_OLDER_THAN_THRESHOLD fires just past the default 90-day threshold", () => {
  const instances = evaluateInvoiceFlags({ invoiceDate: isoDaysFrom(PINNED_TODAY, -91) }, { today: PINNED_TODAY });
  assert.ok(keysOf(instances).includes("INVOICE_OLDER_THAN_THRESHOLD"));
});

check("INVOICE_OLDER_THAN_THRESHOLD respects a configured threshold from reference data", () => {
  const instances = evaluateInvoiceFlags(
    { invoiceDate: isoDaysFrom(PINNED_TODAY, -40) },
    { today: PINNED_TODAY, staleInvoiceThresholdDays: 30 },
  );
  assert.ok(keysOf(instances).includes("INVOICE_OLDER_THAN_THRESHOLD"));
});

check("ITC_CLAIM_WINDOW_AT_RISK does not fire at exactly the default 180-day threshold", () => {
  const instances = evaluateInvoiceFlags({ invoiceDate: isoDaysFrom(PINNED_TODAY, -180) }, { today: PINNED_TODAY });
  assert.ok(!keysOf(instances).includes("ITC_CLAIM_WINDOW_AT_RISK"));
});

check("ITC_CLAIM_WINDOW_AT_RISK fires just past the default 180-day threshold, alongside Invoice Older Than Threshold (genuinely different concerns, neither suppresses the other)", () => {
  const instances = evaluateInvoiceFlags({ invoiceDate: isoDaysFrom(PINNED_TODAY, -181) }, { today: PINNED_TODAY });
  assert.ok(keysOf(instances).includes("ITC_CLAIM_WINDOW_AT_RISK"));
  assert.ok(keysOf(instances).includes("INVOICE_OLDER_THAN_THRESHOLD"));
});

// ---------------------------------------------------------------------------
console.log("evaluateInvoiceFlags — REQUIRED_DETAILS_MISSING / RECOMMENDED_DETAILS_MISSING");

const baseFormDataForChecklist = {
  vendorName: "Acme Corp",
  vendorMatched: true,
  gstin: "27XYZAB1234F1Z9",
  gstTreatment: "Regular",
  invoiceNumber: "INV-001",
  invoiceDate: "2026-08-01",
  currency: "INR",
  documentType: "TAX_INVOICE",
  lineItems: [{ description: "Item 1", unitRate: 100 }],
  taxesLevel: "At Invoice Level",
  invoiceTax: "GST 18%",
};

check("REQUIRED_DETAILS_MISSING fires when a required checklist item is empty", () => {
  const instances = evaluateInvoiceFlags(
    { ...baseFormDataForChecklist, invoiceNumber: "" },
    { checklistOptions: {} },
  );
  assert.ok(keysOf(instances).includes("REQUIRED_DETAILS_MISSING"));
});

check("REQUIRED_DETAILS_MISSING does not fire when every required item is filled", () => {
  const instances = evaluateInvoiceFlags(baseFormDataForChecklist, { checklistOptions: {} });
  assert.ok(!keysOf(instances).includes("REQUIRED_DETAILS_MISSING"));
});

check("RECOMMENDED_DETAILS_MISSING fires when Category is required-by-config and empty", () => {
  const instances = evaluateInvoiceFlags(
    { ...baseFormDataForChecklist, categoryId: "" },
    { checklistOptions: { categoryMandatory: true, showCategoryField: true } },
  );
  assert.ok(keysOf(instances).includes("RECOMMENDED_DETAILS_MISSING"));
});

check("RECOMMENDED_DETAILS_MISSING does not fire when category isn't org-mandated", () => {
  const instances = evaluateInvoiceFlags(
    { ...baseFormDataForChecklist, categoryId: "" },
    { checklistOptions: { categoryMandatory: false, showCategoryField: true } },
  );
  assert.ok(!keysOf(instances).includes("RECOMMENDED_DETAILS_MISSING"));
});

check("REQUIRED_DETAILS_MISSING does not fire for a required field that's FILLED but differs from the AI extraction (regression)", () => {
  // Billing Date is filled but the user edited it away from what OCR
  // extracted — `done` is false because of the mismatch, not because the
  // field is empty. That must not count as "missing."
  const instances = evaluateInvoiceFlags(
    {
      ...baseFormDataForChecklist,
      invoiceDate: "2026-08-05",
      extractedSnapshot: { invoiceDate: "2026-08-01" },
    },
    { checklistOptions: {} },
  );
  assert.ok(!keysOf(instances).includes("REQUIRED_DETAILS_MISSING"));
});

check("REQUIRED_DETAILS_MISSING still fires when Billing Date is genuinely empty", () => {
  const instances = evaluateInvoiceFlags(
    { ...baseFormDataForChecklist, invoiceDate: "" },
    { checklistOptions: {} },
  );
  assert.ok(keysOf(instances).includes("REQUIRED_DETAILS_MISSING"));
});

// ---------------------------------------------------------------------------
console.log("evaluateInvoiceFlags — §5.7 AI-extraction-comparison (corrected names/scope)");

check("BILLING_DATE_CHANGED_AFTER_EXTRACTION fires when invoiceDate diverges from the extracted snapshot", () => {
  const instances = evaluateInvoiceFlags(
    {
      ...baseFormDataForChecklist,
      invoiceDate: "2026-08-05",
      extractedSnapshot: { invoiceDate: "2026-08-01" },
    },
    { checklistOptions: {} },
  );
  assert.ok(keysOf(instances).includes("BILLING_DATE_CHANGED_AFTER_EXTRACTION"));
});

check("BILLING_DATE_CHANGED_AFTER_EXTRACTION does not fire when invoiceDate matches the extracted snapshot", () => {
  const instances = evaluateInvoiceFlags(
    { ...baseFormDataForChecklist, extractedSnapshot: { invoiceDate: "2026-08-01" } },
    { checklistOptions: {} },
  );
  assert.ok(!keysOf(instances).includes("BILLING_DATE_CHANGED_AFTER_EXTRACTION"));
});

check("does not fire for a manually-created invoice (no extractedSnapshot)", () => {
  const instances = evaluateInvoiceFlags(
    { ...baseFormDataForChecklist, invoiceDate: "2026-08-05" },
    { checklistOptions: {} },
  );
  assert.ok(!keysOf(instances).includes("BILLING_DATE_CHANGED_AFTER_EXTRACTION"));
});

check("does not fire when the current value is empty (that's Required Details Missing's job)", () => {
  const instances = evaluateInvoiceFlags(
    { ...baseFormDataForChecklist, invoiceNumber: "", extractedSnapshot: { invoiceNumber: "INV-777" } },
    { checklistOptions: {} },
  );
  assert.ok(!keysOf(instances).includes("INVOICE_NUMBER_CHANGED_AFTER_EXTRACTION"));
  assert.ok(keysOf(instances).includes("REQUIRED_DETAILS_MISSING"));
});

check("does not fire a field flag when the AI's confidence for that field was below threshold", () => {
  const instances = evaluateInvoiceFlags(
    {
      ...baseFormDataForChecklist,
      invoiceDate: "2026-08-05",
      extractedSnapshot: { invoiceDate: "2026-08-01", fieldConfidence: { invoiceDate: 40 } },
    },
    { checklistOptions: {}, aiConfidenceThreshold: 85 },
  );
  assert.ok(!keysOf(instances).includes("BILLING_DATE_CHANGED_AFTER_EXTRACTION"));
});

check("fires when the AI's confidence for that field was at/above threshold", () => {
  const instances = evaluateInvoiceFlags(
    {
      ...baseFormDataForChecklist,
      invoiceDate: "2026-08-05",
      extractedSnapshot: { invoiceDate: "2026-08-01", fieldConfidence: { invoiceDate: 95 } },
    },
    { checklistOptions: {}, aiConfidenceThreshold: 85 },
  );
  assert.ok(keysOf(instances).includes("BILLING_DATE_CHANGED_AFTER_EXTRACTION"));
});

check("fires when confidence is unknown (fail-open — no real confidence source exists yet)", () => {
  const instances = evaluateInvoiceFlags(
    {
      ...baseFormDataForChecklist,
      invoiceDate: "2026-08-05",
      extractedSnapshot: { invoiceDate: "2026-08-01" },
    },
    { checklistOptions: {}, aiConfidenceThreshold: 85 },
  );
  assert.ok(keysOf(instances).includes("BILLING_DATE_CHANGED_AFTER_EXTRACTION"));
});

check("ORGANISATION_GSTIN_CHANGED_AFTER_EXTRACTION and VENDOR_GSTIN_CHANGED_AFTER_EXTRACTION fire independently (merged-fallback regression)", () => {
  const instances = evaluateInvoiceFlags(
    {
      ...baseFormDataForChecklist,
      billingGstin: "27ORGCHANGED0001Z",
      gstin: "27VENDOR00000001Z", // unchanged from extraction
      extractedSnapshot: {
        invoiceDate: baseFormDataForChecklist.invoiceDate,
        billingGstin: "27ORGORIGINAL001Z",
        vendorGstin: "27VENDOR00000001Z",
      },
    },
    { checklistOptions: {} },
  );
  assert.ok(keysOf(instances).includes("ORGANISATION_GSTIN_CHANGED_AFTER_EXTRACTION"));
  assert.ok(!keysOf(instances).includes("VENDOR_GSTIN_CHANGED_AFTER_EXTRACTION"));
});

check("VENDOR_SWITCHED_AFTER_EXTRACTION fires when the current vendor differs from the one matched at extraction", () => {
  const instances = evaluateInvoiceFlags(
    {
      ...baseFormDataForChecklist,
      vendorId: "vendor-2",
      extractedSnapshot: { invoiceDate: baseFormDataForChecklist.invoiceDate, vendorId: "vendor-1", vendorName: "Acme Corp" },
    },
    { checklistOptions: {} },
  );
  assert.ok(keysOf(instances).includes("VENDOR_SWITCHED_AFTER_EXTRACTION"));
});

check("VENDOR_SWITCHED_AFTER_EXTRACTION does not fire when the vendor is unchanged", () => {
  const instances = evaluateInvoiceFlags(
    {
      ...baseFormDataForChecklist,
      vendorId: "vendor-1",
      extractedSnapshot: { invoiceDate: baseFormDataForChecklist.invoiceDate, vendorId: "vendor-1", vendorName: "Acme Corp" },
    },
    { checklistOptions: {} },
  );
  assert.ok(!keysOf(instances).includes("VENDOR_SWITCHED_AFTER_EXTRACTION"));
});

check("VENDOR_SWITCHED_AFTER_EXTRACTION does not fire when extraction never matched a vendor", () => {
  const instances = evaluateInvoiceFlags(
    {
      ...baseFormDataForChecklist,
      vendorId: "vendor-2",
      extractedSnapshot: { invoiceDate: baseFormDataForChecklist.invoiceDate, vendorId: null },
    },
    { checklistOptions: {} },
  );
  assert.ok(!keysOf(instances).includes("VENDOR_SWITCHED_AFTER_EXTRACTION"));
});

/**
 * Mirrors clearScannedTaxSummary() in InvoicesPage.jsx / useApprovalsInvoiceEdit.jsx
 * / InvoiceSingleUploadLayer.jsx exactly — a real line-item edit wipes
 * scannedTaxAmount/scannedTaxName/scannedTaxRate/scannedTotal/invoiceTotal
 * but never touches extractedSnapshot. Used below to reproduce the actual
 * sequence (load with a scanned baseline -> edit a line item -> scanned
 * fields clear) instead of an artificial object where a stale scannedTotal
 * and already-edited lineItems coexist, which can never happen in the live
 * app's sequential setFormData updates — that gap is exactly why these two
 * flags passed here but didn't fire in the browser (see history above).
 */
const simulateLineItemEdit = (formData, patch) => ({
  ...formData,
  ...patch,
  scannedTaxAmount: undefined,
  scannedTaxName: undefined,
  scannedTaxRate: undefined,
  scannedTotal: undefined,
  invoiceTotal: undefined,
});

check("TAX_CHANGED_AFTER_EXTRACTION fires when the live tax amount differs from extractedSnapshot.taxAmount by more than ₹1", () => {
  const instances = evaluateInvoiceFlags(
    {
      ...baseFormDataForChecklist,
      lineItems: [{ description: "Item 1", quantity: 1, unitRate: 1000 }],
      invoiceTax: "CGST + SGST 18%",
      extractedSnapshot: { invoiceDate: baseFormDataForChecklist.invoiceDate, taxAmount: 100 },
    },
    { checklistOptions: {} },
  );
  assert.ok(keysOf(instances).includes("TAX_CHANGED_AFTER_EXTRACTION"));
});

check("TAX_CHANGED_AFTER_EXTRACTION does not fire when the live tax amount matches extractedSnapshot.taxAmount (within ₹1)", () => {
  const instances = evaluateInvoiceFlags(
    {
      ...baseFormDataForChecklist,
      lineItems: [{ description: "Item 1", quantity: 1, unitRate: 1000 }],
      invoiceTax: "CGST + SGST 18%",
      extractedSnapshot: { invoiceDate: baseFormDataForChecklist.invoiceDate, taxAmount: 180 },
    },
    { checklistOptions: {} },
  );
  assert.ok(!keysOf(instances).includes("TAX_CHANGED_AFTER_EXTRACTION"));
});

check("TAX_CHANGED_AFTER_EXTRACTION does not fire when the AI's confidence for tax was below threshold", () => {
  const instances = evaluateInvoiceFlags(
    {
      ...baseFormDataForChecklist,
      lineItems: [{ description: "Item 1", quantity: 1, unitRate: 1000 }],
      invoiceTax: "CGST + SGST 18%",
      extractedSnapshot: {
        invoiceDate: baseFormDataForChecklist.invoiceDate,
        taxAmount: 100,
        fieldConfidence: { invoiceTax: 40 },
      },
    },
    { checklistOptions: {}, aiConfidenceThreshold: 85 },
  );
  assert.ok(!keysOf(instances).includes("TAX_CHANGED_AFTER_EXTRACTION"));
});

check("TAX_CHANGED_AFTER_EXTRACTION fires after a REAL sequential line-item edit clears scannedTaxAmount (not an artificial coexisting fixture)", () => {
  const asLoaded = {
    ...baseFormDataForChecklist,
    lineItems: [{ description: "Item 1", quantity: 1, unitRate: 555.56 }],
    invoiceTax: "CGST + SGST 18%",
    scannedTaxAmount: 100, // as-loaded display override — same value as the durable baseline below
    extractedSnapshot: { invoiceDate: baseFormDataForChecklist.invoiceDate, taxAmount: 100 },
  };
  const afterEdit = simulateLineItemEdit(asLoaded, {
    lineItems: [{ description: "Item 1", quantity: 1, unitRate: 1000 }], // user hand-edits the rate
  });
  assert.equal(afterEdit.scannedTaxAmount, undefined, "sanity: the edit really did clear it, like the real handler");
  assert.equal(afterEdit.extractedSnapshot.taxAmount, 100, "sanity: the durable baseline survived the edit");
  const instances = evaluateInvoiceFlags(afterEdit, { checklistOptions: {} });
  assert.ok(keysOf(instances).includes("TAX_CHANGED_AFTER_EXTRACTION"));
});

check("FORM_TOTAL_DIFFERS_FROM_DOCUMENT fires when the calculated total differs from extractedSnapshot.total by more than ₹1", () => {
  const instances = evaluateInvoiceFlags(
    {
      ...baseFormDataForChecklist,
      lineItems: [{ description: "Item 1", quantity: 1, unitRate: 1000 }],
      invoiceTax: "CGST + SGST 18%",
      // document said 1000; line items + 18% tax compute to 1180
      extractedSnapshot: { invoiceDate: baseFormDataForChecklist.invoiceDate, total: 1000 },
    },
    { checklistOptions: {} },
  );
  assert.ok(keysOf(instances).includes("FORM_TOTAL_DIFFERS_FROM_DOCUMENT"));
});

check("FORM_TOTAL_DIFFERS_FROM_DOCUMENT does not fire when the calculated total matches extractedSnapshot.total", () => {
  const instances = evaluateInvoiceFlags(
    {
      ...baseFormDataForChecklist,
      lineItems: [{ description: "Item 1", quantity: 1, unitRate: 1000 }],
      invoiceTax: "CGST + SGST 18%",
      extractedSnapshot: { invoiceDate: baseFormDataForChecklist.invoiceDate, total: 1180 },
    },
    { checklistOptions: {} },
  );
  assert.ok(!keysOf(instances).includes("FORM_TOTAL_DIFFERS_FROM_DOCUMENT"));
});

check("FORM_TOTAL_DIFFERS_FROM_DOCUMENT fires after a REAL sequential line-item edit clears scannedTotal (not an artificial coexisting fixture)", () => {
  const asLoaded = {
    ...baseFormDataForChecklist,
    lineItems: [{ description: "Item 1", quantity: 1, unitRate: 800 }],
    invoiceTax: "CGST + SGST 18%",
    scannedTotal: 1000, // as-loaded display override — same value as the durable baseline below
    extractedSnapshot: { invoiceDate: baseFormDataForChecklist.invoiceDate, total: 1000 },
  };
  const afterEdit = simulateLineItemEdit(asLoaded, {
    lineItems: [{ description: "Item 1", quantity: 1, unitRate: 1000 }], // user hand-edits the rate
  });
  assert.equal(afterEdit.scannedTotal, undefined, "sanity: the edit really did clear it, like the real handler");
  assert.equal(afterEdit.extractedSnapshot.total, 1000, "sanity: the durable baseline survived the edit");
  const instances = evaluateInvoiceFlags(afterEdit, { checklistOptions: {} });
  assert.ok(keysOf(instances).includes("FORM_TOTAL_DIFFERS_FROM_DOCUMENT"));
});

check("FORM_TOTAL_DIFFERS_FROM_DOCUMENT does not fire after a real sequential edit when the new total still matches the document", () => {
  const asLoaded = {
    ...baseFormDataForChecklist,
    lineItems: [{ description: "Item 1", quantity: 1, unitRate: 1000 }],
    invoiceTax: "CGST + SGST 18%",
    scannedTotal: 1180,
    extractedSnapshot: { invoiceDate: baseFormDataForChecklist.invoiceDate, total: 1180 },
  };
  const afterEdit = simulateLineItemEdit(asLoaded, {
    lineItems: [{ description: "Item 1", quantity: 2, unitRate: 500 }], // re-split, same subtotal (1000) and tax (180)
  });
  const instances = evaluateInvoiceFlags(afterEdit, { checklistOptions: {} });
  assert.ok(!keysOf(instances).includes("FORM_TOTAL_DIFFERS_FROM_DOCUMENT"));
});

// ---------------------------------------------------------------------------
console.log("evaluateInvoiceFlags — duplicate layers 2-4 + Duplicate Avoided By Edit");

check("DUPLICATE_INVOICE_CROSS_YEAR fires on a non-deemphasized cross-year match", () => {
  const instances = evaluateInvoiceFlags(
    { invoiceNumber: "INV-1", vendorId: "vendor-1" },
    { duplicateCandidates: { crossYearMatches: [{ id: "inv-8", deemphasized: false }] } },
  );
  assert.ok(keysOf(instances).includes("DUPLICATE_INVOICE_CROSS_YEAR"));
});

check("SIMILAR_INVOICE fires on a non-deemphasized economic match", () => {
  const instances = evaluateInvoiceFlags(
    { invoiceNumber: "INV-1", vendorId: "vendor-1" },
    { duplicateCandidates: { economicMatches: [{ id: "inv-7", deemphasized: false }] } },
  );
  assert.ok(keysOf(instances).includes("SIMILAR_INVOICE"));
});

check("DUPLICATE_DOCUMENT fires on a non-deemphasized same-file match", () => {
  const instances = evaluateInvoiceFlags(
    { invoiceNumber: "INV-1", vendorId: "vendor-1" },
    { duplicateCandidates: { sameFileMatches: [{ id: "inv-6", deemphasized: false }] } },
  );
  assert.ok(keysOf(instances).includes("DUPLICATE_DOCUMENT"));
});

check("DUPLICATE_AVOIDED_BY_EDIT fires when the extracted number would have collided but the typed one doesn't", () => {
  const instances = evaluateInvoiceFlags(
    { invoiceNumber: "INV-002", vendorId: "vendor-1", extractedSnapshot: { invoiceNumber: "INV-001" } },
    {
      duplicateCandidates: { exactMatches: [] },
      extractedNumberDuplicateCandidates: { exactMatches: [{ id: "inv-5", deemphasized: false }] },
    },
  );
  assert.ok(keysOf(instances).includes("DUPLICATE_AVOIDED_BY_EDIT"));
});

check("DUPLICATE_AVOIDED_BY_EDIT does not fire when the typed number ALSO collides (DUPLICATE_INVOICE fires instead — mutually exclusive)", () => {
  const instances = evaluateInvoiceFlags(
    { invoiceNumber: "INV-001", vendorId: "vendor-1", extractedSnapshot: { invoiceNumber: "INV-001" } },
    {
      duplicateCandidates: { exactMatches: [{ id: "inv-5", deemphasized: false }] },
      extractedNumberDuplicateCandidates: { exactMatches: [{ id: "inv-5", deemphasized: false }] },
    },
  );
  assert.ok(keysOf(instances).includes("DUPLICATE_INVOICE"));
  assert.ok(!keysOf(instances).includes("DUPLICATE_AVOIDED_BY_EDIT"));
});

check("DUPLICATE_AVOIDED_BY_EDIT does not fire when no second lookup was performed (numbers already matched)", () => {
  const instances = evaluateInvoiceFlags(
    { invoiceNumber: "INV-001", vendorId: "vendor-1", extractedSnapshot: { invoiceNumber: "INV-001" } },
    { duplicateCandidates: { exactMatches: [] } },
  );
  assert.ok(!keysOf(instances).includes("DUPLICATE_AVOIDED_BY_EDIT"));
});

// ---------------------------------------------------------------------------
console.log("evaluateInvoiceFlags — GST_TREATMENT_NOT_SET");

check("GST_TREATMENT_NOT_SET fires when both org and vendor are GST-registered but treatment is N/A", () => {
  const instances = evaluateInvoiceFlags(
    { ...baseFormDataForChecklist, gstTreatment: "N/A" },
    { checklistOptions: {}, organisationGstins: ["27ABCDE1234F1Z5"], selectedVendor: { gstin: "27XYZAB1234F1Z9" } },
  );
  assert.ok(keysOf(instances).includes("GST_TREATMENT_NOT_SET"));
});

check("GST_TREATMENT_NOT_SET does not fire when GST Treatment is actually set", () => {
  const instances = evaluateInvoiceFlags(
    baseFormDataForChecklist,
    { checklistOptions: {}, organisationGstins: ["27ABCDE1234F1Z5"], selectedVendor: { gstin: "27XYZAB1234F1Z9" } },
  );
  assert.ok(!keysOf(instances).includes("GST_TREATMENT_NOT_SET"));
});

check("GST_TREATMENT_NOT_SET does not fire when the vendor has no GSTIN on file", () => {
  const instances = evaluateInvoiceFlags(
    { ...baseFormDataForChecklist, gstTreatment: "N/A" },
    { checklistOptions: {}, organisationGstins: ["27ABCDE1234F1Z5"], selectedVendor: { gstin: "" } },
  );
  assert.ok(!keysOf(instances).includes("GST_TREATMENT_NOT_SET"));
});

// ---------------------------------------------------------------------------
console.log("evaluateInvoiceFlags — TAX_TOTAL_DOES_NOT_RECONCILE");

check("fires when the declared and reconciled tax totals were already inconsistent at the last checkpoint (bad OCR/import data)", () => {
  const instances = evaluateInvoiceFlags(
    { ...baseFormDataForChecklist, totalTaxAmount: 100, lastReconciledTaxTotal: 180 },
    { checklistOptions: {} },
  );
  assert.ok(keysOf(instances).includes("TAX_TOTAL_DOES_NOT_RECONCILE"));
});

check("does not fire when the declared and reconciled totals agree (within ₹1)", () => {
  const instances = evaluateInvoiceFlags(
    { ...baseFormDataForChecklist, totalTaxAmount: 180, lastReconciledTaxTotal: 180 },
    { checklistOptions: {} },
  );
  assert.ok(!keysOf(instances).includes("TAX_TOTAL_DOES_NOT_RECONCILE"));
});

check("does NOT fire after a REAL sequential line-item edit — clearScannedTaxSummary never touches totalTaxAmount/lastReconciledTaxTotal, so an ordinary edit can't flip this flag by itself", () => {
  const asLoaded = { ...baseFormDataForChecklist, totalTaxAmount: 180, lastReconciledTaxTotal: 180 };
  const afterEdit = simulateLineItemEdit(asLoaded, {
    lineItems: [{ description: "Item 1", quantity: 1, unitRate: 5000 }], // a large, ordinary edit
  });
  assert.equal(afterEdit.scannedTotal, undefined, "sanity: the edit really did clear the unrelated scanned* fields");
  assert.equal(afterEdit.totalTaxAmount, 180, "sanity: the declared total was left untouched by the edit");
  assert.equal(afterEdit.lastReconciledTaxTotal, 180, "sanity: the reconciliation baseline was left untouched");
  const instances = evaluateInvoiceFlags(afterEdit, { checklistOptions: {} });
  assert.ok(!keysOf(instances).includes("TAX_TOTAL_DOES_NOT_RECONCILE"));
});

check("does not fire in summary-only mode (no line items to reconcile against)", () => {
  const instances = evaluateInvoiceFlags(
    {
      ...baseFormDataForChecklist,
      lineItemMode: LINE_ITEM_MODE_SUMMARY_ONLY,
      totalTaxAmount: 100,
      lastReconciledTaxTotal: 180,
    },
    { checklistOptions: {} },
  );
  assert.ok(!keysOf(instances).includes("TAX_TOTAL_DOES_NOT_RECONCILE"));
});

check("does not fire when there's no reconciliation baseline yet (brand-new invoice, never saved)", () => {
  const instances = evaluateInvoiceFlags(
    { ...baseFormDataForChecklist, totalTaxAmount: 100, lastReconciledTaxTotal: undefined },
    { checklistOptions: {} },
  );
  assert.ok(!keysOf(instances).includes("TAX_TOTAL_DOES_NOT_RECONCILE"));
});

// ---------------------------------------------------------------------------
console.log("evaluateInvoiceFlags — NET_PAYABLE_MANUALLY_OVERRIDDEN");

/** Mirrors InvoiceForm.jsx's own calculatedNetPayable formula exactly (fallbackTdsAmount / calculatedNetPayable). */
const computeExpectedNetPayable = (formData) => {
  const totals = calculateInvoiceDataTotals(formData);
  const tdsRate = resolveTdsRate(formData.tds, formData.tdsRate);
  const fallbackTdsAmount = Math.round(((Number(totals.subTotal) || 0) * tdsRate / 100) * 100) / 100;
  return Math.max(Math.round(((Number(totals.total) || 0) - fallbackTdsAmount) * 100) / 100, 0);
};

check("fires when netAmount differs from the calculated value by more than ₹1", () => {
  const formData = {
    ...baseFormDataForChecklist,
    lineItems: [{ description: "Item 1", quantity: 1, unitRate: 1000 }],
    invoiceTax: "CGST + SGST 18%",
    netAmount: 500,
  };
  assert.ok(Math.abs(500 - computeExpectedNetPayable(formData)) > 1, "fixture sanity: 500 must actually be off");
  const instances = evaluateInvoiceFlags(formData, { checklistOptions: {} });
  assert.ok(keysOf(instances).includes("NET_PAYABLE_MANUALLY_OVERRIDDEN"));
});

check("does NOT fire after a REAL sequential line-item edit followed by the form's own auto-sync effect (ordinary editing, not an override)", () => {
  const asLoaded = {
    ...baseFormDataForChecklist,
    lineItems: [{ description: "Item 1", quantity: 1, unitRate: 1000 }],
    invoiceTax: "CGST + SGST 18%",
  };
  asLoaded.netAmount = computeExpectedNetPayable(asLoaded); // matches at load, like the real form
  const afterEdit = simulateLineItemEdit(asLoaded, {
    lineItems: [{ description: "Item 1", quantity: 1, unitRate: 2000 }],
  });
  // InvoiceForm.jsx's own useEffect re-syncs netAmount to the freshly
  // computed value on every render unless the user actually typed into the
  // field — simulate that sync explicitly here, the same way the real form does.
  afterEdit.netAmount = computeExpectedNetPayable(afterEdit);
  const instances = evaluateInvoiceFlags(afterEdit, { checklistOptions: {} });
  assert.ok(!keysOf(instances).includes("NET_PAYABLE_MANUALLY_OVERRIDDEN"));
});

check("fires when a genuine override survives a line-item edit (the auto-sync effect was suspended by the user's own edit)", () => {
  const asLoaded = {
    ...baseFormDataForChecklist,
    lineItems: [{ description: "Item 1", quantity: 1, unitRate: 1000 }],
    invoiceTax: "CGST + SGST 18%",
    netAmount: 1000, // the user manually overrode it away from the computed value
  };
  const afterEdit = simulateLineItemEdit(asLoaded, {
    lineItems: [{ description: "Item 1", quantity: 1, unitRate: 2000 }], // computed total moves further away
  });
  // netAmount is left untouched here — simulating isNetPayableManuallyEdited
  // suspending the real form's auto-sync effect once the user has typed into the field.
  const instances = evaluateInvoiceFlags(afterEdit, { checklistOptions: {} });
  assert.ok(keysOf(instances).includes("NET_PAYABLE_MANUALLY_OVERRIDDEN"));
});

check("does not fire when Net Payable editing is disabled for the org", () => {
  const instances = evaluateInvoiceFlags(
    {
      ...baseFormDataForChecklist,
      lineItems: [{ description: "Item 1", quantity: 1, unitRate: 1000 }],
      invoiceTax: "CGST + SGST 18%",
      netAmount: 1,
    },
    { checklistOptions: {}, isNetPayableEditEnabled: false },
  );
  assert.ok(!keysOf(instances).includes("NET_PAYABLE_MANUALLY_OVERRIDDEN"));
});

// ---------------------------------------------------------------------------
console.log("evaluateInvoiceFlags — TAX_TYPE_CONTRADICTS_PLACE_OF_SUPPLY / TAX_CHARGED_BY_UNREGISTERED_VENDOR");

const sameStateIgstFormData = {
  ...baseFormDataForChecklist,
  lineItems: [{ description: "Item 1", quantity: 1, unitRate: 1000 }],
  invoiceTax: "IGST 18%",
  sourceOfSupply: "Maharashtra",
  destinationOfSupply: "Maharashtra",
};

check("TAX_TYPE_CONTRADICTS_PLACE_OF_SUPPLY fires when source and destination are the same state but IGST is applied", () => {
  const instances = evaluateInvoiceFlags(sameStateIgstFormData, { checklistOptions: {} });
  assert.ok(keysOf(instances).includes("TAX_TYPE_CONTRADICTS_PLACE_OF_SUPPLY"));
});

check("TAX_TYPE_CONTRADICTS_PLACE_OF_SUPPLY fires when source and destination differ but CGST/SGST is applied", () => {
  const instances = evaluateInvoiceFlags(
    {
      ...baseFormDataForChecklist,
      lineItems: [{ description: "Item 1", quantity: 1, unitRate: 1000 }],
      invoiceTax: "CGST + SGST 18%",
      sourceOfSupply: "Maharashtra",
      destinationOfSupply: "Karnataka",
    },
    { checklistOptions: {} },
  );
  assert.ok(keysOf(instances).includes("TAX_TYPE_CONTRADICTS_PLACE_OF_SUPPLY"));
});

check("does not fire when same state and CGST/SGST is applied (correct)", () => {
  const instances = evaluateInvoiceFlags(
    {
      ...baseFormDataForChecklist,
      lineItems: [{ description: "Item 1", quantity: 1, unitRate: 1000 }],
      invoiceTax: "CGST + SGST 18%",
      sourceOfSupply: "Maharashtra",
      destinationOfSupply: "Maharashtra",
    },
    { checklistOptions: {} },
  );
  assert.ok(!keysOf(instances).includes("TAX_TYPE_CONTRADICTS_PLACE_OF_SUPPLY"));
});

check("does not fire when different states and IGST is applied (correct)", () => {
  const instances = evaluateInvoiceFlags(
    {
      ...baseFormDataForChecklist,
      lineItems: [{ description: "Item 1", quantity: 1, unitRate: 1000 }],
      invoiceTax: "IGST 18%",
      sourceOfSupply: "Maharashtra",
      destinationOfSupply: "Karnataka",
    },
    { checklistOptions: {} },
  );
  assert.ok(!keysOf(instances).includes("TAX_TYPE_CONTRADICTS_PLACE_OF_SUPPLY"));
});

check("does not fire when source or destination of supply is unknown (can't judge same-vs-different state)", () => {
  const instances = evaluateInvoiceFlags(
    { ...sameStateIgstFormData, destinationOfSupply: "" },
    { checklistOptions: {} },
  );
  assert.ok(!keysOf(instances).includes("TAX_TYPE_CONTRADICTS_PLACE_OF_SUPPLY"));
});

check("does not fire for a non-INR invoice (CGST/SGST/IGST doesn't apply)", () => {
  const instances = evaluateInvoiceFlags(
    { ...sameStateIgstFormData, currency: "USD" },
    { checklistOptions: {} },
  );
  assert.ok(!keysOf(instances).includes("TAX_TYPE_CONTRADICTS_PLACE_OF_SUPPLY"));
});

check("TAX_CHARGED_BY_UNREGISTERED_VENDOR fires when the vendor has no GSTIN but GST was applied", () => {
  const instances = evaluateInvoiceFlags(
    {
      ...baseFormDataForChecklist,
      lineItems: [{ description: "Item 1", quantity: 1, unitRate: 1000 }],
      invoiceTax: "CGST + SGST 18%",
      gstin: "",
    },
    { checklistOptions: {} },
  );
  assert.ok(keysOf(instances).includes("TAX_CHARGED_BY_UNREGISTERED_VENDOR"));
});

check("does not fire when the vendor has a GSTIN on file", () => {
  const instances = evaluateInvoiceFlags(
    {
      ...baseFormDataForChecklist,
      lineItems: [{ description: "Item 1", quantity: 1, unitRate: 1000 }],
      invoiceTax: "CGST + SGST 18%",
      gstin: "27XYZAB1234F1Z9",
    },
    { checklistOptions: {} },
  );
  assert.ok(!keysOf(instances).includes("TAX_CHARGED_BY_UNREGISTERED_VENDOR"));
});

check("does not fire when no GSTIN but also no tax applied (Exempt)", () => {
  const instances = evaluateInvoiceFlags(
    {
      ...baseFormDataForChecklist,
      lineItems: [{ description: "Item 1", quantity: 1, unitRate: 1000 }],
      invoiceTax: "Exempt",
      gstin: "",
    },
    { checklistOptions: {} },
  );
  assert.ok(!keysOf(instances).includes("TAX_CHARGED_BY_UNREGISTERED_VENDOR"));
});

check("does not fire for a non-INR invoice", () => {
  const instances = evaluateInvoiceFlags({ ...sameStateIgstFormData, gstin: "", currency: "USD" }, { checklistOptions: {} });
  assert.ok(!keysOf(instances).includes("TAX_CHARGED_BY_UNREGISTERED_VENDOR"));
});

check("TAX_TYPE_CONTRADICTS_PLACE_OF_SUPPLY and TAX_CHARGED_BY_UNREGISTERED_VENDOR fire together when both conditions are genuinely true", () => {
  const instances = evaluateInvoiceFlags({ ...sameStateIgstFormData, gstin: "" }, { checklistOptions: {} });
  assert.ok(keysOf(instances).includes("TAX_TYPE_CONTRADICTS_PLACE_OF_SUPPLY"));
  assert.ok(keysOf(instances).includes("TAX_CHARGED_BY_UNREGISTERED_VENDOR"));
});

// ---------------------------------------------------------------------------
console.log("evaluateInvoiceFlags — SHIPPING_ADDRESS_MISSING");

check("fires for a Tax Invoice with no shipping address", () => {
  const instances = evaluateInvoiceFlags(
    { ...baseFormDataForChecklist, documentType: "TAX_INVOICE", shippingAddress: "" },
    { checklistOptions: {} },
  );
  assert.ok(keysOf(instances).includes("SHIPPING_ADDRESS_MISSING"));
});

check("does not fire once a shipping address is set", () => {
  const instances = evaluateInvoiceFlags(
    { ...baseFormDataForChecklist, documentType: "TAX_INVOICE", shippingAddress: "123 Warehouse Rd" },
    { checklistOptions: {} },
  );
  assert.ok(!keysOf(instances).includes("SHIPPING_ADDRESS_MISSING"));
});

check("does not fire for a Proforma Invoice (excluded document type, not a hidden-field false positive)", () => {
  const instances = evaluateInvoiceFlags(
    { ...baseFormDataForChecklist, documentType: "PROFORMA_INVOICE", shippingAddress: "" },
    { checklistOptions: {} },
  );
  assert.ok(!keysOf(instances).includes("SHIPPING_ADDRESS_MISSING"));
});

check("can appear alongside a genuinely different flag on the same invoice (Tax Type Contradicts Place Of Supply)", () => {
  const instances = evaluateInvoiceFlags(
    { ...sameStateIgstFormData, documentType: "TAX_INVOICE", shippingAddress: "" },
    { checklistOptions: {} },
  );
  assert.ok(keysOf(instances).includes("SHIPPING_ADDRESS_MISSING"));
  assert.ok(keysOf(instances).includes("TAX_TYPE_CONTRADICTS_PLACE_OF_SUPPLY"));
});

// ---------------------------------------------------------------------------
console.log("evaluateInvoiceFlags — DOCUMENT_TYPE_MISMATCH / DOCUMENT_TYPE_CHANGED_AFTER_EXTRACTION");

check("DOCUMENT_TYPE_MISMATCH fires when the current document type differs from what was extracted", () => {
  // Confidence pinned low so the confidence-gated §5.7 sibling stays quiet
  // here and can't suppress this one — isolates DOCUMENT_TYPE_MISMATCH's own
  // condition. The unsuppressed co-firing case is covered separately below.
  const instances = evaluateInvoiceFlags(
    {
      ...baseFormDataForChecklist,
      documentType: "PROFORMA_INVOICE",
      extractedSnapshot: {
        invoiceDate: baseFormDataForChecklist.invoiceDate,
        documentType: "TAX_INVOICE",
        fieldConfidence: { documentType: 40 },
      },
    },
    { checklistOptions: {}, aiConfidenceThreshold: 85 },
  );
  assert.ok(keysOf(instances).includes("DOCUMENT_TYPE_MISMATCH"));
});

check("DOCUMENT_TYPE_MISMATCH does not fire when the document type matches what was extracted", () => {
  const instances = evaluateInvoiceFlags(
    {
      ...baseFormDataForChecklist,
      documentType: "TAX_INVOICE",
      extractedSnapshot: { invoiceDate: baseFormDataForChecklist.invoiceDate, documentType: "TAX_INVOICE" },
    },
    { checklistOptions: {} },
  );
  assert.ok(!keysOf(instances).includes("DOCUMENT_TYPE_MISMATCH"));
});

check("DOCUMENT_TYPE_MISMATCH does not fire for a manually-created invoice (no extractedSnapshot)", () => {
  const instances = evaluateInvoiceFlags(
    { ...baseFormDataForChecklist, documentType: "PROFORMA_INVOICE" },
    { checklistOptions: {} },
  );
  assert.ok(!keysOf(instances).includes("DOCUMENT_TYPE_MISMATCH"));
});

check("DOCUMENT_TYPE_CHANGED_AFTER_EXTRACTION fires and suppresses DOCUMENT_TYPE_MISMATCH — only the more specific flag is visible", () => {
  const instances = evaluateInvoiceFlags(
    {
      ...baseFormDataForChecklist,
      documentType: "PROFORMA_INVOICE",
      extractedSnapshot: { invoiceDate: baseFormDataForChecklist.invoiceDate, documentType: "TAX_INVOICE" },
    },
    { checklistOptions: {} },
  );
  assert.ok(keysOf(instances).includes("DOCUMENT_TYPE_CHANGED_AFTER_EXTRACTION"));
  assert.ok(!keysOf(instances).includes("DOCUMENT_TYPE_MISMATCH"));
});

check("when the AI's confidence for document type was low, the §5.7 flag stays quiet but the §5.1 Worth-checking flag still fires (nothing to suppress it with)", () => {
  const instances = evaluateInvoiceFlags(
    {
      ...baseFormDataForChecklist,
      documentType: "PROFORMA_INVOICE",
      extractedSnapshot: {
        invoiceDate: baseFormDataForChecklist.invoiceDate,
        documentType: "TAX_INVOICE",
        fieldConfidence: { documentType: 40 },
      },
    },
    { checklistOptions: {}, aiConfidenceThreshold: 85 },
  );
  assert.ok(!keysOf(instances).includes("DOCUMENT_TYPE_CHANGED_AFTER_EXTRACTION"));
  assert.ok(keysOf(instances).includes("DOCUMENT_TYPE_MISMATCH"));
});

check("a stale DOCUMENT_TYPE_MISMATCH resolution auto-clears once suppressed, instead of lingering — the more specific flag is the one actually ACTIVE", () => {
  const formData = {
    ...baseFormDataForChecklist,
    documentType: "PROFORMA_INVOICE",
    extractedSnapshot: { invoiceDate: baseFormDataForChecklist.invoiceDate, documentType: "TAX_INVOICE" },
    flagResolutions: {
      DOCUMENT_TYPE_MISMATCH: {
        status: "RESOLVED",
        resolvedSituationSignature: { extractedDocumentType: "TAX_INVOICE", currentDocumentType: "PROFORMA_INVOICE" },
      },
    },
  };
  const instances = evaluateInvoiceFlags(formData, { checklistOptions: {} });
  const merged = mergeFlagsWithResolutions(instances, formData.flagResolutions);
  const mismatchEntry = merged.find((flag) => flag.key === "DOCUMENT_TYPE_MISMATCH");
  assert.equal(mismatchEntry.status, "AUTO_CLEARED");
  const changedEntry = merged.find((flag) => flag.key === "DOCUMENT_TYPE_CHANGED_AFTER_EXTRACTION");
  assert.equal(changedEntry.status, "ACTIVE");
});

// ---------------------------------------------------------------------------
console.log("evaluateInvoiceFlags — VENDOR_APPROVAL_PENDING");

check("fires when the matched vendor's approval is pending", () => {
  const instances = evaluateInvoiceFlags(
    { vendorId: "vendor-1", vendorRequestPending: true },
    { selectedVendor: { id: "vendor-1" } },
  );
  assert.ok(keysOf(instances).includes("VENDOR_APPROVAL_PENDING"));
});

check("does not fire when the vendor is already approved", () => {
  const instances = evaluateInvoiceFlags(
    { vendorId: "vendor-1", vendorRequestPending: false },
    { selectedVendor: { id: "vendor-1" } },
  );
  assert.ok(!keysOf(instances).includes("VENDOR_APPROVAL_PENDING"));
});

check("does not fire when the field is entirely absent (e.g. no vendor selected yet)", () => {
  const instances = evaluateInvoiceFlags({ vendorId: "vendor-1" }, { selectedVendor: { id: "vendor-1" } });
  assert.ok(!keysOf(instances).includes("VENDOR_APPROVAL_PENDING"));
});

check("VENDOR_APPROVAL_PENDING can be resolved like any other optional flag", () => {
  const merged = mergeFlagsWithResolutions(
    [{ key: "VENDOR_APPROVAL_PENDING", instanceId: "VENDOR_APPROVAL_PENDING", situationSignature: { vendorId: "vendor-1" } }],
    { VENDOR_APPROVAL_PENDING: { status: "RESOLVED", resolvedSituationSignature: { vendorId: "vendor-1" } } },
  );
  assert.equal(merged[0].status, "RESOLVED");
});

// ---------------------------------------------------------------------------
console.log("evaluateInvoiceFlags — BILLING_ADDRESS_DIFFERS_FROM_DOCUMENT / *_CHANGED_AFTER_EXTRACTION / SHIPPING_ADDRESS_CHANGED_AFTER_EXTRACTION");

check("formatting-only billing address difference (MD's own worked example) does not fire either flag", () => {
  const instances = evaluateInvoiceFlags(
    {
      ...baseFormDataForChecklist,
      billingAddress: "Kailash, Mumbai",
      extractedSnapshot: { invoiceDate: baseFormDataForChecklist.invoiceDate, billingAddress: "Kailash , Mumbai" },
    },
    { checklistOptions: {} },
  );
  assert.ok(!keysOf(instances).includes("BILLING_ADDRESS_CHANGED_AFTER_EXTRACTION"));
  assert.ok(!keysOf(instances).includes("BILLING_ADDRESS_DIFFERS_FROM_DOCUMENT"));
});

check("formatting-only difference (case + line breaks + punctuation) does not fire either flag", () => {
  const instances = evaluateInvoiceFlags(
    {
      ...baseFormDataForChecklist,
      billingAddress: "123 MG ROAD BANGALORE",
      extractedSnapshot: { invoiceDate: baseFormDataForChecklist.invoiceDate, billingAddress: "123,\nMG Road,\nBangalore." },
    },
    { checklistOptions: {} },
  );
  assert.ok(!keysOf(instances).includes("BILLING_ADDRESS_CHANGED_AFTER_EXTRACTION"));
  assert.ok(!keysOf(instances).includes("BILLING_ADDRESS_DIFFERS_FROM_DOCUMENT"));
});

check("genuine billing address change fires BILLING_ADDRESS_CHANGED_AFTER_EXTRACTION and suppresses BILLING_ADDRESS_DIFFERS_FROM_DOCUMENT", () => {
  const instances = evaluateInvoiceFlags(
    {
      ...baseFormDataForChecklist,
      billingAddress: "456 MG Road, Bangalore",
      extractedSnapshot: { invoiceDate: baseFormDataForChecklist.invoiceDate, billingAddress: "123 MG Road, Bangalore" },
    },
    { checklistOptions: {} },
  );
  assert.ok(keysOf(instances).includes("BILLING_ADDRESS_CHANGED_AFTER_EXTRACTION"));
  assert.ok(!keysOf(instances).includes("BILLING_ADDRESS_DIFFERS_FROM_DOCUMENT"));
});

check("genuine billing address change (different city, same street) also fires", () => {
  const instances = evaluateInvoiceFlags(
    {
      ...baseFormDataForChecklist,
      billingAddress: "123 MG Road, Chennai",
      extractedSnapshot: { invoiceDate: baseFormDataForChecklist.invoiceDate, billingAddress: "123 MG Road, Bangalore" },
    },
    { checklistOptions: {} },
  );
  assert.ok(keysOf(instances).includes("BILLING_ADDRESS_CHANGED_AFTER_EXTRACTION"));
});

check("genuine shipping address change fires SHIPPING_ADDRESS_CHANGED_AFTER_EXTRACTION, with no suppression relationship at all", () => {
  const instances = evaluateInvoiceFlags(
    {
      ...baseFormDataForChecklist,
      shippingAddress: "789 Warehouse Rd, Pune",
      extractedSnapshot: { invoiceDate: baseFormDataForChecklist.invoiceDate, shippingAddress: "789 Warehouse Rd, Nagpur" },
    },
    { checklistOptions: {} },
  );
  assert.ok(keysOf(instances).includes("SHIPPING_ADDRESS_CHANGED_AFTER_EXTRACTION"));
});

check("formatting-only shipping address difference does not fire", () => {
  const instances = evaluateInvoiceFlags(
    {
      ...baseFormDataForChecklist,
      shippingAddress: "789 warehouse rd pune",
      extractedSnapshot: { invoiceDate: baseFormDataForChecklist.invoiceDate, shippingAddress: "789, Warehouse Rd., Pune." },
    },
    { checklistOptions: {} },
  );
  assert.ok(!keysOf(instances).includes("SHIPPING_ADDRESS_CHANGED_AFTER_EXTRACTION"));
});

check("neither address flag fires for a manually-created invoice (no extractedSnapshot)", () => {
  const instances = evaluateInvoiceFlags(
    {
      ...baseFormDataForChecklist,
      billingAddress: "456 MG Road, Bangalore",
      shippingAddress: "789 Warehouse Rd, Pune",
    },
    { checklistOptions: {} },
  );
  assert.ok(!keysOf(instances).includes("BILLING_ADDRESS_CHANGED_AFTER_EXTRACTION"));
  assert.ok(!keysOf(instances).includes("BILLING_ADDRESS_DIFFERS_FROM_DOCUMENT"));
  assert.ok(!keysOf(instances).includes("SHIPPING_ADDRESS_CHANGED_AFTER_EXTRACTION"));
});

check("BILLING_ADDRESS_CHANGED_AFTER_EXTRACTION does not fire when the AI's confidence for billingAddress was below threshold", () => {
  const instances = evaluateInvoiceFlags(
    {
      ...baseFormDataForChecklist,
      billingAddress: "456 MG Road, Bangalore",
      extractedSnapshot: {
        invoiceDate: baseFormDataForChecklist.invoiceDate,
        billingAddress: "123 MG Road, Bangalore",
        fieldConfidence: { billingAddress: 40 },
      },
    },
    { checklistOptions: {}, aiConfidenceThreshold: 85 },
  );
  assert.ok(!keysOf(instances).includes("BILLING_ADDRESS_CHANGED_AFTER_EXTRACTION"));
});

check("when confidence for billingAddress was low, the §5.7 flag stays quiet but the §5.6 general flag still fires (nothing suppressing it)", () => {
  const instances = evaluateInvoiceFlags(
    {
      ...baseFormDataForChecklist,
      billingAddress: "456 MG Road, Bangalore",
      extractedSnapshot: {
        invoiceDate: baseFormDataForChecklist.invoiceDate,
        billingAddress: "123 MG Road, Bangalore",
        fieldConfidence: { billingAddress: 40 },
      },
    },
    { checklistOptions: {}, aiConfidenceThreshold: 85 },
  );
  assert.ok(!keysOf(instances).includes("BILLING_ADDRESS_CHANGED_AFTER_EXTRACTION"));
  assert.ok(keysOf(instances).includes("BILLING_ADDRESS_DIFFERS_FROM_DOCUMENT"));
});

check("SHIPPING_ADDRESS_CHANGED_AFTER_EXTRACTION does not fire when the AI's confidence for shippingAddress was below threshold", () => {
  const instances = evaluateInvoiceFlags(
    {
      ...baseFormDataForChecklist,
      shippingAddress: "789 Warehouse Rd, Pune",
      extractedSnapshot: {
        invoiceDate: baseFormDataForChecklist.invoiceDate,
        shippingAddress: "789 Warehouse Rd, Nagpur",
        fieldConfidence: { shippingAddress: 40 },
      },
    },
    { checklistOptions: {}, aiConfidenceThreshold: 85 },
  );
  assert.ok(!keysOf(instances).includes("SHIPPING_ADDRESS_CHANGED_AFTER_EXTRACTION"));
});

check("a stale BILLING_ADDRESS_DIFFERS_FROM_DOCUMENT resolution auto-clears once suppressed, instead of lingering", () => {
  const formData = {
    ...baseFormDataForChecklist,
    billingAddress: "456 MG Road, Bangalore",
    extractedSnapshot: { invoiceDate: baseFormDataForChecklist.invoiceDate, billingAddress: "123 MG Road, Bangalore" },
    flagResolutions: {
      BILLING_ADDRESS_DIFFERS_FROM_DOCUMENT: {
        status: "RESOLVED",
        resolvedSituationSignature: {
          extractedBillingAddress: "123 MG Road, Bangalore",
          currentBillingAddress: "456 MG Road, Bangalore",
        },
      },
    },
  };
  const instances = evaluateInvoiceFlags(formData, { checklistOptions: {} });
  const merged = mergeFlagsWithResolutions(instances, formData.flagResolutions);
  const differsEntry = merged.find((flag) => flag.key === "BILLING_ADDRESS_DIFFERS_FROM_DOCUMENT");
  assert.equal(differsEntry.status, "AUTO_CLEARED");
  const changedEntry = merged.find((flag) => flag.key === "BILLING_ADDRESS_CHANGED_AFTER_EXTRACTION");
  assert.equal(changedEntry.status, "ACTIVE");
});

check("BILLING_ADDRESS_CHANGED_AFTER_EXTRACTION can be resolved like any other optional flag", () => {
  const merged = mergeFlagsWithResolutions(
    [{ key: "BILLING_ADDRESS_CHANGED_AFTER_EXTRACTION", instanceId: "BILLING_ADDRESS_CHANGED_AFTER_EXTRACTION", situationSignature: { field: "billingAddress" } }],
    { BILLING_ADDRESS_CHANGED_AFTER_EXTRACTION: { status: "RESOLVED", resolvedSituationSignature: { field: "billingAddress" } } },
  );
  assert.equal(merged[0].status, "RESOLVED");
});

check("billing address change and shipping address change co-fire independently (genuinely different, unrelated conditions)", () => {
  const instances = evaluateInvoiceFlags(
    {
      ...baseFormDataForChecklist,
      billingAddress: "456 MG Road, Bangalore",
      shippingAddress: "789 Warehouse Rd, Pune",
      extractedSnapshot: {
        invoiceDate: baseFormDataForChecklist.invoiceDate,
        billingAddress: "123 MG Road, Bangalore",
        shippingAddress: "789 Warehouse Rd, Nagpur",
      },
    },
    { checklistOptions: {} },
  );
  assert.ok(keysOf(instances).includes("BILLING_ADDRESS_CHANGED_AFTER_EXTRACTION"));
  assert.ok(keysOf(instances).includes("SHIPPING_ADDRESS_CHANGED_AFTER_EXTRACTION"));
});

// ---------------------------------------------------------------------------
console.log("evaluateInvoiceFlags — CAMPAIGN_REFERENCE_INVALID");

const APPROVED_CAMPAIGNS = [
  { id: "camp-1", name: "Diwali Push", referenceCode: "DIWALI25" },
  { id: "camp-2", name: "Monsoon Offer", referenceCode: "MONSOON25" },
];

check("does not fire when the campaign is entirely empty (empty is non-invalid)", () => {
  const instances = evaluateInvoiceFlags(
    { vendorId: "vendor-1", campaignId: "", campaignName: "", referenceNumber: "" },
    { approvedCampaigns: APPROVED_CAMPAIGNS },
  );
  assert.ok(!keysOf(instances).includes("CAMPAIGN_REFERENCE_INVALID"));
});

check("does not fire when the free-typed campaign name matches an approved campaign (case/whitespace-insensitive)", () => {
  const instances = evaluateInvoiceFlags(
    { vendorId: "vendor-1", campaignId: "", campaignName: "  diwali push  ", referenceNumber: "" },
    { approvedCampaigns: APPROVED_CAMPAIGNS },
  );
  assert.ok(!keysOf(instances).includes("CAMPAIGN_REFERENCE_INVALID"));
});

check("fires when the free-typed campaign name matches no approved campaign", () => {
  const instances = evaluateInvoiceFlags(
    { vendorId: "vendor-1", campaignId: "", campaignName: "Holi Bash", referenceNumber: "" },
    { approvedCampaigns: APPROVED_CAMPAIGNS },
  );
  assert.ok(keysOf(instances).includes("CAMPAIGN_REFERENCE_INVALID"));
});

check("does not fire when the free-typed reference code matches an approved campaign's referenceCode", () => {
  const instances = evaluateInvoiceFlags(
    { vendorId: "vendor-1", campaignId: "", campaignName: "", referenceNumber: "monsoon25" },
    { approvedCampaigns: APPROVED_CAMPAIGNS },
  );
  assert.ok(!keysOf(instances).includes("CAMPAIGN_REFERENCE_INVALID"));
});

check("fires when the free-typed reference code matches no approved campaign", () => {
  const instances = evaluateInvoiceFlags(
    { vendorId: "vendor-1", campaignId: "", campaignName: "", referenceNumber: "SUMMER99" },
    { approvedCampaigns: APPROVED_CAMPAIGNS },
  );
  assert.ok(keysOf(instances).includes("CAMPAIGN_REFERENCE_INVALID"));
});

check("does not fire when campaignId is set (a real dropdown selection, already validated at selection time)", () => {
  const instances = evaluateInvoiceFlags(
    { vendorId: "vendor-1", campaignId: "camp-1", campaignName: "Diwali Push", referenceNumber: "DIWALI25" },
    { approvedCampaigns: [] }, // even if the list has since changed, a made selection is trusted
  );
  assert.ok(!keysOf(instances).includes("CAMPAIGN_REFERENCE_INVALID"));
});

check("does not fire while the approved-campaigns query hasn't loaded yet (undefined, not an empty array — avoids a false positive)", () => {
  const instances = evaluateInvoiceFlags(
    { vendorId: "vendor-1", campaignId: "", campaignName: "Holi Bash", referenceNumber: "" },
    { approvedCampaigns: undefined },
  );
  assert.ok(!keysOf(instances).includes("CAMPAIGN_REFERENCE_INVALID"));
});

check("fires when the vendor genuinely has zero approved campaigns and something was free-typed", () => {
  const instances = evaluateInvoiceFlags(
    { vendorId: "vendor-1", campaignId: "", campaignName: "Anything", referenceNumber: "" },
    { approvedCampaigns: [] },
  );
  assert.ok(keysOf(instances).includes("CAMPAIGN_REFERENCE_INVALID"));
});

check("reflects whichever vendor's approved list is passed in context (switching vendors changes the outcome)", () => {
  const formData = { vendorId: "vendor-2", campaignId: "", campaignName: "Diwali Push", referenceNumber: "" };
  const withOldVendorList = evaluateInvoiceFlags(formData, { approvedCampaigns: [] });
  const withNewVendorList = evaluateInvoiceFlags(formData, { approvedCampaigns: APPROVED_CAMPAIGNS });
  assert.ok(keysOf(withOldVendorList).includes("CAMPAIGN_REFERENCE_INVALID"));
  assert.ok(!keysOf(withNewVendorList).includes("CAMPAIGN_REFERENCE_INVALID"));
});

check("CAMPAIGN_REFERENCE_INVALID can be resolved like any other optional flag", () => {
  const merged = mergeFlagsWithResolutions(
    [{ key: "CAMPAIGN_REFERENCE_INVALID", instanceId: "CAMPAIGN_REFERENCE_INVALID", situationSignature: { campaignName: "Holi Bash" } }],
    { CAMPAIGN_REFERENCE_INVALID: { status: "RESOLVED", resolvedSituationSignature: { campaignName: "Holi Bash" } } },
  );
  assert.equal(merged[0].status, "RESOLVED");
});

// ---------------------------------------------------------------------------
console.log("evaluateInvoiceFlags — VENDOR_GSTIN_BRANCH_MISMATCH");

const VENDOR_DETAIL_WITH_BRANCHES = {
  id: "vendor-1",
  vendorBranches: [
    { branchCode: "BLR", branchName: "Bangalore", gstin: "29AAAAA0000A1Z5" },
    { branchCode: "MUM", branchName: "Mumbai", gstin: "27BBBBB0000B1Z5" },
  ],
};

check("does not fire when the selected branch's GSTIN matches its registered GSTIN", () => {
  const instances = evaluateInvoiceFlags(
    { vendorId: "vendor-1", vendorBranchCode: "BLR", vendorBranchName: "Bangalore", vendorBranchGstin: "29AAAAA0000A1Z5" },
    { selectedVendorDetail: VENDOR_DETAIL_WITH_BRANCHES },
  );
  assert.ok(!keysOf(instances).includes("VENDOR_GSTIN_BRANCH_MISMATCH"));
});

check("fires when the selected branch's GSTIN differs from its registered GSTIN", () => {
  const instances = evaluateInvoiceFlags(
    { vendorId: "vendor-1", vendorBranchCode: "BLR", vendorBranchName: "Bangalore", vendorBranchGstin: "27ZZZZZ0000Z1Z9" },
    { selectedVendorDetail: VENDOR_DETAIL_WITH_BRANCHES },
  );
  assert.ok(keysOf(instances).includes("VENDOR_GSTIN_BRANCH_MISMATCH"));
});

check("matches by branch name when branch code isn't set, case/whitespace-insensitive on the GSTIN compare", () => {
  const instances = evaluateInvoiceFlags(
    { vendorId: "vendor-1", vendorBranchCode: "", vendorBranchName: "Mumbai", vendorBranchGstin: " 27bbbbb0000b1z5 " },
    { selectedVendorDetail: VENDOR_DETAIL_WITH_BRANCHES },
  );
  assert.ok(!keysOf(instances).includes("VENDOR_GSTIN_BRANCH_MISMATCH"));
});

check("does not fire when no branch is selected at all", () => {
  const instances = evaluateInvoiceFlags(
    { vendorId: "vendor-1", vendorBranchCode: "", vendorBranchName: "", vendorBranchGstin: "" },
    { selectedVendorDetail: VENDOR_DETAIL_WITH_BRANCHES },
  );
  assert.ok(!keysOf(instances).includes("VENDOR_GSTIN_BRANCH_MISMATCH"));
});

check("does not false-positive when the selected branch is a phantom/unmatched branch (extraction-only, not a real vendor branch)", () => {
  const instances = evaluateInvoiceFlags(
    { vendorId: "vendor-1", vendorBranchCode: "PHANTOM", vendorBranchName: "Unregistered Branch", vendorBranchGstin: "27ZZZZZ0000Z1Z9" },
    { selectedVendorDetail: VENDOR_DETAIL_WITH_BRANCHES },
  );
  assert.ok(!keysOf(instances).includes("VENDOR_GSTIN_BRANCH_MISMATCH"));
});

check("does not false-positive when selectedVendorDetail hasn't loaded yet (undefined)", () => {
  const instances = evaluateInvoiceFlags(
    { vendorId: "vendor-1", vendorBranchCode: "BLR", vendorBranchName: "Bangalore", vendorBranchGstin: "27ZZZZZ0000Z1Z9" },
    { selectedVendorDetail: undefined },
  );
  assert.ok(!keysOf(instances).includes("VENDOR_GSTIN_BRANCH_MISMATCH"));
});

check("does not false-positive when the vendor detail has no vendorBranches array", () => {
  const instances = evaluateInvoiceFlags(
    { vendorId: "vendor-1", vendorBranchCode: "BLR", vendorBranchName: "Bangalore", vendorBranchGstin: "27ZZZZZ0000Z1Z9" },
    { selectedVendorDetail: { id: "vendor-1" } },
  );
  assert.ok(!keysOf(instances).includes("VENDOR_GSTIN_BRANCH_MISMATCH"));
});

check("does not false-positive when the matched branch record has no GSTIN of its own", () => {
  const instances = evaluateInvoiceFlags(
    { vendorId: "vendor-1", vendorBranchCode: "DEL", vendorBranchName: "Delhi", vendorBranchGstin: "27ZZZZZ0000Z1Z9" },
    {
      selectedVendorDetail: {
        id: "vendor-1",
        vendorBranches: [{ branchCode: "DEL", branchName: "Delhi", gstin: "" }],
      },
    },
  );
  assert.ok(!keysOf(instances).includes("VENDOR_GSTIN_BRANCH_MISMATCH"));
});

check("does not false-positive when formData.vendorBranchGstin itself is empty", () => {
  const instances = evaluateInvoiceFlags(
    { vendorId: "vendor-1", vendorBranchCode: "BLR", vendorBranchName: "Bangalore", vendorBranchGstin: "" },
    { selectedVendorDetail: VENDOR_DETAIL_WITH_BRANCHES },
  );
  assert.ok(!keysOf(instances).includes("VENDOR_GSTIN_BRANCH_MISMATCH"));
});

check("falls back to branch.mappedGstin/billingGstin when a branch record has no plain gstin field", () => {
  const instances = evaluateInvoiceFlags(
    { vendorId: "vendor-1", vendorBranchCode: "PUN", vendorBranchName: "Pune", vendorBranchGstin: "27ZZZZZ0000Z1Z9" },
    {
      selectedVendorDetail: {
        id: "vendor-1",
        vendorBranches: [{ branchCode: "PUN", branchName: "Pune", billingGstin: "27CCCCC0000C1Z5" }],
      },
    },
  );
  assert.ok(keysOf(instances).includes("VENDOR_GSTIN_BRANCH_MISMATCH"));
});

check("MSME_VENDOR is unaffected by the new selectedVendorDetail context field (still reads context.selectedVendor)", () => {
  const instances = evaluateInvoiceFlags(
    { vendorId: "vendor-1" },
    { selectedVendor: { id: "vendor-1", msme: true }, selectedVendorDetail: { id: "vendor-1", msme: false, vendorBranches: [] } },
  );
  assert.ok(keysOf(instances).includes("MSME_VENDOR"));
});

check("VENDOR_GSTIN_BRANCH_MISMATCH lifecycle: resolves, then reopens when the mismatch changes", () => {
  const instances = evaluateInvoiceFlags(
    { vendorId: "vendor-1", vendorBranchCode: "BLR", vendorBranchName: "Bangalore", vendorBranchGstin: "27ZZZZZ0000Z1Z9" },
    { selectedVendorDetail: VENDOR_DETAIL_WITH_BRANCHES },
  );
  const signature = instances.find((i) => i.key === "VENDOR_GSTIN_BRANCH_MISMATCH").situationSignature;

  const resolved = mergeFlagsWithResolutions(instances, {
    VENDOR_GSTIN_BRANCH_MISMATCH: { status: "RESOLVED", resolvedSituationSignature: signature },
  });
  assert.equal(resolved.find((i) => i.key === "VENDOR_GSTIN_BRANCH_MISMATCH").status, "RESOLVED");

  const changedInstances = evaluateInvoiceFlags(
    { vendorId: "vendor-1", vendorBranchCode: "MUM", vendorBranchName: "Mumbai", vendorBranchGstin: "27ZZZZZ0000Z1Z9" },
    { selectedVendorDetail: VENDOR_DETAIL_WITH_BRANCHES },
  );
  const reopened = mergeFlagsWithResolutions(changedInstances, {
    VENDOR_GSTIN_BRANCH_MISMATCH: { status: "RESOLVED", resolvedSituationSignature: signature },
  });
  assert.equal(reopened.find((i) => i.key === "VENDOR_GSTIN_BRANCH_MISMATCH").status, "ACTIVE");
});

// ---------------------------------------------------------------------------
console.log("evaluateInvoiceFlags — TDS_MAPPING_NOT_APPLIED");

const VENDOR_DETAIL_WITH_TDS_MAPPING = {
  id: "vendor-1",
  tdsMapping: { tdsSectionId: "tds-194c-contract-others", sectionCode: "194C", rate: 2 },
};

check("fires when the vendor has a configured TDS mapping and the invoice has No TDS", () => {
  const instances = evaluateInvoiceFlags(
    { vendorId: "vendor-1", tds: "" },
    { selectedVendorDetail: VENDOR_DETAIL_WITH_TDS_MAPPING },
  );
  assert.ok(keysOf(instances).includes("TDS_MAPPING_NOT_APPLIED"));
});

check("does not fire when the vendor has a configured mapping and a TDS selection is applied", () => {
  const instances = evaluateInvoiceFlags(
    { vendorId: "vendor-1", tds: "tds-194c-contract-others::194C-2%" },
    { selectedVendorDetail: VENDOR_DETAIL_WITH_TDS_MAPPING },
  );
  assert.ok(!keysOf(instances).includes("TDS_MAPPING_NOT_APPLIED"));
});

check("does not fire when the vendor has no TDS mapping at all", () => {
  const instances = evaluateInvoiceFlags(
    { vendorId: "vendor-1", tds: "" },
    { selectedVendorDetail: { id: "vendor-1", tdsMapping: null } },
  );
  assert.ok(!keysOf(instances).includes("TDS_MAPPING_NOT_APPLIED"));
});

check("does not fire when the vendor's mapping is the incomplete custom-TDS-pending state", () => {
  const instances = evaluateInvoiceFlags(
    { vendorId: "vendor-1", tds: "" },
    {
      selectedVendorDetail: {
        id: "vendor-1",
        tdsMapping: { tdsSectionId: CUSTOM_TDS_SECTION_ID, sectionCode: "", rate: "" },
      },
    },
  );
  assert.ok(!keysOf(instances).includes("TDS_MAPPING_NOT_APPLIED"));
});

check("does not false-positive when vendor detail hasn't loaded yet (undefined)", () => {
  const instances = evaluateInvoiceFlags(
    { vendorId: "vendor-1", tds: "" },
    { selectedVendorDetail: undefined },
  );
  assert.ok(!keysOf(instances).includes("TDS_MAPPING_NOT_APPLIED"));
});

check("does not false-positive when no vendor is selected at all", () => {
  const instances = evaluateInvoiceFlags({ vendorId: "", tds: "" }, { selectedVendorDetail: null });
  assert.ok(!keysOf(instances).includes("TDS_MAPPING_NOT_APPLIED"));
});

check("switching to a vendor with a configured mapping re-evaluates and fires", () => {
  const formData = { vendorId: "vendor-2", tds: "" };
  const beforeSwitch = evaluateInvoiceFlags(formData, {
    selectedVendorDetail: { id: "vendor-2", tdsMapping: null },
  });
  const afterSwitch = evaluateInvoiceFlags(formData, {
    selectedVendorDetail: { id: "vendor-2", tdsMapping: { sectionCode: "194J", rate: 10 } },
  });
  assert.ok(!keysOf(beforeSwitch).includes("TDS_MAPPING_NOT_APPLIED"));
  assert.ok(keysOf(afterSwitch).includes("TDS_MAPPING_NOT_APPLIED"));
});

check("changing an applied TDS back to No TDS fires again", () => {
  const withTdsApplied = evaluateInvoiceFlags(
    { vendorId: "vendor-1", tds: "tds-194c-contract-others::194C-2%" },
    { selectedVendorDetail: VENDOR_DETAIL_WITH_TDS_MAPPING },
  );
  const backToNoTds = evaluateInvoiceFlags(
    { vendorId: "vendor-1", tds: "" },
    { selectedVendorDetail: VENDOR_DETAIL_WITH_TDS_MAPPING },
  );
  assert.ok(!keysOf(withTdsApplied).includes("TDS_MAPPING_NOT_APPLIED"));
  assert.ok(keysOf(backToNoTds).includes("TDS_MAPPING_NOT_APPLIED"));
});

check("MSME_VENDOR is unaffected by the new TDS rule sharing the same evaluator", () => {
  const instances = evaluateInvoiceFlags(
    { vendorId: "vendor-1", tds: "" },
    {
      selectedVendor: { id: "vendor-1", msme: true },
      selectedVendorDetail: VENDOR_DETAIL_WITH_TDS_MAPPING,
    },
  );
  assert.ok(keysOf(instances).includes("MSME_VENDOR"));
  assert.ok(keysOf(instances).includes("TDS_MAPPING_NOT_APPLIED"));
});

check("TDS_MAPPING_NOT_APPLIED lifecycle: resolves on the current mapping, then reopens once the vendor switches to a different mapping", () => {
  const instances = evaluateInvoiceFlags(
    { vendorId: "vendor-1", tds: "" },
    { selectedVendorDetail: VENDOR_DETAIL_WITH_TDS_MAPPING },
  );
  const signature = instances.find((i) => i.key === "TDS_MAPPING_NOT_APPLIED").situationSignature;

  const resolved = mergeFlagsWithResolutions(instances, {
    TDS_MAPPING_NOT_APPLIED: { status: "RESOLVED", resolvedSituationSignature: signature },
  });
  assert.equal(resolved.find((i) => i.key === "TDS_MAPPING_NOT_APPLIED").status, "RESOLVED");

  const switchedVendorInstances = evaluateInvoiceFlags(
    { vendorId: "vendor-3", tds: "" },
    { selectedVendorDetail: { id: "vendor-3", tdsMapping: { sectionCode: "194J", rate: 10 } } },
  );
  const reopened = mergeFlagsWithResolutions(switchedVendorInstances, {
    TDS_MAPPING_NOT_APPLIED: { status: "RESOLVED", resolvedSituationSignature: signature },
  });
  assert.equal(reopened.find((i) => i.key === "TDS_MAPPING_NOT_APPLIED").status, "ACTIVE");
});

check("TDS_MAPPING_NOT_APPLIED auto-clears once the applied TDS matches the vendor mapping", () => {
  const instances = evaluateInvoiceFlags(
    { vendorId: "vendor-1", tds: "" },
    { selectedVendorDetail: VENDOR_DETAIL_WITH_TDS_MAPPING },
  );
  const signature = instances.find((i) => i.key === "TDS_MAPPING_NOT_APPLIED").situationSignature;

  const afterTdsApplied = evaluateInvoiceFlags(
    { vendorId: "vendor-1", tds: "tds-194c-contract-others::194C-2%" },
    { selectedVendorDetail: VENDOR_DETAIL_WITH_TDS_MAPPING },
  );
  const merged = mergeFlagsWithResolutions(afterTdsApplied, {
    TDS_MAPPING_NOT_APPLIED: { status: "RESOLVED", resolvedSituationSignature: signature },
  });
  assert.equal(merged.find((i) => i.key === "TDS_MAPPING_NOT_APPLIED").status, "AUTO_CLEARED");
});

// ---------------------------------------------------------------------------
console.log("evaluateInvoiceFlags — VENDOR_BANK_DETAILS_MISSING");

// Gated on context.isBankIntegrationEnabled (RBACContext.jsx's
// isConnectedBankingEnabled) — every fixture below sets it explicitly, true
// or false, rather than relying on evaluateInvoiceFlags' own default, so
// each test is unambiguous about which condition it's proving.

check("does not fire when Banking integration is disabled, even with zero bank accounts on file", () => {
  const instances = evaluateInvoiceFlags(
    { vendorId: "vendor-1" },
    {
      isBankIntegrationEnabled: false,
      selectedVendorDetail: { id: "vendor-1", bankAccounts: [] },
    },
  );
  assert.ok(!keysOf(instances).includes("VENDOR_BANK_DETAILS_MISSING"));
});

check("does not fire when Banking integration is enabled and the vendor has one active, populated bank account", () => {
  const instances = evaluateInvoiceFlags(
    { vendorId: "vendor-1" },
    {
      isBankIntegrationEnabled: true,
      selectedVendorDetail: {
        id: "vendor-1",
        bankAccounts: [{ bankName: "HDFC Bank", accountNumber: "000123456789", ifscCode: "HDFC0001234", isActive: true }],
      },
    },
  );
  assert.ok(!keysOf(instances).includes("VENDOR_BANK_DETAILS_MISSING"));
});

check("fires when Banking integration is enabled and the vendor has an empty bankAccounts array", () => {
  const instances = evaluateInvoiceFlags(
    { vendorId: "vendor-1" },
    { isBankIntegrationEnabled: true, selectedVendorDetail: { id: "vendor-1", bankAccounts: [] } },
  );
  assert.ok(keysOf(instances).includes("VENDOR_BANK_DETAILS_MISSING"));
});

check("fires when Banking integration is enabled and every bank account on file is inactive", () => {
  const instances = evaluateInvoiceFlags(
    { vendorId: "vendor-1" },
    {
      isBankIntegrationEnabled: true,
      selectedVendorDetail: {
        id: "vendor-1",
        bankAccounts: [{ bankName: "HDFC Bank", accountNumber: "000123456789", ifscCode: "HDFC0001234", isActive: false }],
      },
    },
  );
  assert.ok(keysOf(instances).includes("VENDOR_BANK_DETAILS_MISSING"));
});

check("fires when Banking integration is enabled and the only account is an active but entirely blank draft row", () => {
  const instances = evaluateInvoiceFlags(
    { vendorId: "vendor-1" },
    {
      isBankIntegrationEnabled: true,
      selectedVendorDetail: {
        id: "vendor-1",
        bankAccounts: [{ bankName: "", accountNumber: "", ifscCode: "", isActive: true }],
      },
    },
  );
  assert.ok(keysOf(instances).includes("VENDOR_BANK_DETAILS_MISSING"));
});

check("does not false-positive when Banking integration is enabled but vendor detail is unavailable/loading (null)", () => {
  const instances = evaluateInvoiceFlags(
    { vendorId: "vendor-1" },
    { isBankIntegrationEnabled: true, selectedVendorDetail: null },
  );
  assert.ok(!keysOf(instances).includes("VENDOR_BANK_DETAILS_MISSING"));
});

check("does not false-positive when Banking integration is enabled but bankAccounts is absent or not an array", () => {
  const instances = evaluateInvoiceFlags(
    { vendorId: "vendor-1" },
    { isBankIntegrationEnabled: true, selectedVendorDetail: { id: "vendor-1" } },
  );
  assert.ok(!keysOf(instances).includes("VENDOR_BANK_DETAILS_MISSING"));
});

check("switching vendors re-evaluates correctly (Banking integration enabled)", () => {
  const formData = { vendorId: "vendor-2" };
  const withNoBank = evaluateInvoiceFlags(formData, {
    isBankIntegrationEnabled: true,
    selectedVendorDetail: { id: "vendor-2", bankAccounts: [] },
  });
  const withBank = evaluateInvoiceFlags(formData, {
    isBankIntegrationEnabled: true,
    selectedVendorDetail: {
      id: "vendor-2",
      bankAccounts: [{ bankName: "ICICI Bank", accountNumber: "0011223344", ifscCode: "ICIC0000456", isActive: true }],
    },
  });
  assert.ok(keysOf(withNoBank).includes("VENDOR_BANK_DETAILS_MISSING"));
  assert.ok(!keysOf(withBank).includes("VENDOR_BANK_DETAILS_MISSING"));
});

check("MSME_VENDOR is unaffected by the bank-details rule sharing the same evaluator", () => {
  const instances = evaluateInvoiceFlags(
    { vendorId: "vendor-1" },
    {
      isBankIntegrationEnabled: true,
      selectedVendor: { id: "vendor-1", msme: true },
      selectedVendorDetail: { id: "vendor-1", bankAccounts: [] },
    },
  );
  assert.ok(keysOf(instances).includes("MSME_VENDOR"));
  assert.ok(keysOf(instances).includes("VENDOR_BANK_DETAILS_MISSING"));
});

check("VENDOR_BANK_DETAILS_MISSING lifecycle: adding an active account auto-clears a resolved flag, switching to another vendor with no bank account reopens it", () => {
  const instances = evaluateInvoiceFlags(
    { vendorId: "vendor-1" },
    { isBankIntegrationEnabled: true, selectedVendorDetail: { id: "vendor-1", bankAccounts: [] } },
  );
  const signature = instances.find((i) => i.key === "VENDOR_BANK_DETAILS_MISSING").situationSignature;
  const resolutions = {
    VENDOR_BANK_DETAILS_MISSING: {
      status: "RESOLVED",
      reason: "Vendor has confirmed bank details will be added before payment is due.",
      resolvedSituationSignature: signature,
    },
  };

  const afterAccountAdded = evaluateInvoiceFlags(
    { vendorId: "vendor-1" },
    {
      isBankIntegrationEnabled: true,
      selectedVendorDetail: {
        id: "vendor-1",
        bankAccounts: [{ bankName: "HDFC Bank", accountNumber: "000123456789", ifscCode: "HDFC0001234", isActive: true }],
      },
    },
  );
  const mergedAfterAdd = mergeFlagsWithResolutions(afterAccountAdded, resolutions);
  assert.equal(mergedAfterAdd.find((i) => i.key === "VENDOR_BANK_DETAILS_MISSING").status, "AUTO_CLEARED");

  const afterVendorSwitch = evaluateInvoiceFlags(
    { vendorId: "vendor-3" },
    { isBankIntegrationEnabled: true, selectedVendorDetail: { id: "vendor-3", bankAccounts: [] } },
  );
  const mergedAfterSwitch = mergeFlagsWithResolutions(afterVendorSwitch, resolutions);
  assert.equal(mergedAfterSwitch.find((i) => i.key === "VENDOR_BANK_DETAILS_MISSING").status, "ACTIVE");
});

check("catalog: VENDOR_BANK_DETAILS_MISSING is WORTH_CHECKING and not in BLOCKING_SEVERITIES (no longer blocks create/save/submit)", () => {
  const entry = INVOICE_FLAG_CATALOG.VENDOR_BANK_DETAILS_MISSING;
  assert.equal(entry.severity, INVOICE_FLAG_SEVERITY.WORTH_CHECKING);
  assert.ok(!BLOCKING_SEVERITIES.has(entry.severity));
});

check("catalog: VENDOR_BANK_DETAILS_MISSING's action is RESOLVE, not FIX_IN_FORM", () => {
  assert.equal(INVOICE_FLAG_CATALOG.VENDOR_BANK_DETAILS_MISSING.actionKind, "RESOLVE");
});

check("regression guard: no other catalog entry's severity or actionKind changed", () => {
  const expectedSeverityActionPairs = {
    GSTIN_MISMATCH: ["MUST_EXPLAIN", "RESOLVE"],
    DOCUMENT_TYPE_MISMATCH: ["WORTH_CHECKING", "RESOLVE"],
    BRANCH_GSTIN_CONFLICT: ["MUST_FIX", "FIX_OR_RESOLVE"],
    LOW_EXTRACTION_CONFIDENCE: ["WORTH_CHECKING", "RESOLVE"],
    DUPLICATE_INVOICE: ["MUST_EXPLAIN", "VIEW_AND_RESOLVE"],
    DUPLICATE_INVOICE_CROSS_YEAR: ["WORTH_CHECKING", "RESOLVE"],
    SIMILAR_INVOICE: ["WORTH_CHECKING", "RESOLVE"],
    DUPLICATE_DOCUMENT: ["WORTH_CHECKING", "RESOLVE"],
    DUPLICATE_AVOIDED_BY_EDIT: ["MUST_EXPLAIN", "VIEW_AND_RESOLVE"],
    INVOICE_DATE_OUT_OF_PERIOD: ["MUST_EXPLAIN", "RESOLVE"],
    MSME_VENDOR: ["JUST_SO_YOU_KNOW", "RESOLVE"],
    MSME_CREDIT_PERIOD_EXCEEDED: ["MUST_EXPLAIN", "RESOLVE"],
    VENDOR_APPROVAL_PENDING: ["JUST_SO_YOU_KNOW", "RESOLVE"],
    VENDOR_INACTIVE: ["MUST_EXPLAIN", "RESOLVE"],
    CAMPAIGN_REFERENCE_INVALID: ["WORTH_CHECKING", "RESOLVE"],
    VENDOR_GSTIN_BRANCH_MISMATCH: ["WORTH_CHECKING", "RESOLVE"],
    TDS_MAPPING_NOT_APPLIED: ["WORTH_CHECKING", "RESOLVE"],
    VENDOR_BANK_DETAILS_MISSING: ["WORTH_CHECKING", "RESOLVE"],
    VENDOR_MISMATCH: ["MUST_EXPLAIN", "RESOLVE"],
    DUE_DATE_PRECEDES_BILLING_DATE: ["MUST_FIX", "FIX_OR_RESOLVE"],
    FUTURE_DATED_INVOICE: ["MUST_EXPLAIN", "RESOLVE"],
    DUE_DATE_NOT_SET: ["MUST_FIX", "FIX_OR_RESOLVE"],
    ALREADY_PAST_DUE: ["WORTH_CHECKING", "RESOLVE"],
    INVOICE_OLDER_THAN_THRESHOLD: ["WORTH_CHECKING", "RESOLVE"],
    ITC_CLAIM_WINDOW_AT_RISK: ["WORTH_CHECKING", "RESOLVE"],
    REQUIRED_DETAILS_MISSING: ["MUST_FIX", "FIX_OR_RESOLVE"],
    RECOMMENDED_DETAILS_MISSING: ["MUST_FIX", "FIX_OR_RESOLVE"],
    SHIPPING_ADDRESS_MISSING: ["JUST_SO_YOU_KNOW", "RESOLVE"],
    BILLING_ADDRESS_DIFFERS_FROM_DOCUMENT: ["WORTH_CHECKING", "RESOLVE"],
    LINE_GROUP_BRANCH_UNASSIGNED: ["MUST_FIX", "FIX_OR_RESOLVE"],
    EXPENSE_TYPE_UNASSIGNED: ["MUST_FIX", "FIX_OR_RESOLVE"],
    INVOICE_NUMBER_CHANGED_AFTER_EXTRACTION: ["MUST_EXPLAIN", "RESOLVE"],
    BILLING_DATE_CHANGED_AFTER_EXTRACTION: ["MUST_EXPLAIN", "RESOLVE"],
    ORGANISATION_GSTIN_CHANGED_AFTER_EXTRACTION: ["MUST_EXPLAIN", "RESOLVE"],
    VENDOR_GSTIN_CHANGED_AFTER_EXTRACTION: ["MUST_EXPLAIN", "RESOLVE"],
    CURRENCY_CHANGED_AFTER_EXTRACTION: ["MUST_EXPLAIN", "RESOLVE"],
    DOCUMENT_TYPE_CHANGED_AFTER_EXTRACTION: ["MUST_EXPLAIN", "RESOLVE"],
    BILLING_ADDRESS_CHANGED_AFTER_EXTRACTION: ["WORTH_CHECKING", "RESOLVE"],
    SHIPPING_ADDRESS_CHANGED_AFTER_EXTRACTION: ["WORTH_CHECKING", "RESOLVE"],
    VENDOR_SWITCHED_AFTER_EXTRACTION: ["MUST_EXPLAIN", "RESOLVE"],
    TAX_CHANGED_AFTER_EXTRACTION: ["MUST_EXPLAIN", "RESOLVE"],
    FORM_TOTAL_DIFFERS_FROM_DOCUMENT: ["MUST_EXPLAIN", "RESOLVE"],
    GST_TREATMENT_NOT_SET: ["MUST_FIX", "FIX_OR_RESOLVE"],
    TAX_TOTAL_DOES_NOT_RECONCILE: ["MUST_FIX", "FIX_OR_RESOLVE"],
    NET_PAYABLE_MANUALLY_OVERRIDDEN: ["MUST_EXPLAIN", "RESOLVE"],
    TAX_TYPE_CONTRADICTS_PLACE_OF_SUPPLY: ["MUST_EXPLAIN", "RESOLVE"],
    TAX_CHARGED_BY_UNREGISTERED_VENDOR: ["MUST_EXPLAIN", "RESOLVE"],
    TDS_SECTION_DIFFERS_FROM_VENDOR_MASTER: ["WORTH_CHECKING", "RESOLVE"],
    TDS_RATE_OVERRIDDEN: ["WORTH_CHECKING", "RESOLVE"],
    HSN_SAC_CODE_MISSING: ["MUST_FIX", "FIX_OR_RESOLVE"],
    UNUSUAL_TAX_RATE: ["WORTH_CHECKING", "RESOLVE"],
  };
  const actualKeys = Object.keys(INVOICE_FLAG_CATALOG).sort();
  const expectedKeys = Object.keys(expectedSeverityActionPairs).sort();
  assert.deepEqual(actualKeys, expectedKeys, "catalog key set changed unexpectedly — update this guard deliberately if that's intended");
  Object.entries(expectedSeverityActionPairs).forEach(([key, [severity, actionKind]]) => {
    assert.equal(INVOICE_FLAG_CATALOG[key].severity, severity, `${key}: severity changed unexpectedly`);
    assert.equal(INVOICE_FLAG_CATALOG[key].actionKind, actionKind, `${key}: actionKind changed unexpectedly`);
  });
});

// ---------------------------------------------------------------------------
console.log("evaluateInvoiceFlags — TDS_SECTION_DIFFERS_FROM_VENDOR_MASTER");

const VENDOR_DETAIL_194C = {
  id: "vendor-1",
  tdsMapping: { tdsSectionId: "tds-194c-contract-others", sectionCode: "194C", rate: 2 },
};

check("does not fire when the vendor and invoice sections match", () => {
  const instances = evaluateInvoiceFlags(
    { vendorId: "vendor-1", tds: "tds-194c-contract-others::194C-2%", tdsSectionCode: "194C" },
    { selectedVendorDetail: VENDOR_DETAIL_194C },
  );
  assert.ok(!keysOf(instances).includes("TDS_SECTION_DIFFERS_FROM_VENDOR_MASTER"));
});

check("fires when a different section is selected than the vendor's master record", () => {
  const instances = evaluateInvoiceFlags(
    { vendorId: "vendor-1", tds: "tds-194j-a::194J-10%", tdsSectionCode: "194J" },
    { selectedVendorDetail: VENDOR_DETAIL_194C },
  );
  assert.ok(keysOf(instances).includes("TDS_SECTION_DIFFERS_FROM_VENDOR_MASTER"));
});

check("does not fire when the vendor has no TDS mapping", () => {
  const instances = evaluateInvoiceFlags(
    { vendorId: "vendor-1", tds: "tds-194j-a::194J-10%", tdsSectionCode: "194J" },
    { selectedVendorDetail: { id: "vendor-1", tdsMapping: null } },
  );
  assert.ok(!keysOf(instances).includes("TDS_SECTION_DIFFERS_FROM_VENDOR_MASTER"));
});

check("does not fire when the vendor's mapping is the incomplete custom-TDS-pending state", () => {
  const instances = evaluateInvoiceFlags(
    { vendorId: "vendor-1", tds: "tds-194j-a::194J-10%", tdsSectionCode: "194J" },
    {
      selectedVendorDetail: {
        id: "vendor-1",
        tdsMapping: { tdsSectionId: CUSTOM_TDS_SECTION_ID, sectionCode: "", rate: "" },
      },
    },
  );
  assert.ok(!keysOf(instances).includes("TDS_SECTION_DIFFERS_FROM_VENDOR_MASTER"));
});

check("does not fire when No TDS is selected on the invoice", () => {
  const instances = evaluateInvoiceFlags(
    { vendorId: "vendor-1", tds: "", tdsSectionCode: "" },
    { selectedVendorDetail: VENDOR_DETAIL_194C },
  );
  assert.ok(!keysOf(instances).includes("TDS_SECTION_DIFFERS_FROM_VENDOR_MASTER"));
});

check("does not false-positive when vendor detail is unavailable/loading", () => {
  const instances = evaluateInvoiceFlags(
    { vendorId: "vendor-1", tds: "tds-194j-a::194J-10%", tdsSectionCode: "194J" },
    { selectedVendorDetail: null },
  );
  assert.ok(!keysOf(instances).includes("TDS_SECTION_DIFFERS_FROM_VENDOR_MASTER"));
});

check("does not false-positive when the invoice section code is missing (e.g. a not-yet-rated custom selection)", () => {
  const instances = evaluateInvoiceFlags(
    { vendorId: "vendor-1", tds: "__CUSTOM_TDS__", tdsSectionCode: "" },
    { selectedVendorDetail: VENDOR_DETAIL_194C },
  );
  assert.ok(!keysOf(instances).includes("TDS_SECTION_DIFFERS_FROM_VENDOR_MASTER"));
});

check("switching to a vendor with a different master section changes the outcome", () => {
  const formData = { vendorId: "vendor-2", tds: "tds-194j-a::194J-10%", tdsSectionCode: "194J" };
  const matchingVendor = evaluateInvoiceFlags(formData, {
    selectedVendorDetail: { id: "vendor-2", tdsMapping: { sectionCode: "194J", rate: 10 } },
  });
  const differentVendor = evaluateInvoiceFlags(formData, {
    selectedVendorDetail: { id: "vendor-2", tdsMapping: { sectionCode: "194C", rate: 2 } },
  });
  assert.ok(!keysOf(matchingVendor).includes("TDS_SECTION_DIFFERS_FROM_VENDOR_MASTER"));
  assert.ok(keysOf(differentVendor).includes("TDS_SECTION_DIFFERS_FROM_VENDOR_MASTER"));
});

check("changing the invoice section back to match the vendor's clears the flag", () => {
  const mismatched = evaluateInvoiceFlags(
    { vendorId: "vendor-1", tds: "tds-194j-a::194J-10%", tdsSectionCode: "194J" },
    { selectedVendorDetail: VENDOR_DETAIL_194C },
  );
  const corrected = evaluateInvoiceFlags(
    { vendorId: "vendor-1", tds: "tds-194c-contract-others::194C-2%", tdsSectionCode: "194C" },
    { selectedVendorDetail: VENDOR_DETAIL_194C },
  );
  assert.ok(keysOf(mismatched).includes("TDS_SECTION_DIFFERS_FROM_VENDOR_MASTER"));
  assert.ok(!keysOf(corrected).includes("TDS_SECTION_DIFFERS_FROM_VENDOR_MASTER"));
});

check("TDS_SECTION_DIFFERS_FROM_VENDOR_MASTER lifecycle: resolves, then reopens once the vendor's master section changes", () => {
  const instances = evaluateInvoiceFlags(
    { vendorId: "vendor-1", tds: "tds-194j-a::194J-10%", tdsSectionCode: "194J" },
    { selectedVendorDetail: VENDOR_DETAIL_194C },
  );
  const signature = instances.find((i) => i.key === "TDS_SECTION_DIFFERS_FROM_VENDOR_MASTER").situationSignature;
  const resolutions = {
    TDS_SECTION_DIFFERS_FROM_VENDOR_MASTER: { status: "RESOLVED", resolvedSituationSignature: signature },
  };

  const stillMismatchedSameVendor = evaluateInvoiceFlags(
    { vendorId: "vendor-1", tds: "tds-194j-a::194J-10%", tdsSectionCode: "194J" },
    { selectedVendorDetail: VENDOR_DETAIL_194C },
  );
  const stillResolved = mergeFlagsWithResolutions(stillMismatchedSameVendor, resolutions);
  assert.equal(stillResolved.find((i) => i.key === "TDS_SECTION_DIFFERS_FROM_VENDOR_MASTER").status, "RESOLVED");

  const afterVendorMasterChanged = evaluateInvoiceFlags(
    { vendorId: "vendor-1", tds: "tds-194j-a::194J-10%", tdsSectionCode: "194J" },
    { selectedVendorDetail: { id: "vendor-1", tdsMapping: { sectionCode: "194H", rate: 2 } } },
  );
  const reopened = mergeFlagsWithResolutions(afterVendorMasterChanged, resolutions);
  assert.equal(reopened.find((i) => i.key === "TDS_SECTION_DIFFERS_FROM_VENDOR_MASTER").status, "ACTIVE");
});

// ---------------------------------------------------------------------------
console.log("evaluateInvoiceFlags — TDS_RATE_OVERRIDDEN");

const TDS_SECTIONS_FIXTURE = [
  { id: "sec-194c-individual", section_code: "194C", rate_individual: 0.01 }, // 1%
  { id: "sec-194c-others", section_code: "194C", rate_individual: 0.02 }, // 2%
  { id: "sec-194j-professional", section_code: "194J", rate_individual: 0.1 }, // 10%
];

check("does not fire when the applied rate matches the exact statutory rate for the selected section id", () => {
  const instances = evaluateInvoiceFlags(
    { tds: "sec-194c-others::194C-2%", tdsSectionId: "sec-194c-others", tdsRate: 2 },
    { tdsSections: TDS_SECTIONS_FIXTURE },
  );
  assert.ok(!keysOf(instances).includes("TDS_RATE_OVERRIDDEN"));
});

check("fires when the applied rate differs from the statutory rate", () => {
  const instances = evaluateInvoiceFlags(
    { tds: "sec-194c-others::194C-2%", tdsSectionId: "sec-194c-others", tdsRate: 5 },
    { tdsSections: TDS_SECTIONS_FIXTURE },
  );
  assert.ok(keysOf(instances).includes("TDS_RATE_OVERRIDDEN"));
});

check("matches by exact section id, not section code — same code, two different statutory rates", () => {
  // sec-194c-individual (1%) and sec-194c-others (2%) share the code "194C".
  const correctForItsOwnRow = evaluateInvoiceFlags(
    { tds: "sec-194c-individual::194C-1%", tdsSectionId: "sec-194c-individual", tdsRate: 1 },
    { tdsSections: TDS_SECTIONS_FIXTURE },
  );
  const wouldOnlyPassIfMatchedByCode = evaluateInvoiceFlags(
    { tds: "sec-194c-individual::194C-1%", tdsSectionId: "sec-194c-individual", tdsRate: 2 },
    { tdsSections: TDS_SECTIONS_FIXTURE },
  );
  assert.ok(!keysOf(correctForItsOwnRow).includes("TDS_RATE_OVERRIDDEN"));
  assert.ok(keysOf(wouldOnlyPassIfMatchedByCode).includes("TDS_RATE_OVERRIDDEN"));
});

check("does not fire for a custom TDS section (no statutory row to compare against)", () => {
  const instances = evaluateInvoiceFlags(
    { tds: "__CUSTOM_TDS__", tdsSectionId: CUSTOM_TDS_SECTION_ID, tdsRate: 50 },
    { tdsSections: TDS_SECTIONS_FIXTURE },
  );
  assert.ok(!keysOf(instances).includes("TDS_RATE_OVERRIDDEN"));
});

check("does not false-positive when the section id doesn't resolve to any known statutory row", () => {
  const instances = evaluateInvoiceFlags(
    { tds: "unknown-row::X-9%", tdsSectionId: "unknown-row-id", tdsRate: 9 },
    { tdsSections: TDS_SECTIONS_FIXTURE },
  );
  assert.ok(!keysOf(instances).includes("TDS_RATE_OVERRIDDEN"));
});

check("does not false-positive when tdsSections hasn't loaded yet", () => {
  const instances = evaluateInvoiceFlags(
    { tds: "sec-194c-others::194C-2%", tdsSectionId: "sec-194c-others", tdsRate: 5 },
    { tdsSections: undefined },
  );
  assert.ok(!keysOf(instances).includes("TDS_RATE_OVERRIDDEN"));
});

check("handles a string-typed applied rate the same as a numeric one", () => {
  const instances = evaluateInvoiceFlags(
    { tds: "sec-194c-others::194C-2%", tdsSectionId: "sec-194c-others", tdsRate: "2" },
    { tdsSections: TDS_SECTIONS_FIXTURE },
  );
  assert.ok(!keysOf(instances).includes("TDS_RATE_OVERRIDDEN"));
});

check("changing the rate back to the statutory rate clears the flag", () => {
  const overridden = evaluateInvoiceFlags(
    { tds: "sec-194c-others::194C-2%", tdsSectionId: "sec-194c-others", tdsRate: 5 },
    { tdsSections: TDS_SECTIONS_FIXTURE },
  );
  const restored = evaluateInvoiceFlags(
    { tds: "sec-194c-others::194C-2%", tdsSectionId: "sec-194c-others", tdsRate: 2 },
    { tdsSections: TDS_SECTIONS_FIXTURE },
  );
  assert.ok(keysOf(overridden).includes("TDS_RATE_OVERRIDDEN"));
  assert.ok(!keysOf(restored).includes("TDS_RATE_OVERRIDDEN"));
});

check("TDS_RATE_OVERRIDDEN lifecycle: resolves, then reopens once a different section+rate situation arises", () => {
  const instances = evaluateInvoiceFlags(
    { tds: "sec-194c-others::194C-2%", tdsSectionId: "sec-194c-others", tdsRate: 5 },
    { tdsSections: TDS_SECTIONS_FIXTURE },
  );
  const signature = instances.find((i) => i.key === "TDS_RATE_OVERRIDDEN").situationSignature;
  const resolutions = { TDS_RATE_OVERRIDDEN: { status: "RESOLVED", resolvedSituationSignature: signature } };

  const sameSituation = evaluateInvoiceFlags(
    { tds: "sec-194c-others::194C-2%", tdsSectionId: "sec-194c-others", tdsRate: 5 },
    { tdsSections: TDS_SECTIONS_FIXTURE },
  );
  const stillResolved = mergeFlagsWithResolutions(sameSituation, resolutions);
  assert.equal(stillResolved.find((i) => i.key === "TDS_RATE_OVERRIDDEN").status, "RESOLVED");

  const differentSection = evaluateInvoiceFlags(
    { tds: "sec-194j-professional::194J-10%", tdsSectionId: "sec-194j-professional", tdsRate: 5 },
    { tdsSections: TDS_SECTIONS_FIXTURE },
  );
  const reopened = mergeFlagsWithResolutions(differentSection, resolutions);
  assert.equal(reopened.find((i) => i.key === "TDS_RATE_OVERRIDDEN").status, "ACTIVE");
});

// ---------------------------------------------------------------------------
console.log("evaluateInvoiceFlags — TDS_SECTION_DIFFERS_FROM_VENDOR_MASTER + TDS_RATE_OVERRIDDEN co-occurrence");

check("both new TDS flags can fire together for genuinely independent reasons, and neither suppresses the other", () => {
  const instances = evaluateInvoiceFlags(
    {
      vendorId: "vendor-1",
      tds: "sec-194j-professional::194J-10%",
      tdsSectionCode: "194J",
      tdsSectionId: "sec-194j-professional",
      tdsRate: 5,
    },
    {
      selectedVendorDetail: VENDOR_DETAIL_194C, // vendor's master section is 194C
      tdsSections: TDS_SECTIONS_FIXTURE, // 194J's statutory rate is 10%, invoice applies 5%
    },
  );
  const keys = keysOf(instances);
  assert.ok(keys.includes("TDS_SECTION_DIFFERS_FROM_VENDOR_MASTER"));
  assert.ok(keys.includes("TDS_RATE_OVERRIDDEN"));
  assert.ok(
    !(INVOICE_FLAG_CATALOG.TDS_SECTION_DIFFERS_FROM_VENDOR_MASTER.suppresses || []).includes("TDS_RATE_OVERRIDDEN"),
  );
  assert.ok(
    !(INVOICE_FLAG_CATALOG.TDS_RATE_OVERRIDDEN.suppresses || []).includes("TDS_SECTION_DIFFERS_FROM_VENDOR_MASTER"),
  );
});

// ---------------------------------------------------------------------------
console.log("per-line instance identity architecture — HSN_SAC_CODE_MISSING as the proving ground");

const TWO_MISSING_HSN_LINES = {
  currency: "INR",
  lineItemMode: "DETAILED",
  lineItems: [
    { id: "line-a", description: "Item A", hsnSac: "", tax: "CGST + SGST 18%" },
    { id: "line-b", description: "Item B", hsnSac: "", tax: "CGST + SGST 18%" },
  ],
};

check("two lines with identical invalid data produce two independent instances — same key, different instanceId", () => {
  const instances = evaluateInvoiceFlags(TWO_MISSING_HSN_LINES, {});
  const hsnInstances = instances.filter((i) => i.key === "HSN_SAC_CODE_MISSING");
  assert.equal(hsnInstances.length, 2);
  assert.equal(hsnInstances[0].key, hsnInstances[1].key);
  assert.notEqual(hsnInstances[0].instanceId, hsnInstances[1].instanceId);
});

check("resolving Line A's instance does not resolve Line B's", () => {
  const instances = evaluateInvoiceFlags(TWO_MISSING_HSN_LINES, {});
  const lineA = instances.find((i) => i.instanceId === "HSN_SAC_CODE_MISSING:line-a");
  const resolutions = {
    "HSN_SAC_CODE_MISSING:line-a": {
      key: "HSN_SAC_CODE_MISSING",
      status: "RESOLVED",
      resolvedSituationSignature: lineA.situationSignature,
    },
  };
  const merged = mergeFlagsWithResolutions(instances, resolutions);
  assert.equal(merged.find((i) => i.instanceId === "HSN_SAC_CODE_MISSING:line-a").status, "RESOLVED");
  assert.equal(merged.find((i) => i.instanceId === "HSN_SAC_CODE_MISSING:line-b").status, "ACTIVE");
});

check("resolving Line B's instance does not resolve Line A's", () => {
  const instances = evaluateInvoiceFlags(TWO_MISSING_HSN_LINES, {});
  const lineB = instances.find((i) => i.instanceId === "HSN_SAC_CODE_MISSING:line-b");
  const resolutions = {
    "HSN_SAC_CODE_MISSING:line-b": {
      key: "HSN_SAC_CODE_MISSING",
      status: "RESOLVED",
      resolvedSituationSignature: lineB.situationSignature,
    },
  };
  const merged = mergeFlagsWithResolutions(instances, resolutions);
  assert.equal(merged.find((i) => i.instanceId === "HSN_SAC_CODE_MISSING:line-b").status, "RESOLVED");
  assert.equal(merged.find((i) => i.instanceId === "HSN_SAC_CODE_MISSING:line-a").status, "ACTIVE");
});

check("fixing Line A clears only Line A's instance; Line B remains flagged", () => {
  const instances = evaluateInvoiceFlags(
    {
      ...TWO_MISSING_HSN_LINES,
      lineItems: [
        { id: "line-a", description: "Item A", hsnSac: "998314", tax: "CGST + SGST 18%" },
        { id: "line-b", description: "Item B", hsnSac: "", tax: "CGST + SGST 18%" },
      ],
    },
    {},
  );
  const ids = instances.filter((i) => i.key === "HSN_SAC_CODE_MISSING").map((i) => i.instanceId);
  assert.ok(!ids.includes("HSN_SAC_CODE_MISSING:line-a"));
  assert.ok(ids.includes("HSN_SAC_CODE_MISSING:line-b"));
});

check("removing a resolved, flagged line auto-clears its stale record without touching the other line", () => {
  const instances = evaluateInvoiceFlags(TWO_MISSING_HSN_LINES, {});
  const lineA = instances.find((i) => i.instanceId === "HSN_SAC_CODE_MISSING:line-a");
  const resolutions = {
    "HSN_SAC_CODE_MISSING:line-a": {
      key: "HSN_SAC_CODE_MISSING",
      status: "RESOLVED",
      resolvedSituationSignature: lineA.situationSignature,
    },
  };
  const afterRemoval = evaluateInvoiceFlags(
    { ...TWO_MISSING_HSN_LINES, lineItems: [TWO_MISSING_HSN_LINES.lineItems[1]] },
    {},
  );
  const merged = mergeFlagsWithResolutions(afterRemoval, resolutions);
  const autoCleared = merged.find((i) => i.instanceId === "HSN_SAC_CODE_MISSING:line-a");
  assert.equal(autoCleared.status, "AUTO_CLEARED");
  assert.equal(autoCleared.key, "HSN_SAC_CODE_MISSING"); // catalog metadata still resolvable from record.key
  assert.equal(merged.find((i) => i.instanceId === "HSN_SAC_CODE_MISSING:line-b").status, "ACTIVE");
});

check("reordering the lines in the array does not change instance identity", () => {
  const reordered = { ...TWO_MISSING_HSN_LINES, lineItems: [...TWO_MISSING_HSN_LINES.lineItems].reverse() };
  const instances = evaluateInvoiceFlags(reordered, {});
  const ids = instances.filter((i) => i.key === "HSN_SAC_CODE_MISSING").map((i) => i.instanceId).sort();
  assert.deepEqual(ids, ["HSN_SAC_CODE_MISSING:line-a", "HSN_SAC_CODE_MISSING:line-b"]);
});

check("changing a line's ordinary values (not its id) does not change its instance identity", () => {
  const edited = {
    ...TWO_MISSING_HSN_LINES,
    lineItems: [
      { id: "line-a", description: "Item A — revised", hsnSac: "", tax: "CGST + SGST 18%", quantity: 5 },
      TWO_MISSING_HSN_LINES.lineItems[1],
    ],
  };
  const instances = evaluateInvoiceFlags(edited, {});
  assert.ok(instances.some((i) => i.instanceId === "HSN_SAC_CODE_MISSING:line-a"));
});

check("existing non-line flags keep instanceId === key, unchanged from before this architecture change", () => {
  const instances = evaluateInvoiceFlags(
    { billingGstin: "27ZZZZZ0000Z1Z9", vendorId: "vendor-1" },
    { organisationGstins: ["27ABCDE1234F1Z5"] },
  );
  const gstinMismatch = instances.find((i) => i.key === "GSTIN_MISMATCH");
  assert.ok(gstinMismatch);
  assert.equal(gstinMismatch.instanceId, gstinMismatch.key);
});

check("no duplicate instanceId values exist even when multiple instances share a key — what the UI uses as its React list key", () => {
  const instances = evaluateInvoiceFlags(TWO_MISSING_HSN_LINES, {});
  const instanceIds = instances.map((i) => i.instanceId);
  assert.equal(instanceIds.length, new Set(instanceIds).size);
});

check("looking up by instanceId retrieves the exact clicked instance, not whichever instance merely shares its key", () => {
  const instances = evaluateInvoiceFlags(TWO_MISSING_HSN_LINES, {});
  const sameKeyInstances = instances.filter((item) => item.key === "HSN_SAC_CODE_MISSING");
  assert.equal(sameKeyInstances.length, 2); // proves a key-only lookup would have been ambiguous
  const targetInstanceId = "HSN_SAC_CODE_MISSING:line-b";
  const found = instances.find((item) => item.instanceId === targetInstanceId);
  assert.ok(found);
  assert.equal(found.instanceId, targetInstanceId);
});

// ---------------------------------------------------------------------------
console.log("evaluateInvoiceFlags — HSN_SAC_CODE_MISSING (per-line)");

const LINE_FLAG_BASE = { currency: "INR", lineItemMode: "DETAILED" };

check("one line missing HSN with tax applied -> one flag", () => {
  const instances = evaluateInvoiceFlags(
    { ...LINE_FLAG_BASE, lineItems: [{ id: "l1", hsnSac: "", tax: "CGST + SGST 18%", description: "Consulting" }] },
    {},
  );
  const hsn = instances.filter((i) => i.key === "HSN_SAC_CODE_MISSING");
  assert.equal(hsn.length, 1);
  assert.equal(hsn[0].instanceId, "HSN_SAC_CODE_MISSING:l1");
});

check("two lines missing HSN -> two independent flags", () => {
  const instances = evaluateInvoiceFlags(
    {
      ...LINE_FLAG_BASE,
      lineItems: [
        { id: "l1", hsnSac: "", tax: "CGST + SGST 18%" },
        { id: "l2", hsnSac: "", tax: "CGST + SGST 18%" },
      ],
    },
    {},
  );
  assert.equal(instances.filter((i) => i.key === "HSN_SAC_CODE_MISSING").length, 2);
});

check("a populated HSN code does not fire", () => {
  const instances = evaluateInvoiceFlags(
    { ...LINE_FLAG_BASE, lineItems: [{ id: "l1", hsnSac: "998314", tax: "CGST + SGST 18%" }] },
    {},
  );
  assert.ok(!instances.some((i) => i.key === "HSN_SAC_CODE_MISSING"));
});

check("does not fire when the line has no tax applied (rate resolves to 0)", () => {
  const instances = evaluateInvoiceFlags(
    { ...LINE_FLAG_BASE, lineItems: [{ id: "l1", hsnSac: "", tax: "" }] },
    {},
  );
  assert.ok(!instances.some((i) => i.key === "HSN_SAC_CODE_MISSING"));
});

check("does not fire for a foreign-currency invoice (HSN/GST is an INR-only concept)", () => {
  const instances = evaluateInvoiceFlags(
    { currency: "USD", lineItemMode: "DETAILED", lineItems: [{ id: "l1", hsnSac: "", taxRate: 10 }] },
    {},
  );
  assert.ok(!instances.some((i) => i.key === "HSN_SAC_CODE_MISSING"));
});

check("does not fire in Summary-Only mode (no line items to inspect)", () => {
  const instances = evaluateInvoiceFlags(
    { ...LINE_FLAG_BASE, lineItemMode: "SUMMARY_ONLY", lineItems: [{ id: "l1", hsnSac: "", tax: "CGST + SGST 18%" }] },
    {},
  );
  assert.ok(!instances.some((i) => i.key === "HSN_SAC_CODE_MISSING"));
});

check("HSN_SAC_CODE_MISSING resolve then reopen lifecycle", () => {
  const instances = evaluateInvoiceFlags(
    { ...LINE_FLAG_BASE, lineItems: [{ id: "l1", hsnSac: "", tax: "CGST + SGST 18%" }] },
    {},
  );
  const instance = instances.find((i) => i.key === "HSN_SAC_CODE_MISSING");
  const resolvedRecord = {
    key: "HSN_SAC_CODE_MISSING",
    status: "RESOLVED",
    resolvedSituationSignature: instance.situationSignature,
  };
  const resolved = mergeFlagsWithResolutions(instances, { [instance.instanceId]: resolvedRecord });
  assert.equal(resolved.find((i) => i.instanceId === instance.instanceId).status, "RESOLVED");

  const reopened = mergeFlagsWithResolutions(instances, {
    [instance.instanceId]: { ...resolvedRecord, status: "REOPENED" },
  });
  assert.equal(reopened.find((i) => i.instanceId === instance.instanceId).status, "ACTIVE");
});

check("HSN_SAC_CODE_MISSING and UNUSUAL_TAX_RATE co-occur independently on the same line", () => {
  const instances = evaluateInvoiceFlags(
    { ...LINE_FLAG_BASE, lineItems: [{ id: "l1", hsnSac: "", tax: "CGST + SGST 15%" }] },
    {},
  );
  const keysOnLine = instances.filter((i) => i.instanceId.endsWith(":l1")).map((i) => i.key).sort();
  assert.deepEqual(keysOnLine, ["HSN_SAC_CODE_MISSING", "UNUSUAL_TAX_RATE"]);
});

// ---------------------------------------------------------------------------
console.log("evaluateInvoiceFlags — UNUSUAL_TAX_RATE (per-line)");

check("a standard GST slab rate does not fire", () => {
  const instances = evaluateInvoiceFlags(
    { ...LINE_FLAG_BASE, lineItems: [{ id: "l1", hsnSac: "998314", tax: "CGST + SGST 18%" }] },
    {},
  );
  assert.ok(!instances.some((i) => i.key === "UNUSUAL_TAX_RATE"));
});

check("0% (Exempt) is a recognised slab and does not fire", () => {
  const instances = evaluateInvoiceFlags(
    { ...LINE_FLAG_BASE, lineItems: [{ id: "l1", hsnSac: "998314", tax: "Exempt" }] },
    {},
  );
  assert.ok(!instances.some((i) => i.key === "UNUSUAL_TAX_RATE"));
});

check("an unrecognised rate fires (e.g. 15%, not a real GST slab)", () => {
  const instances = evaluateInvoiceFlags(
    { ...LINE_FLAG_BASE, lineItems: [{ id: "l1", hsnSac: "998314", tax: "CGST + SGST 15%" }] },
    {},
  );
  const unusual = instances.filter((i) => i.key === "UNUSUAL_TAX_RATE");
  assert.equal(unusual.length, 1);
  assert.equal(unusual[0].evidence.effectiveRate, 15);
});

check("two lines with unusual rates produce two independent flags", () => {
  const instances = evaluateInvoiceFlags(
    {
      ...LINE_FLAG_BASE,
      lineItems: [
        { id: "l1", hsnSac: "998314", tax: "CGST + SGST 15%" },
        { id: "l2", hsnSac: "998314", tax: "CGST + SGST 22%" },
      ],
    },
    {},
  );
  const ids = instances.filter((i) => i.key === "UNUSUAL_TAX_RATE").map((i) => i.instanceId).sort();
  assert.deepEqual(ids, ["UNUSUAL_TAX_RATE:l1", "UNUSUAL_TAX_RATE:l2"]);
});

check("fixing one line's rate to a recognised slab clears only that line", () => {
  const instances = evaluateInvoiceFlags(
    {
      ...LINE_FLAG_BASE,
      lineItems: [
        { id: "l1", hsnSac: "998314", tax: "CGST + SGST 18%" },
        { id: "l2", hsnSac: "998314", tax: "CGST + SGST 22%" },
      ],
    },
    {},
  );
  const ids = instances.filter((i) => i.key === "UNUSUAL_TAX_RATE").map((i) => i.instanceId);
  assert.ok(!ids.includes("UNUSUAL_TAX_RATE:l1"));
  assert.ok(ids.includes("UNUSUAL_TAX_RATE:l2"));
});

check("UNUSUAL_TAX_RATE resolve lifecycle reopens when the rate changes to a different unusual value", () => {
  const instances = evaluateInvoiceFlags(
    { ...LINE_FLAG_BASE, lineItems: [{ id: "l1", hsnSac: "998314", tax: "CGST + SGST 15%" }] },
    {},
  );
  const instance = instances.find((i) => i.key === "UNUSUAL_TAX_RATE");
  const resolvedRecord = {
    key: "UNUSUAL_TAX_RATE",
    status: "RESOLVED",
    resolvedSituationSignature: instance.situationSignature,
  };
  const stillResolved = mergeFlagsWithResolutions(instances, { [instance.instanceId]: resolvedRecord });
  assert.equal(stillResolved.find((i) => i.instanceId === instance.instanceId).status, "RESOLVED");

  const changedRate = evaluateInvoiceFlags(
    { ...LINE_FLAG_BASE, lineItems: [{ id: "l1", hsnSac: "998314", tax: "CGST + SGST 22%" }] },
    {},
  );
  const reopened = mergeFlagsWithResolutions(changedRate, { [instance.instanceId]: resolvedRecord });
  assert.equal(reopened.find((i) => i.instanceId === instance.instanceId).status, "ACTIVE");
});

check("removing an unusual-rate line auto-clears its stale flag state", () => {
  const instances = evaluateInvoiceFlags(
    {
      ...LINE_FLAG_BASE,
      lineItems: [
        { id: "l1", hsnSac: "998314", tax: "CGST + SGST 15%" },
        { id: "l2", hsnSac: "998314", tax: "CGST + SGST 18%" },
      ],
    },
    {},
  );
  const instance = instances.find((i) => i.key === "UNUSUAL_TAX_RATE");
  const resolutions = {
    [instance.instanceId]: {
      key: "UNUSUAL_TAX_RATE",
      status: "RESOLVED",
      resolvedSituationSignature: instance.situationSignature,
    },
  };
  const afterRemoval = evaluateInvoiceFlags(
    { ...LINE_FLAG_BASE, lineItems: [{ id: "l2", hsnSac: "998314", tax: "CGST + SGST 18%" }] },
    {},
  );
  const merged = mergeFlagsWithResolutions(afterRemoval, resolutions);
  assert.equal(merged.find((i) => i.instanceId === instance.instanceId).status, "AUTO_CLEARED");
});

// ---------------------------------------------------------------------------
console.log("evaluateInvoiceFlags — LINE_GROUP_BRANCH_UNASSIGNED / EXPENSE_TYPE_UNASSIGNED (per-line, ERP-gated)");

const ERP_LINE_BASE = { lineItemMode: "DETAILED" };

check("ERP enabled + Group/Branch unassigned -> fires", () => {
  const instances = evaluateInvoiceFlags(
    { ...ERP_LINE_BASE, lineItems: [{ id: "l1", groupId: "", accountGroupId: "", expenseType: "Direct Expense" }] },
    { isErpIntegrationEnabled: true },
  );
  assert.ok(instances.some((i) => i.key === "LINE_GROUP_BRANCH_UNASSIGNED"));
});

check("ERP enabled + Group/Branch assigned -> does not fire", () => {
  const instances = evaluateInvoiceFlags(
    { ...ERP_LINE_BASE, lineItems: [{ id: "l1", groupId: "grp-1", expenseType: "Direct Expense" }] },
    { isErpIntegrationEnabled: true },
  );
  assert.ok(!instances.some((i) => i.key === "LINE_GROUP_BRANCH_UNASSIGNED"));
});

check("ERP enabled + accountGroupId alone (without groupId) counts as assigned — mutual fallback", () => {
  const instances = evaluateInvoiceFlags(
    { ...ERP_LINE_BASE, lineItems: [{ id: "l1", accountGroupId: "grp-1", expenseType: "Direct Expense" }] },
    { isErpIntegrationEnabled: true },
  );
  assert.ok(!instances.some((i) => i.key === "LINE_GROUP_BRANCH_UNASSIGNED"));
});

check("ERP enabled + Expense Type unassigned -> fires", () => {
  const instances = evaluateInvoiceFlags(
    { ...ERP_LINE_BASE, lineItems: [{ id: "l1", groupId: "grp-1", expenseType: "" }] },
    { isErpIntegrationEnabled: true },
  );
  assert.ok(instances.some((i) => i.key === "EXPENSE_TYPE_UNASSIGNED"));
});

check("ERP enabled + Expense Type assigned -> does not fire", () => {
  const instances = evaluateInvoiceFlags(
    { ...ERP_LINE_BASE, lineItems: [{ id: "l1", groupId: "grp-1", expenseType: "Indirect Expense" }] },
    { isErpIntegrationEnabled: true },
  );
  assert.ok(!instances.some((i) => i.key === "EXPENSE_TYPE_UNASSIGNED"));
});

check("ERP disabled + both fields empty -> neither flag fires (the critical regression guard)", () => {
  const instances = evaluateInvoiceFlags(
    { ...ERP_LINE_BASE, lineItems: [{ id: "l1", groupId: "", expenseType: "" }] },
    { isErpIntegrationEnabled: false },
  );
  assert.ok(!instances.some((i) => i.key === "LINE_GROUP_BRANCH_UNASSIGNED"));
  assert.ok(!instances.some((i) => i.key === "EXPENSE_TYPE_UNASSIGNED"));
});

check("isErpIntegrationEnabled entirely absent from context -> neither flag fires (fails safe)", () => {
  const instances = evaluateInvoiceFlags(
    { ...ERP_LINE_BASE, lineItems: [{ id: "l1", groupId: "", expenseType: "" }] },
    {},
  );
  assert.ok(!instances.some((i) => i.key === "LINE_GROUP_BRANCH_UNASSIGNED"));
  assert.ok(!instances.some((i) => i.key === "EXPENSE_TYPE_UNASSIGNED"));
});

check("two different lines both unassigned -> independent instances for each flag type", () => {
  const instances = evaluateInvoiceFlags(
    {
      ...ERP_LINE_BASE,
      lineItems: [
        { id: "l1", groupId: "", expenseType: "" },
        { id: "l2", groupId: "", expenseType: "" },
      ],
    },
    { isErpIntegrationEnabled: true },
  );
  assert.equal(instances.filter((i) => i.key === "LINE_GROUP_BRANCH_UNASSIGNED").length, 2);
  assert.equal(instances.filter((i) => i.key === "EXPENSE_TYPE_UNASSIGNED").length, 2);
});

check("fixing one line's assignment clears only that line's flags", () => {
  const instances = evaluateInvoiceFlags(
    {
      ...ERP_LINE_BASE,
      lineItems: [
        { id: "l1", groupId: "grp-1", expenseType: "Direct Expense" },
        { id: "l2", groupId: "", expenseType: "" },
      ],
    },
    { isErpIntegrationEnabled: true },
  );
  const groupIds = instances.filter((i) => i.key === "LINE_GROUP_BRANCH_UNASSIGNED").map((i) => i.instanceId);
  const expenseIds = instances.filter((i) => i.key === "EXPENSE_TYPE_UNASSIGNED").map((i) => i.instanceId);
  assert.ok(!groupIds.includes("LINE_GROUP_BRANCH_UNASSIGNED:l1"));
  assert.ok(groupIds.includes("LINE_GROUP_BRANCH_UNASSIGNED:l2"));
  assert.ok(!expenseIds.includes("EXPENSE_TYPE_UNASSIGNED:l1"));
  assert.ok(expenseIds.includes("EXPENSE_TYPE_UNASSIGNED:l2"));
});

check("LINE_GROUP_BRANCH_UNASSIGNED and EXPENSE_TYPE_UNASSIGNED each support independent resolve/reopen lifecycle", () => {
  const instances = evaluateInvoiceFlags(
    { ...ERP_LINE_BASE, lineItems: [{ id: "l1", groupId: "", expenseType: "" }] },
    { isErpIntegrationEnabled: true },
  );
  const groupInstance = instances.find((i) => i.key === "LINE_GROUP_BRANCH_UNASSIGNED");
  const expenseInstance = instances.find((i) => i.key === "EXPENSE_TYPE_UNASSIGNED");

  const resolutions = {
    [groupInstance.instanceId]: {
      key: "LINE_GROUP_BRANCH_UNASSIGNED",
      status: "RESOLVED",
      resolvedSituationSignature: groupInstance.situationSignature,
    },
  };
  const merged = mergeFlagsWithResolutions(instances, resolutions);
  assert.equal(merged.find((i) => i.instanceId === groupInstance.instanceId).status, "RESOLVED");
  assert.equal(merged.find((i) => i.instanceId === expenseInstance.instanceId).status, "ACTIVE");

  const reopened = mergeFlagsWithResolutions(instances, {
    [groupInstance.instanceId]: { ...resolutions[groupInstance.instanceId], status: "REOPENED" },
  });
  assert.equal(reopened.find((i) => i.instanceId === groupInstance.instanceId).status, "ACTIVE");
});

check("removing a resolved, flagged line auto-clears its stale record for both flags", () => {
  const instances = evaluateInvoiceFlags(
    { ...ERP_LINE_BASE, lineItems: [{ id: "l1", groupId: "", expenseType: "" }] },
    { isErpIntegrationEnabled: true },
  );
  const groupInstance = instances.find((i) => i.key === "LINE_GROUP_BRANCH_UNASSIGNED");
  const expenseInstance = instances.find((i) => i.key === "EXPENSE_TYPE_UNASSIGNED");
  const resolutions = {
    [groupInstance.instanceId]: {
      key: "LINE_GROUP_BRANCH_UNASSIGNED",
      status: "RESOLVED",
      resolvedSituationSignature: groupInstance.situationSignature,
    },
    [expenseInstance.instanceId]: {
      key: "EXPENSE_TYPE_UNASSIGNED",
      status: "RESOLVED",
      resolvedSituationSignature: expenseInstance.situationSignature,
    },
  };
  const afterRemoval = evaluateInvoiceFlags({ ...ERP_LINE_BASE, lineItems: [] }, { isErpIntegrationEnabled: true });
  const merged = mergeFlagsWithResolutions(afterRemoval, resolutions);
  assert.equal(merged.find((i) => i.instanceId === groupInstance.instanceId).status, "AUTO_CLEARED");
  assert.equal(merged.find((i) => i.instanceId === expenseInstance.instanceId).status, "AUTO_CLEARED");
});

check("foreign-currency invoice with ERP enabled still fires — no INR gate for these two flags", () => {
  const instances = evaluateInvoiceFlags(
    { ...ERP_LINE_BASE, currency: "USD", lineItems: [{ id: "l1", groupId: "", expenseType: "" }] },
    { isErpIntegrationEnabled: true },
  );
  assert.ok(instances.some((i) => i.key === "LINE_GROUP_BRANCH_UNASSIGNED"));
  assert.ok(instances.some((i) => i.key === "EXPENSE_TYPE_UNASSIGNED"));
});

check("does not fire in Summary-Only mode even with ERP enabled", () => {
  const instances = evaluateInvoiceFlags(
    { lineItemMode: "SUMMARY_ONLY", lineItems: [{ id: "l1", groupId: "", expenseType: "" }] },
    { isErpIntegrationEnabled: true },
  );
  assert.ok(!instances.some((i) => i.key === "LINE_GROUP_BRANCH_UNASSIGNED"));
  assert.ok(!instances.some((i) => i.key === "EXPENSE_TYPE_UNASSIGNED"));
});

check("co-occurs with HSN_SAC_CODE_MISSING and UNUSUAL_TAX_RATE on the same line", () => {
  const instances = evaluateInvoiceFlags(
    {
      ...ERP_LINE_BASE,
      currency: "INR",
      lineItems: [{ id: "l1", groupId: "", expenseType: "", hsnSac: "", tax: "CGST + SGST 15%" }],
    },
    { isErpIntegrationEnabled: true },
  );
  const keysOnLine = instances.filter((i) => i.instanceId.endsWith(":l1")).map((i) => i.key).sort();
  assert.deepEqual(keysOnLine, [
    "EXPENSE_TYPE_UNASSIGNED",
    "HSN_SAC_CODE_MISSING",
    "LINE_GROUP_BRANCH_UNASSIGNED",
    "UNUSUAL_TAX_RATE",
  ]);
});

check("MSME_VENDOR is unaffected by the new ERP-gated per-line rules", () => {
  const instances = evaluateInvoiceFlags(
    { vendorId: "vendor-1" },
    { selectedVendor: { id: "vendor-1", msme: true } },
  );
  assert.ok(instances.some((i) => i.key === "MSME_VENDOR"));
});

// ---------------------------------------------------------------------------
console.log("evaluateInvoiceFlags — BRANCH_GSTIN_CONFLICT");

const ORG_BRANCHES_FIXTURE = [
  { id: "b1", branchCode: "BLR", branchName: "Bangalore HQ", billingGstin: "29AAAAA0000A1Z5" },
  { id: "b2", branchCode: "MUM", branchName: "Mumbai Branch", billingGstin: "27BBBBB0000B1Z5" },
];

check("does not fire when the selected branch's GSTIN matches its registered GSTIN", () => {
  const instances = evaluateInvoiceFlags(
    { branchCode: "BLR", branchName: "Bangalore HQ", billingGstin: "29AAAAA0000A1Z5" },
    { organisationBranches: ORG_BRANCHES_FIXTURE },
  );
  assert.ok(!instances.some((i) => i.key === "BRANCH_GSTIN_CONFLICT"));
});

check("fires when the selected branch's GSTIN differs from its registered GSTIN", () => {
  const instances = evaluateInvoiceFlags(
    { branchCode: "BLR", branchName: "Bangalore HQ", billingGstin: "27ZZZZZ0000Z1Z9" },
    { organisationBranches: ORG_BRANCHES_FIXTURE },
  );
  assert.ok(instances.some((i) => i.key === "BRANCH_GSTIN_CONFLICT"));
});

check("matches by branch name when branch code isn't set", () => {
  const instances = evaluateInvoiceFlags(
    { branchCode: "", branchName: "Mumbai Branch", billingGstin: "27ZZZZZ0000Z1Z9" },
    { organisationBranches: ORG_BRANCHES_FIXTURE },
  );
  assert.ok(instances.some((i) => i.key === "BRANCH_GSTIN_CONFLICT"));
});

check("does not fire when no org branch is selected", () => {
  const instances = evaluateInvoiceFlags(
    { branchCode: "", branchName: "", billingGstin: "27ZZZZZ0000Z1Z9" },
    { organisationBranches: ORG_BRANCHES_FIXTURE },
  );
  assert.ok(!instances.some((i) => i.key === "BRANCH_GSTIN_CONFLICT"));
});

check("does not false-positive when organisationBranches hasn't loaded yet", () => {
  const instances = evaluateInvoiceFlags(
    { branchCode: "BLR", branchName: "Bangalore HQ", billingGstin: "27ZZZZZ0000Z1Z9" },
    { organisationBranches: undefined },
  );
  assert.ok(!instances.some((i) => i.key === "BRANCH_GSTIN_CONFLICT"));
});

check("does not false-positive for an unmatched/phantom branch not in the registry", () => {
  const instances = evaluateInvoiceFlags(
    { branchCode: "PHANTOM", branchName: "Unregistered Branch", billingGstin: "27ZZZZZ0000Z1Z9" },
    { organisationBranches: ORG_BRANCHES_FIXTURE },
  );
  assert.ok(!instances.some((i) => i.key === "BRANCH_GSTIN_CONFLICT"));
});

check("does not false-positive when the matched branch has no registered GSTIN of its own", () => {
  const instances = evaluateInvoiceFlags(
    { branchCode: "DEL", branchName: "Delhi", billingGstin: "27ZZZZZ0000Z1Z9" },
    { organisationBranches: [{ id: "b3", branchCode: "DEL", branchName: "Delhi", billingGstin: "" }] },
  );
  assert.ok(!instances.some((i) => i.key === "BRANCH_GSTIN_CONFLICT"));
});

check("does not false-positive when formData.billingGstin itself is empty", () => {
  const instances = evaluateInvoiceFlags(
    { branchCode: "BLR", branchName: "Bangalore HQ", billingGstin: "" },
    { organisationBranches: ORG_BRANCHES_FIXTURE },
  );
  assert.ok(!instances.some((i) => i.key === "BRANCH_GSTIN_CONFLICT"));
});

check("BRANCH_GSTIN_CONFLICT lifecycle: resolves, then reopens when the mismatch changes", () => {
  const instances = evaluateInvoiceFlags(
    { branchCode: "BLR", branchName: "Bangalore HQ", billingGstin: "27ZZZZZ0000Z1Z9" },
    { organisationBranches: ORG_BRANCHES_FIXTURE },
  );
  const signature = instances.find((i) => i.key === "BRANCH_GSTIN_CONFLICT").situationSignature;

  const resolved = mergeFlagsWithResolutions(instances, {
    BRANCH_GSTIN_CONFLICT: { status: "RESOLVED", resolvedSituationSignature: signature },
  });
  assert.equal(resolved.find((i) => i.key === "BRANCH_GSTIN_CONFLICT").status, "RESOLVED");

  const changedInstances = evaluateInvoiceFlags(
    { branchCode: "MUM", branchName: "Mumbai Branch", billingGstin: "27ZZZZZ0000Z1Z9" },
    { organisationBranches: ORG_BRANCHES_FIXTURE },
  );
  const reopened = mergeFlagsWithResolutions(changedInstances, {
    BRANCH_GSTIN_CONFLICT: { status: "RESOLVED", resolvedSituationSignature: signature },
  });
  assert.equal(reopened.find((i) => i.key === "BRANCH_GSTIN_CONFLICT").status, "ACTIVE");
});

check("MSME_VENDOR is unaffected by the new organisationBranches context field", () => {
  const instances = evaluateInvoiceFlags(
    { vendorId: "vendor-1" },
    { selectedVendor: { id: "vendor-1", msme: true }, organisationBranches: ORG_BRANCHES_FIXTURE },
  );
  assert.ok(instances.some((i) => i.key === "MSME_VENDOR"));
});

// ---------------------------------------------------------------------------
console.log("evaluateInvoiceFlags — LOW_EXTRACTION_CONFIDENCE");

check("fires when a field's OCR confidence is below the threshold", () => {
  const instances = evaluateInvoiceFlags(
    { extractedSnapshot: { fieldConfidence: { invoiceNumber: 40 } } },
    { aiConfidenceThreshold: 85 },
  );
  const flag = instances.find((i) => i.key === "LOW_EXTRACTION_CONFIDENCE");
  assert.ok(flag);
  assert.deepEqual(flag.evidence.lowConfidenceFields, ["invoiceNumber"]);
});

check("does not fire when every scored field is at or above the threshold", () => {
  const instances = evaluateInvoiceFlags(
    { extractedSnapshot: { fieldConfidence: { invoiceNumber: 92, invoiceDate: 88 } } },
    { aiConfidenceThreshold: 85 },
  );
  assert.ok(!instances.some((i) => i.key === "LOW_EXTRACTION_CONFIDENCE"));
});

check("does not fire when fieldConfidence is empty — today's real-world state, no backend signal yet", () => {
  const instances = evaluateInvoiceFlags(
    { extractedSnapshot: { fieldConfidence: {} } },
    { aiConfidenceThreshold: 85 },
  );
  assert.ok(!instances.some((i) => i.key === "LOW_EXTRACTION_CONFIDENCE"));
});

check("does not fire when there's no extractedSnapshot at all (manually created invoice)", () => {
  const instances = evaluateInvoiceFlags({}, { aiConfidenceThreshold: 85 });
  assert.ok(!instances.some((i) => i.key === "LOW_EXTRACTION_CONFIDENCE"));
});

check("does not fire when the confidence threshold itself is unavailable", () => {
  const instances = evaluateInvoiceFlags(
    { extractedSnapshot: { fieldConfidence: { invoiceNumber: 10 } } },
    { aiConfidenceThreshold: undefined },
  );
  assert.ok(!instances.some((i) => i.key === "LOW_EXTRACTION_CONFIDENCE"));
});

check("lists every low-confidence field on one single flag instance, not one per field", () => {
  const instances = evaluateInvoiceFlags(
    { extractedSnapshot: { fieldConfidence: { invoiceNumber: 40, invoiceDate: 50, gstin: 92 } } },
    { aiConfidenceThreshold: 85 },
  );
  const lowConfidenceInstances = instances.filter((i) => i.key === "LOW_EXTRACTION_CONFIDENCE");
  assert.equal(lowConfidenceInstances.length, 1);
  assert.deepEqual(lowConfidenceInstances[0].evidence.lowConfidenceFields, ["invoiceDate", "invoiceNumber"]);
});

check("LOW_EXTRACTION_CONFIDENCE lifecycle: resolves, then reopens once the set of low-confidence fields changes (e.g. a re-scan)", () => {
  const instances = evaluateInvoiceFlags(
    { extractedSnapshot: { fieldConfidence: { invoiceNumber: 40 } } },
    { aiConfidenceThreshold: 85 },
  );
  const signature = instances.find((i) => i.key === "LOW_EXTRACTION_CONFIDENCE").situationSignature;

  const resolved = mergeFlagsWithResolutions(instances, {
    LOW_EXTRACTION_CONFIDENCE: { status: "RESOLVED", resolvedSituationSignature: signature },
  });
  assert.equal(resolved.find((i) => i.key === "LOW_EXTRACTION_CONFIDENCE").status, "RESOLVED");

  const rescanned = evaluateInvoiceFlags(
    { extractedSnapshot: { fieldConfidence: { invoiceDate: 30 } } },
    { aiConfidenceThreshold: 85 },
  );
  const reopened = mergeFlagsWithResolutions(rescanned, {
    LOW_EXTRACTION_CONFIDENCE: { status: "RESOLVED", resolvedSituationSignature: signature },
  });
  assert.equal(reopened.find((i) => i.key === "LOW_EXTRACTION_CONFIDENCE").status, "ACTIVE");
});

check("co-occurs with GSTIN_MISMATCH independently, since they read entirely different data", () => {
  const instances = evaluateInvoiceFlags(
    {
      billingGstin: "27ZZZZZ0000Z1Z9",
      extractedSnapshot: { fieldConfidence: { invoiceNumber: 40 } },
    },
    { organisationGstins: ["27ABCDE1234F1Z5"], aiConfidenceThreshold: 85 },
  );
  assert.ok(instances.some((i) => i.key === "GSTIN_MISMATCH"));
  assert.ok(instances.some((i) => i.key === "LOW_EXTRACTION_CONFIDENCE"));
});

// ---------------------------------------------------------------------------
console.log("evaluateInvoiceFlags — MSME_CREDIT_PERIOD_EXCEEDED");

check("fires when an MSME vendor's due date exceeds the 45-day limit", () => {
  const instances = evaluateInvoiceFlags(
    { vendorId: "vendor-1", invoiceDate: "2026-01-01", dueDate: "2026-03-01" },
    { selectedVendor: { id: "vendor-1", msme: true } },
  );
  const flag = instances.find((i) => i.key === "MSME_CREDIT_PERIOD_EXCEEDED");
  assert.ok(flag);
  assert.equal(flag.evidence.maxDueDate, "2026-02-15");
});

check("does not fire when the due date is within the 45-day limit", () => {
  const instances = evaluateInvoiceFlags(
    { vendorId: "vendor-1", invoiceDate: "2026-01-01", dueDate: "2026-02-01" },
    { selectedVendor: { id: "vendor-1", msme: true } },
  );
  assert.ok(!instances.some((i) => i.key === "MSME_CREDIT_PERIOD_EXCEEDED"));
});

check("does not fire exactly on the 45-day boundary", () => {
  const instances = evaluateInvoiceFlags(
    { vendorId: "vendor-1", invoiceDate: "2026-01-01", dueDate: "2026-02-15" },
    { selectedVendor: { id: "vendor-1", msme: true } },
  );
  assert.ok(!instances.some((i) => i.key === "MSME_CREDIT_PERIOD_EXCEEDED"));
});

check("does not fire when the vendor isn't MSME", () => {
  const instances = evaluateInvoiceFlags(
    { vendorId: "vendor-1", invoiceDate: "2026-01-01", dueDate: "2026-03-01" },
    { selectedVendor: { id: "vendor-1", msme: false } },
  );
  assert.ok(!instances.some((i) => i.key === "MSME_CREDIT_PERIOD_EXCEEDED"));
});

check("does not fire when dueDate or invoiceDate is missing", () => {
  const instances = evaluateInvoiceFlags(
    { vendorId: "vendor-1", invoiceDate: "2026-01-01", dueDate: "" },
    { selectedVendor: { id: "vendor-1", msme: true } },
  );
  assert.ok(!instances.some((i) => i.key === "MSME_CREDIT_PERIOD_EXCEEDED"));
});

check("co-occurs with MSME_VENDOR — independent conditions", () => {
  const instances = evaluateInvoiceFlags(
    { vendorId: "vendor-1", invoiceDate: "2026-01-01", dueDate: "2026-03-01" },
    { selectedVendor: { id: "vendor-1", msme: true } },
  );
  assert.ok(instances.some((i) => i.key === "MSME_VENDOR"));
  assert.ok(instances.some((i) => i.key === "MSME_CREDIT_PERIOD_EXCEEDED"));
});

check("MSME_CREDIT_PERIOD_EXCEEDED lifecycle: resolves, then reopens once the due date changes to a different violation", () => {
  const instances = evaluateInvoiceFlags(
    { vendorId: "vendor-1", invoiceDate: "2026-01-01", dueDate: "2026-03-01" },
    { selectedVendor: { id: "vendor-1", msme: true } },
  );
  const signature = instances.find((i) => i.key === "MSME_CREDIT_PERIOD_EXCEEDED").situationSignature;

  const resolved = mergeFlagsWithResolutions(instances, {
    MSME_CREDIT_PERIOD_EXCEEDED: { status: "RESOLVED", resolvedSituationSignature: signature },
  });
  assert.equal(resolved.find((i) => i.key === "MSME_CREDIT_PERIOD_EXCEEDED").status, "RESOLVED");

  const changedInstances = evaluateInvoiceFlags(
    { vendorId: "vendor-1", invoiceDate: "2026-01-01", dueDate: "2026-04-01" },
    { selectedVendor: { id: "vendor-1", msme: true } },
  );
  const reopened = mergeFlagsWithResolutions(changedInstances, {
    MSME_CREDIT_PERIOD_EXCEEDED: { status: "RESOLVED", resolvedSituationSignature: signature },
  });
  assert.equal(reopened.find((i) => i.key === "MSME_CREDIT_PERIOD_EXCEEDED").status, "ACTIVE");
});

// ---------------------------------------------------------------------------
console.log("evaluateInvoiceFlags — VENDOR_INACTIVE");

check("fires when the vendor detail's status is Inactive", () => {
  const instances = evaluateInvoiceFlags(
    { vendorId: "vendor-1" },
    { selectedVendorDetail: { id: "vendor-1", vendorStatus: "Inactive" } },
  );
  assert.ok(instances.some((i) => i.key === "VENDOR_INACTIVE"));
});

check("does not fire when the vendor is Active", () => {
  const instances = evaluateInvoiceFlags(
    { vendorId: "vendor-1" },
    { selectedVendorDetail: { id: "vendor-1", vendorStatus: "Active" } },
  );
  assert.ok(!instances.some((i) => i.key === "VENDOR_INACTIVE"));
});

check("does not false-positive when vendor detail is unavailable/loading", () => {
  const instances = evaluateInvoiceFlags({ vendorId: "vendor-1" }, { selectedVendorDetail: null });
  assert.ok(!instances.some((i) => i.key === "VENDOR_INACTIVE"));
});

check("does not false-positive when vendorStatus is empty/unset", () => {
  const instances = evaluateInvoiceFlags(
    { vendorId: "vendor-1" },
    { selectedVendorDetail: { id: "vendor-1", vendorStatus: "" } },
  );
  assert.ok(!instances.some((i) => i.key === "VENDOR_INACTIVE"));
});

check("switching to a different vendor changes the outcome", () => {
  const formData = { vendorId: "vendor-2" };
  const inactiveVendor = evaluateInvoiceFlags(formData, {
    selectedVendorDetail: { id: "vendor-2", vendorStatus: "Inactive" },
  });
  const activeVendor = evaluateInvoiceFlags(formData, {
    selectedVendorDetail: { id: "vendor-2", vendorStatus: "Active" },
  });
  assert.ok(inactiveVendor.some((i) => i.key === "VENDOR_INACTIVE"));
  assert.ok(!activeVendor.some((i) => i.key === "VENDOR_INACTIVE"));
});

check("MSME_VENDOR is unaffected by VENDOR_INACTIVE sharing the same evaluator", () => {
  const instances = evaluateInvoiceFlags(
    { vendorId: "vendor-1" },
    {
      selectedVendor: { id: "vendor-1", msme: true },
      selectedVendorDetail: { id: "vendor-1", vendorStatus: "Inactive" },
    },
  );
  assert.ok(instances.some((i) => i.key === "MSME_VENDOR"));
  assert.ok(instances.some((i) => i.key === "VENDOR_INACTIVE"));
});

check("VENDOR_INACTIVE lifecycle: resolves, then reopens once a different vendor is also inactive", () => {
  const instances = evaluateInvoiceFlags(
    { vendorId: "vendor-1" },
    { selectedVendorDetail: { id: "vendor-1", vendorStatus: "Inactive" } },
  );
  const signature = instances.find((i) => i.key === "VENDOR_INACTIVE").situationSignature;

  const resolved = mergeFlagsWithResolutions(instances, {
    VENDOR_INACTIVE: { status: "RESOLVED", resolvedSituationSignature: signature },
  });
  assert.equal(resolved.find((i) => i.key === "VENDOR_INACTIVE").status, "RESOLVED");

  const switchedVendor = evaluateInvoiceFlags(
    { vendorId: "vendor-3" },
    { selectedVendorDetail: { id: "vendor-3", vendorStatus: "Inactive" } },
  );
  const reopened = mergeFlagsWithResolutions(switchedVendor, {
    VENDOR_INACTIVE: { status: "RESOLVED", resolvedSituationSignature: signature },
  });
  assert.equal(reopened.find((i) => i.key === "VENDOR_INACTIVE").status, "ACTIVE");
});

// ---------------------------------------------------------------------------
console.log("evaluateInvoiceFlags — VENDOR_MISMATCH");

check("fires when the extracted vendor name doesn't match the selected vendor", () => {
  const instances = evaluateInvoiceFlags(
    {
      vendorName: "Acme Corp",
      gstin: "27AAAAA0000A1Z5",
      extractedSnapshot: { vendorName: "Beta Industries", vendorGstin: "27AAAAA0000A1Z5" },
    },
    {},
  );
  assert.ok(instances.some((i) => i.key === "VENDOR_MISMATCH"));
});

check("fires when the extracted vendor GSTIN doesn't match the selected vendor's GSTIN", () => {
  const instances = evaluateInvoiceFlags(
    {
      vendorName: "Acme Corp",
      gstin: "27AAAAA0000A1Z5",
      extractedSnapshot: { vendorName: "Acme Corp", vendorGstin: "27ZZZZZ0000Z1Z9" },
    },
    {},
  );
  assert.ok(instances.some((i) => i.key === "VENDOR_MISMATCH"));
});

check("does not fire when name and GSTIN both match (name compared loosely)", () => {
  const instances = evaluateInvoiceFlags(
    {
      vendorName: "Acme Corp.",
      gstin: "27AAAAA0000A1Z5",
      extractedSnapshot: { vendorName: "Acme Corp", vendorGstin: "27AAAAA0000A1Z5" },
    },
    {},
  );
  assert.ok(!instances.some((i) => i.key === "VENDOR_MISMATCH"));
});

check("does not fire when there's no extractedSnapshot (manually created invoice)", () => {
  const instances = evaluateInvoiceFlags(
    { vendorName: "Acme Corp", gstin: "27AAAAA0000A1Z5" },
    {},
  );
  assert.ok(!instances.some((i) => i.key === "VENDOR_MISMATCH"));
});

check("does not fire when the current vendor name/GSTIN are empty (Required Details Missing's job instead)", () => {
  const instances = evaluateInvoiceFlags(
    { vendorName: "", gstin: "", extractedSnapshot: { vendorName: "Beta Industries", vendorGstin: "27ZZZZZ0000Z1Z9" } },
    {},
  );
  assert.ok(!instances.some((i) => i.key === "VENDOR_MISMATCH"));
});

check("is suppressed by VENDOR_SWITCHED_AFTER_EXTRACTION when that more specific flag also fires", () => {
  const instances = evaluateInvoiceFlags(
    {
      vendorId: "vendor-current",
      vendorName: "Acme Corp",
      gstin: "27AAAAA0000A1Z5",
      extractedSnapshot: {
        vendorId: "vendor-extracted",
        vendorName: "Beta Industries",
        vendorGstin: "27ZZZZZ0000Z1Z9",
      },
    },
    {},
  );
  assert.ok(instances.some((i) => i.key === "VENDOR_SWITCHED_AFTER_EXTRACTION"));
  assert.ok(!instances.some((i) => i.key === "VENDOR_MISMATCH"));
});

check("co-occurs with VENDOR_GSTIN_CHANGED_AFTER_EXTRACTION (same vendor, GSTIN-only divergence — not suppressed)", () => {
  const instances = evaluateInvoiceFlags(
    {
      vendorId: "vendor-1",
      vendorName: "Acme Corp",
      gstin: "27AAAAA0000A1Z5",
      extractedSnapshot: {
        vendorId: "vendor-1",
        vendorName: "Acme Corp",
        vendorGstin: "27ZZZZZ0000Z1Z9",
      },
    },
    { aiConfidenceThreshold: 85 },
  );
  assert.ok(instances.some((i) => i.key === "VENDOR_GSTIN_CHANGED_AFTER_EXTRACTION"));
  assert.ok(instances.some((i) => i.key === "VENDOR_MISMATCH"));
});

check("VENDOR_MISMATCH lifecycle: resolves, then reopens once the mismatch changes", () => {
  const instances = evaluateInvoiceFlags(
    {
      vendorName: "Acme Corp",
      gstin: "27AAAAA0000A1Z5",
      extractedSnapshot: { vendorName: "Beta Industries", vendorGstin: "27AAAAA0000A1Z5" },
    },
    {},
  );
  const signature = instances.find((i) => i.key === "VENDOR_MISMATCH").situationSignature;

  const resolved = mergeFlagsWithResolutions(instances, {
    VENDOR_MISMATCH: { status: "RESOLVED", resolvedSituationSignature: signature },
  });
  assert.equal(resolved.find((i) => i.key === "VENDOR_MISMATCH").status, "RESOLVED");

  const changedInstances = evaluateInvoiceFlags(
    {
      vendorName: "Acme Corp",
      gstin: "27AAAAA0000A1Z5",
      extractedSnapshot: { vendorName: "Gamma Traders", vendorGstin: "27AAAAA0000A1Z5" },
    },
    {},
  );
  const reopened = mergeFlagsWithResolutions(changedInstances, {
    VENDOR_MISMATCH: { status: "RESOLVED", resolvedSituationSignature: signature },
  });
  assert.equal(reopened.find((i) => i.key === "VENDOR_MISMATCH").status, "ACTIVE");
});

// ---------------------------------------------------------------------------
console.log("mergeFlagsWithResolutions — lifecycle branches");

check("firing + no record -> ACTIVE", () => {
  const merged = mergeFlagsWithResolutions(
    [{ key: "GSTIN_MISMATCH", instanceId: "GSTIN_MISMATCH", situationSignature: { a: 1 } }],
    {},
  );
  assert.equal(merged[0].status, "ACTIVE");
});

check("not firing + RESOLVED record -> AUTO_CLEARED", () => {
  const merged = mergeFlagsWithResolutions(
    [],
    { GSTIN_MISMATCH: { status: "RESOLVED", resolvedSituationSignature: { a: 1 } } },
  );
  assert.equal(merged[0].status, "AUTO_CLEARED");
});

check("firing + RESOLVED, same signature -> stays RESOLVED", () => {
  const merged = mergeFlagsWithResolutions(
    [{ key: "GSTIN_MISMATCH", instanceId: "GSTIN_MISMATCH", situationSignature: { a: 1 } }],
    { GSTIN_MISMATCH: { status: "RESOLVED", resolvedSituationSignature: { a: 1 } } },
  );
  assert.equal(merged[0].status, "RESOLVED");
});

check("firing + RESOLVED, different signature -> REOPENS (back to ACTIVE)", () => {
  const merged = mergeFlagsWithResolutions(
    [{ key: "GSTIN_MISMATCH", instanceId: "GSTIN_MISMATCH", situationSignature: { a: 2 } }],
    { GSTIN_MISMATCH: { status: "RESOLVED", resolvedSituationSignature: { a: 1 } } },
  );
  assert.equal(merged[0].status, "ACTIVE");
  assert.equal(merged[0].record, null);
});

check("firing + REOPENED (reviewer-forced) -> stays ACTIVE regardless of signature", () => {
  const merged = mergeFlagsWithResolutions(
    [{ key: "GSTIN_MISMATCH", instanceId: "GSTIN_MISMATCH", situationSignature: { a: 1 } }],
    { GSTIN_MISMATCH: { status: "REOPENED", resolvedSituationSignature: { a: 1 } } },
  );
  assert.equal(merged[0].status, "ACTIVE");
});

// ---------------------------------------------------------------------------
console.log("buildInvoiceEditFormData — flagResolutions hydration (reviewer round-trip, Slice 0)");

// Exercises the real, exported buildInvoiceEditFormData directly — the same
// function InvoicesPage.jsx (maker re-edit) and useApprovalsInvoiceEdit.jsx
// (checker/approver review) both call to hydrate formData from a fetched
// invoice — not a reimplementation of its logic. Simulates the raw shape
// normalizeInvoiceResponse (Services/utils/invoiceMappers.js) would hand it:
// a plain invoice object already carrying flagResolutions.

check("flagResolutions survives buildInvoiceEditFormData hydration unchanged", () => {
  const rawResolutions = {
    GSTIN_MISMATCH: {
      key: "GSTIN_MISMATCH",
      status: "RESOLVED",
      reason: "Confirmed with finance this GSTIN is correct.",
      resolvedBy: { id: "user-1", name: "Priya" },
      resolvedAt: "2026-08-01T10:00:00.000Z",
      resolvedSituationSignature: { billingGstin: "27ZZZZZ0000Z1Z9" },
      reopenedBy: null,
      reopenedAt: null,
      reopenReason: null,
      history: [],
    },
  };
  const formData = buildInvoiceEditFormData(
    { billingGstin: "27ZZZZZ0000Z1Z9", flagResolutions: rawResolutions },
    {},
  );
  assert.deepEqual(formData.flagResolutions, rawResolutions);
});

check("a still-firing flag resolved by the maker remains RESOLVED after hydration (full path: raw invoice -> buildInvoiceEditFormData -> evaluateInvoiceFlags -> mergeFlagsWithResolutions)", () => {
  const invoice = {
    billingGstin: "27ZZZZZ0000Z1Z9", // still an org-GSTIN mismatch — condition still true
    flagResolutions: {
      GSTIN_MISMATCH: {
        key: "GSTIN_MISMATCH",
        status: "RESOLVED",
        reason: "Confirmed with finance this GSTIN is correct.",
        resolvedBy: { id: "user-1", name: "Priya" },
        resolvedAt: "2026-08-01T10:00:00.000Z",
        resolvedSituationSignature: { billingGstin: "27ZZZZZ0000Z1Z9" },
      },
    },
  };
  const formData = buildInvoiceEditFormData(invoice, {});
  const instances = evaluateInvoiceFlags(formData, { organisationGstins: ["27ABCDE1234F1Z5"] });
  assert.ok(instances.some((i) => i.key === "GSTIN_MISMATCH")); // condition genuinely still firing
  const merged = mergeFlagsWithResolutions(instances, formData.flagResolutions);
  assert.equal(merged.find((i) => i.key === "GSTIN_MISMATCH").status, "RESOLVED");
  assert.equal(merged.find((i) => i.key === "GSTIN_MISMATCH").record.resolvedBy.name, "Priya");
});

check("a previously resolved flag whose condition no longer fires auto-clears correctly after hydration", () => {
  const invoice = {
    billingGstin: "27ABCDE1234F1Z5", // now a registered org GSTIN — condition genuinely gone
    flagResolutions: {
      GSTIN_MISMATCH: {
        key: "GSTIN_MISMATCH",
        status: "RESOLVED",
        reason: "Confirmed with finance this GSTIN is correct.",
        resolvedBy: { id: "user-1", name: "Priya" },
        resolvedAt: "2026-08-01T10:00:00.000Z",
        resolvedSituationSignature: { billingGstin: "27ZZZZZ0000Z1Z9" },
      },
    },
  };
  const formData = buildInvoiceEditFormData(invoice, {});
  const instances = evaluateInvoiceFlags(formData, { organisationGstins: ["27ABCDE1234F1Z5"] });
  assert.ok(!instances.some((i) => i.key === "GSTIN_MISMATCH")); // condition genuinely no longer firing
  const merged = mergeFlagsWithResolutions(instances, formData.flagResolutions);
  const gstinEntry = merged.find((i) => i.key === "GSTIN_MISMATCH");
  assert.ok(gstinEntry);
  assert.equal(gstinEntry.status, "AUTO_CLEARED");
});

check("an invoice with no flagResolutions at all hydrates to an empty object, not undefined", () => {
  const formData = buildInvoiceEditFormData({ billingGstin: "27ABCDE1234F1Z5" }, {});
  assert.deepEqual(formData.flagResolutions, {});
});

// ---------------------------------------------------------------------------
console.log("extractedSnapshot round trip (P1 backend-handoff slice) — outbound payload construction");

// Exercises the real, exported buildInvoiceApiPayload directly — the same
// function invoicesVendorsApi.js's createInvoice AND updateInvoice both call
// (via the toInvoiceApiPayload alias) to build the request body sent to the
// backend. One function, one fix, both directions — proven below by
// asserting the aliases are the exact same function reference, not separate
// reimplementations that could drift.

check("buildCreateInvoiceRequestBody and toInvoiceApiPayload are the exact same function as buildInvoiceApiPayload (create and update share one outbound fix, not two)", () => {
  assert.equal(buildCreateInvoiceRequestBody, buildInvoiceApiPayload);
  assert.equal(toInvoiceApiPayload, buildInvoiceApiPayload);
});

check("extractedSnapshot survives buildInvoiceApiPayload (outbound create/update payload) unchanged", () => {
  const extractedSnapshot = {
    invoiceNumber: "INV-001",
    invoiceDate: "2026-08-01",
    total: 1000,
    taxAmount: 180,
    fieldConfidence: { invoiceNumber: 92 },
  };
  const payload = buildInvoiceApiPayload({ extractedSnapshot }, {});
  assert.deepEqual(payload.extractedSnapshot, extractedSnapshot);
});

check("buildInvoiceApiPayload defaults extractedSnapshot to null (not undefined/{}) when the form has none, matching the manual-invoice convention", () => {
  const payload = buildInvoiceApiPayload({}, {});
  assert.equal(payload.extractedSnapshot, null);
});

// ---------------------------------------------------------------------------
console.log("extractedSnapshot round trip (P1 backend-handoff slice) — inbound response normalization");

// Exercises normalizeInvoiceResponse directly — the transformResponse wired
// to invoicesVendorsApi.js's getInvoice query.

check("extractedSnapshot survives normalizeInvoiceResponse (inbound GET /invoices/:id) unchanged", () => {
  const extractedSnapshot = {
    invoiceNumber: "INV-001",
    invoiceDate: "2026-08-01",
    total: 1000,
    taxAmount: 180,
  };
  const normalized = normalizeInvoiceResponse({ extractedSnapshot });
  assert.deepEqual(normalized.extractedSnapshot, extractedSnapshot);
});

check("normalizeInvoiceResponse also accepts the snake_case alias extracted_snapshot, same as flagResolutions/flag_resolutions", () => {
  const extractedSnapshot = { invoiceNumber: "INV-001", total: 1000 };
  const normalized = normalizeInvoiceResponse({ extracted_snapshot: extractedSnapshot });
  assert.deepEqual(normalized.extractedSnapshot, extractedSnapshot);
});

check("normalizeInvoiceResponse defaults extractedSnapshot to null for an old invoice the backend returns with no snapshot at all", () => {
  const normalized = normalizeInvoiceResponse({});
  assert.equal(normalized.extractedSnapshot, null);
});

// ---------------------------------------------------------------------------
console.log("extractedSnapshot round trip (P1 backend-handoff slice) — edit hydration (buildInvoiceEditFormData)");

check("extractedSnapshot survives buildInvoiceEditFormData hydration unchanged", () => {
  const extractedSnapshot = {
    invoiceNumber: "INV-001",
    invoiceDate: "2026-08-01",
    total: 1000,
    taxAmount: 180,
    fieldConfidence: { invoiceNumber: 92 },
  };
  const formData = buildInvoiceEditFormData({ billingGstin: "27ZZZZZ0000Z1Z9", extractedSnapshot }, {});
  assert.deepEqual(formData.extractedSnapshot, extractedSnapshot);
});

check("an invoice with no extractedSnapshot at all hydrates to null, not undefined or {}", () => {
  const formData = buildInvoiceEditFormData({ billingGstin: "27ABCDE1234F1Z5" }, {});
  assert.equal(formData.extractedSnapshot, null);
});

// ---------------------------------------------------------------------------
console.log("extractedSnapshot round trip (P1 backend-handoff slice) — end-to-end reloaded-invoice flag evaluation");

// The actual bug being fixed: before this slice, a *freshly-scanned* upload
// could trigger these flags (extractedSnapshot came straight from
// initializeInvoiceFormData), but a *saved-then-reloaded* invoice could not
// (buildInvoiceEditFormData silently dropped extractedSnapshot on the way
// back in). This simulates the real reload path end to end: a raw invoice
// object shaped like normalizeInvoiceResponse would hand it to the caller ->
// buildInvoiceEditFormData -> evaluateInvoiceFlags, with NO manual
// formData.extractedSnapshot assignment anywhere in the test itself.

check("a saved/reloaded invoice can still trigger FORM_TOTAL_DIFFERS_FROM_DOCUMENT and TAX_CHANGED_AFTER_EXTRACTION after buildInvoiceEditFormData hydration", () => {
  const rawInvoiceFromBackend = {
    vendorName: "Acme Corp",
    vendorId: "vendor-1",
    gstin: "27XYZAB1234F1Z9",
    gstTreatment: "Regular",
    invoiceNumber: "INV-001",
    invoiceDate: "2026-08-01",
    currency: "INR",
    documentType: "TAX_INVOICE",
    taxesLevel: "At Invoice Level",
    invoiceTax: "CGST + SGST 18%",
    lineItems: [{ description: "Item 1", quantity: 1, unitRate: 1000 }],
    // document said 1000, no tax — but the line item + 18% tax now computes
    // to 1180 (this is the divergence introduced after the initial scan,
    // e.g. by a later line-item edit that was itself saved).
    extractedSnapshot: { invoiceDate: "2026-08-01", total: 1000, taxAmount: 0 },
  };

  const formData = buildInvoiceEditFormData(rawInvoiceFromBackend, {});
  assert.deepEqual(
    formData.extractedSnapshot,
    rawInvoiceFromBackend.extractedSnapshot,
    "sanity: hydration carried the baseline through unchanged",
  );

  const instances = evaluateInvoiceFlags(formData, { checklistOptions: {} });
  assert.ok(
    keysOf(instances).includes("FORM_TOTAL_DIFFERS_FROM_DOCUMENT"),
    "FORM_TOTAL_DIFFERS_FROM_DOCUMENT must fire post-reload, not just on the original scan session",
  );
  assert.ok(
    keysOf(instances).includes("TAX_CHANGED_AFTER_EXTRACTION"),
    "TAX_CHANGED_AFTER_EXTRACTION must fire post-reload, not just on the original scan session",
  );
});

const EXTRACTED_SNAPSHOT_DEPENDENT_FLAG_KEYS = [
  "INVOICE_NUMBER_CHANGED_AFTER_EXTRACTION",
  "BILLING_DATE_CHANGED_AFTER_EXTRACTION",
  "ORGANISATION_GSTIN_CHANGED_AFTER_EXTRACTION",
  "VENDOR_GSTIN_CHANGED_AFTER_EXTRACTION",
  "DOCUMENT_TYPE_CHANGED_AFTER_EXTRACTION",
  "BILLING_ADDRESS_CHANGED_AFTER_EXTRACTION",
  "SHIPPING_ADDRESS_CHANGED_AFTER_EXTRACTION",
  "CURRENCY_CHANGED_AFTER_EXTRACTION",
  "VENDOR_SWITCHED_AFTER_EXTRACTION",
  "TAX_CHANGED_AFTER_EXTRACTION",
  "FORM_TOTAL_DIFFERS_FROM_DOCUMENT",
  "VENDOR_MISMATCH",
  "DUPLICATE_AVOIDED_BY_EDIT",
  "BILLING_ADDRESS_DIFFERS_FROM_DOCUMENT",
  "DOCUMENT_TYPE_MISMATCH",
  "LOW_EXTRACTION_CONFIDENCE",
];

check("an old invoice with no extractedSnapshot at all hydrates safely and none of the 16 extractedSnapshot-dependent flags fire or throw", () => {
  const oldInvoiceFromBackend = {
    vendorName: "Acme Corp",
    vendorId: "vendor-1",
    gstin: "27XYZAB1234F1Z9",
    invoiceNumber: "INV-002",
    invoiceDate: "2026-08-01",
    currency: "INR",
    documentType: "TAX_INVOICE",
    taxesLevel: "At Invoice Level",
    invoiceTax: "CGST + SGST 18%",
    lineItems: [{ description: "Item 1", quantity: 1, unitRate: 1000 }],
    // no extractedSnapshot key at all — an invoice saved before this field existed
  };
  const formData = buildInvoiceEditFormData(oldInvoiceFromBackend, {});
  assert.equal(formData.extractedSnapshot, null);

  let instances;
  assert.doesNotThrow(() => {
    instances = evaluateInvoiceFlags(formData, { checklistOptions: {}, aiConfidenceThreshold: 85 });
  });
  EXTRACTED_SNAPSHOT_DEPENDENT_FLAG_KEYS.forEach((key) => {
    assert.ok(!keysOf(instances).includes(key), `${key} must not fire with no extraction baseline at all`);
  });
});

check("a partial extractedSnapshot (only fieldConfidence populated, every other field absent) hydrates safely, does not crash any other extractedSnapshot-dependent rule, and LOW_EXTRACTION_CONFIDENCE still receives it", () => {
  const rawInvoiceFromBackend = {
    vendorName: "Acme Corp",
    vendorId: "vendor-1",
    gstin: "27XYZAB1234F1Z9",
    invoiceNumber: "INV-003",
    invoiceDate: "2026-08-01",
    currency: "INR",
    documentType: "TAX_INVOICE",
    taxesLevel: "At Invoice Level",
    invoiceTax: "CGST + SGST 18%",
    lineItems: [{ description: "Item 1", quantity: 1, unitRate: 1000 }],
    // partial snapshot: the extraction service scored one field's confidence
    // but (per docs/invoice-flags-api-contract.md) doesn't populate any of
    // the actual baseline values yet — a realistic near-term backend shape.
    extractedSnapshot: { fieldConfidence: { invoiceNumber: 40 } },
  };
  const formData = buildInvoiceEditFormData(rawInvoiceFromBackend, {});
  assert.deepEqual(formData.extractedSnapshot, { fieldConfidence: { invoiceNumber: 40 } });

  let instances;
  assert.doesNotThrow(() => {
    instances = evaluateInvoiceFlags(formData, { checklistOptions: {}, aiConfidenceThreshold: 85 });
  });
  assert.ok(
    keysOf(instances).includes("LOW_EXTRACTION_CONFIDENCE"),
    "LOW_EXTRACTION_CONFIDENCE should fire off the partial fieldConfidence alone, with no other snapshot fields present",
  );
  // Every other extractedSnapshot-dependent rule reads a specific field
  // (invoiceNumber/total/vendorName/...) off the snapshot, all absent here —
  // each must stay silent rather than misfire on missing data.
  EXTRACTED_SNAPSHOT_DEPENDENT_FLAG_KEYS.filter((key) => key !== "LOW_EXTRACTION_CONFIDENCE").forEach((key) => {
    assert.ok(!keysOf(instances).includes(key), `${key} must not fire off a snapshot that has no value for its own field`);
  });
});

// ---------------------------------------------------------------------------
console.log("reopen lifecycle mechanics (via the real mergeFlagsWithResolutions — reopenFlag itself is a React useCallback, not independently unit-testable here)");

const TWO_RESOLVED_HSN_LINES = {
  currency: "INR",
  lineItemMode: "DETAILED",
  lineItems: [
    { id: "line-a", description: "Item A", hsnSac: "", tax: "CGST + SGST 18%" },
    { id: "line-b", description: "Item B", hsnSac: "", tax: "CGST + SGST 18%" },
  ],
};

check("reviewer can reopen a currently firing RESOLVED flag — the record transitions back to ACTIVE", () => {
  const instances = evaluateInvoiceFlags(
    { billingGstin: "27ZZZZZ0000Z1Z9" },
    { organisationGstins: ["27ABCDE1234F1Z5"] },
  );
  const signature = instances.find((i) => i.key === "GSTIN_MISMATCH").situationSignature;
  // What reopenFlag itself writes once its guard passes.
  const reopened = mergeFlagsWithResolutions(instances, {
    GSTIN_MISMATCH: { status: "REOPENED", resolvedSituationSignature: signature },
  });
  assert.equal(reopened.find((i) => i.key === "GSTIN_MISMATCH").status, "ACTIVE");
});

check("reopening uses the exact instanceId — two resolved per-line instances never collide", () => {
  const instances = evaluateInvoiceFlags(TWO_RESOLVED_HSN_LINES, {});
  const resolutions = {
    "HSN_SAC_CODE_MISSING:line-a": {
      key: "HSN_SAC_CODE_MISSING",
      status: "RESOLVED",
      resolvedSituationSignature: instances.find((i) => i.instanceId === "HSN_SAC_CODE_MISSING:line-a").situationSignature,
    },
    "HSN_SAC_CODE_MISSING:line-b": {
      key: "HSN_SAC_CODE_MISSING",
      status: "RESOLVED",
      resolvedSituationSignature: instances.find((i) => i.instanceId === "HSN_SAC_CODE_MISSING:line-b").situationSignature,
    },
  };
  // Reopen only line-a's instanceId — line-b's record is untouched.
  const afterReopeningLineAOnly = {
    ...resolutions,
    "HSN_SAC_CODE_MISSING:line-a": { ...resolutions["HSN_SAC_CODE_MISSING:line-a"], status: "REOPENED" },
  };
  const merged = mergeFlagsWithResolutions(instances, afterReopeningLineAOnly);
  assert.equal(merged.find((i) => i.instanceId === "HSN_SAC_CODE_MISSING:line-a").status, "ACTIVE");
  assert.equal(merged.find((i) => i.instanceId === "HSN_SAC_CODE_MISSING:line-b").status, "RESOLVED");
});

check("a REOPENED record for an instance that is no longer evaluated (e.g. already auto-cleared) becomes orphaned — proves why reopenFlag's defensive guard refuses this before it can happen", () => {
  // Simulates writing a REOPENED record for GSTIN_MISMATCH after its
  // instance has stopped firing (the billingGstin no longer conflicts) —
  // exactly what reopenFlag's guard (evaluatedInstances.find(...)) now
  // refuses to do. This proves the orphaning bug the guard exists to
  // prevent: the record surfaces in NEITHER the active-merge branch (no
  // matching instance) NOR the auto-clear branch (which only recognises
  // status "RESOLVED", not "REOPENED").
  const instances = evaluateInvoiceFlags(
    { billingGstin: "27ABCDE1234F1Z5" }, // condition genuinely resolved, not firing
    { organisationGstins: ["27ABCDE1234F1Z5"] },
  );
  assert.ok(!instances.some((i) => i.key === "GSTIN_MISMATCH"));
  const merged = mergeFlagsWithResolutions(instances, {
    GSTIN_MISMATCH: { status: "REOPENED", resolvedSituationSignature: { billingGstin: "27ZZZZZ0000Z1Z9" } },
  });
  assert.ok(!merged.some((i) => i.key === "GSTIN_MISMATCH")); // invisible — neither ACTIVE nor AUTO_CLEARED
});

check("existing instanceId lifecycle (resolve/reopen/auto-clear) is unchanged by this slice — spot check against the established suite", () => {
  const instances = evaluateInvoiceFlags(TWO_RESOLVED_HSN_LINES, {});
  assert.equal(instances.filter((i) => i.key === "HSN_SAC_CODE_MISSING").length, 2);
  assert.notEqual(
    instances.find((i) => i.instanceId === "HSN_SAC_CODE_MISSING:line-a").instanceId,
    instances.find((i) => i.instanceId === "HSN_SAC_CODE_MISSING:line-b").instanceId,
  );
});

// ---------------------------------------------------------------------------
console.log("canReopenInvoiceFlagsForInvoice — permission + invoice-status gate (Approvals.jsx's own pattern)");

check("Pending Checker invoice + checker permission -> can reopen", () => {
  assert.equal(
    canReopenInvoiceFlagsForInvoice(
      { status: "Pending Checker" },
      { canCheckInvoices: true, canApproveInvoices: false },
    ),
    true,
  );
});

check("Pending Checker invoice + approver-only permission -> cannot reopen", () => {
  assert.equal(
    canReopenInvoiceFlagsForInvoice(
      { status: "Pending Checker" },
      { canCheckInvoices: false, canApproveInvoices: true },
    ),
    false,
  );
});

check("Pending Approval invoice + approver permission -> can reopen", () => {
  assert.equal(
    canReopenInvoiceFlagsForInvoice(
      { status: "Pending Approval" },
      { canCheckInvoices: false, canApproveInvoices: true },
    ),
    true,
  );
});

check("Pending Approval invoice + checker-only permission -> cannot reopen", () => {
  assert.equal(
    canReopenInvoiceFlagsForInvoice(
      { status: "Pending Approval" },
      { canCheckInvoices: true, canApproveInvoices: false },
    ),
    false,
  );
});

check("an invoice not currently awaiting approval (e.g. already Approved) -> cannot reopen regardless of permission", () => {
  assert.equal(
    canReopenInvoiceFlagsForInvoice(
      { status: "Approved" },
      { canCheckInvoices: true, canApproveInvoices: true },
    ),
    false,
  );
});

check("no invoice loaded (null) -> cannot reopen", () => {
  assert.equal(
    canReopenInvoiceFlagsForInvoice(null, { canCheckInvoices: true, canApproveInvoices: true }),
    false,
  );
});

// ---------------------------------------------------------------------------
console.log("canResolveInvoiceFlag — View Invoice Resolve gate (confirmed backend contract)");

const MAKER_IDENTITY = { canManageInvoices: true };
const CHECKER_IDENTITY = { canCheckInvoices: true };
const ADMIN_IDENTITY = { isCorporateAdmin: true };
const MASTER_ADMIN_IDENTITY = { isMasterAdmin: true };
const APPROVER_ONLY_IDENTITY = { canApproveInvoices: true };

[
  ["Saved", true],
  ["Draft", true],
  ["Needs Correction", true],
  ["Pending Checker", true],
  ["Pending Approval", true],
  ["Vendor Approval Pending", true],
  ["Approved", true],
  ["Pending Payment", true],
].forEach(([status, expected]) => {
  check(`Maker on "${status}" -> ${expected}`, () => {
    assert.equal(canResolveInvoiceFlag({ status }, MAKER_IDENTITY), expected);
  });
});

[
  ["Paid", false],
  ["Cancelled", false],
  ["Canceled", false],
  ["Rejected", false],
  ["Vendor Rejected", false],
].forEach(([status, expected]) => {
  check(`Maker on "${status}" -> ${expected} (blocked regardless of role)`, () => {
    assert.equal(canResolveInvoiceFlag({ status }, MAKER_IDENTITY), expected);
    assert.equal(canResolveInvoiceFlag({ status }, ADMIN_IDENTITY), expected);
  });
});

check("Checker on an allowed status -> true", () => {
  assert.equal(canResolveInvoiceFlag({ status: "Pending Checker" }, CHECKER_IDENTITY), true);
});

check("Corp Admin on an allowed status -> true", () => {
  assert.equal(canResolveInvoiceFlag({ status: "Approved" }, ADMIN_IDENTITY), true);
});

check("Master Admin on an allowed status -> true", () => {
  assert.equal(canResolveInvoiceFlag({ status: "Pending Payment" }, MASTER_ADMIN_IDENTITY), true);
});

check("pure Approver (no maker/checker/admin) -> false, even on an otherwise-allowed status", () => {
  assert.equal(canResolveInvoiceFlag({ status: "Pending Approval" }, APPROVER_ONLY_IDENTITY), false);
});

check("a Checker who also happens to hold Approver permission is still allowed via canCheckInvoices", () => {
  assert.equal(
    canResolveInvoiceFlag({ status: "Pending Approval" }, { canCheckInvoices: true, canApproveInvoices: true }),
    true,
  );
});

check("no identity at all -> false", () => {
  assert.equal(canResolveInvoiceFlag({ status: "Saved" }, {}), false);
  assert.equal(canResolveInvoiceFlag({ status: "Saved" }), false);
});

check("unrecognised/missing status -> false (fail-closed allowlist, not a blocklist)", () => {
  assert.equal(canResolveInvoiceFlag({ status: "Some Future Status" }, MAKER_IDENTITY), false);
  assert.equal(canResolveInvoiceFlag({ status: "" }, MAKER_IDENTITY), false);
  assert.equal(canResolveInvoiceFlag(null, MAKER_IDENTITY), false);
});

// ---------------------------------------------------------------------------
console.log("selectBlockingFlagsResolvedByOthers — resolved-by-maker callout counting");

const makeResolvedFlag = (overrides = {}) => ({
  key: "GSTIN_MISMATCH",
  instanceId: "GSTIN_MISMATCH",
  status: "RESOLVED",
  severity: INVOICE_FLAG_SEVERITY.MUST_EXPLAIN,
  record: { resolvedBy: { id: "maker-1", name: "Maker" } },
  ...overrides,
});

check("counts a blocking flag resolved by someone other than the current viewer", () => {
  const result = selectBlockingFlagsResolvedByOthers([makeResolvedFlag()], "checker-1");
  assert.equal(result.length, 1);
});

check("does not count a flag resolved by the current viewer themselves", () => {
  const result = selectBlockingFlagsResolvedByOthers(
    [makeResolvedFlag({ record: { resolvedBy: { id: "checker-1", name: "Checker" } } })],
    "checker-1",
  );
  assert.equal(result.length, 0);
});

check("does not count a non-blocking (Worth checking / Just so you know) resolved flag", () => {
  const result = selectBlockingFlagsResolvedByOthers(
    [makeResolvedFlag({ key: "MSME_VENDOR", instanceId: "MSME_VENDOR", severity: INVOICE_FLAG_SEVERITY.JUST_SO_YOU_KNOW })],
    "checker-1",
  );
  assert.equal(result.length, 0);
});

check("does not count an AUTO_CLEARED flag even if it was originally blocking", () => {
  const result = selectBlockingFlagsResolvedByOthers(
    [makeResolvedFlag({ status: "AUTO_CLEARED" })],
    "checker-1",
  );
  assert.equal(result.length, 0);
});

check("a missing resolvedBy on an old record is never mistaken for 'resolved by the current viewer' — it counts", () => {
  const result = selectBlockingFlagsResolvedByOthers(
    [makeResolvedFlag({ record: {} })], // no resolvedBy at all — legacy record
    "checker-1",
  );
  assert.equal(result.length, 1);
});

check("a missing resolvedBy still counts even when the current viewer id is itself null/undefined (no accidental undefined === undefined match)", () => {
  const result = selectBlockingFlagsResolvedByOthers([makeResolvedFlag({ record: {} })], null);
  assert.equal(result.length, 1);
});

check("counts multiple per-line instances of the same blocking flag independently", () => {
  const result = selectBlockingFlagsResolvedByOthers(
    [
      makeResolvedFlag({
        key: "HSN_SAC_CODE_MISSING",
        instanceId: "HSN_SAC_CODE_MISSING:line-a",
        severity: INVOICE_FLAG_SEVERITY.MUST_FIX,
      }),
      makeResolvedFlag({
        key: "HSN_SAC_CODE_MISSING",
        instanceId: "HSN_SAC_CODE_MISSING:line-b",
        severity: INVOICE_FLAG_SEVERITY.MUST_FIX,
      }),
    ],
    "checker-1",
  );
  assert.equal(result.length, 2);
});

// ---------------------------------------------------------------------------
console.log("suppression");

check("a suppressing flag drops the suppressed flag from the result", () => {
  const originalSuppresses = INVOICE_FLAG_CATALOG.MSME_VENDOR.suppresses;
  INVOICE_FLAG_CATALOG.MSME_VENDOR.suppresses = ["GSTIN_MISMATCH"];
  try {
    const instances = evaluateInvoiceFlags(
      { billingGstin: "27ZZZZZ0000Z1Z9", vendorId: "vendor-1" },
      { organisationGstins: ["27ABCDE1234F1Z5"], selectedVendor: { id: "vendor-1", msme: true } },
    );
    assert.ok(keysOf(instances).includes("MSME_VENDOR"));
    assert.ok(!keysOf(instances).includes("GSTIN_MISMATCH"));
  } finally {
    INVOICE_FLAG_CATALOG.MSME_VENDOR.suppresses = originalSuppresses;
  }
});

// ---------------------------------------------------------------------------
console.log("resolveFixInFormFieldKey — \"Fix in form\" target-field resolution (Pass 1)");

// Exercises the real, exported resolveFixInFormFieldKey directly — the same
// function InvoicesPage.jsx and useApprovalsInvoiceEdit.jsx both call before
// scrollToInvoiceField. scrollToInvoiceField itself (DOM scroll/highlight)
// needs a real document and isn't covered here — that half can only be
// verified in the browser. Returns { fieldKey, lineId } (Pass 2) — lineId is
// null for every header-level flag below.

check("BRANCH_GSTIN_CONFLICT resolves via its own fields array to billingGstin", () => {
  const { fieldKey, lineId } = resolveFixInFormFieldKey({ key: "BRANCH_GSTIN_CONFLICT", fields: ["billingGstin"], evidence: null });
  assert.equal(fieldKey, "billingGstin");
  assert.equal(lineId, null);
});

check("REQUIRED_DETAILS_MISSING resolves \"Organization GST\" to billingGstin", () => {
  const { fieldKey } = resolveFixInFormFieldKey({
    key: "REQUIRED_DETAILS_MISSING",
    fields: [],
    evidence: { missingRequiredLabels: ["Organization GST"] },
  });
  assert.equal(fieldKey, "billingGstin");
});

check("REQUIRED_DETAILS_MISSING resolves \"Vendor Name\" to vendorName", () => {
  const { fieldKey } = resolveFixInFormFieldKey({
    key: "REQUIRED_DETAILS_MISSING",
    fields: [],
    evidence: { missingRequiredLabels: ["Vendor Name"] },
  });
  assert.equal(fieldKey, "vendorName");
});

check("REQUIRED_DETAILS_MISSING resolves \"Vendor GST\" to gstin", () => {
  const { fieldKey } = resolveFixInFormFieldKey({
    key: "REQUIRED_DETAILS_MISSING",
    fields: [],
    evidence: { missingRequiredLabels: ["Vendor GST"] },
  });
  assert.equal(fieldKey, "gstin");
});

// RECOMMENDED_DETAILS_MISSING — investigated before implementing anything:
// this already resolves dynamically via evidence.missingRecommendedLabels
// (checked before the static fields[0] fallback in resolveFixInFormFieldKey),
// so it was never actually hardcoded to categoryId — no code change was
// needed here. These two checks prove it picks whichever of Category/
// Department is genuinely missing, not always the first one.
check("RECOMMENDED_DETAILS_MISSING resolves to departmentId when only Department is missing (not categoryId)", () => {
  const { fieldKey } = resolveFixInFormFieldKey({
    key: "RECOMMENDED_DETAILS_MISSING",
    fields: ["categoryId", "departmentId"],
    evidence: { missingRecommendedLabels: ["Department"] },
  });
  assert.equal(fieldKey, "departmentId");
});

check("RECOMMENDED_DETAILS_MISSING resolves to categoryId when only Category is missing", () => {
  const { fieldKey } = resolveFixInFormFieldKey({
    key: "RECOMMENDED_DETAILS_MISSING",
    fields: ["categoryId", "departmentId"],
    evidence: { missingRecommendedLabels: ["Category"] },
  });
  assert.equal(fieldKey, "categoryId");
});

check("REQUIRED_DETAILS_MISSING with an unmapped label falls back to null, not a wrong field", () => {
  const { fieldKey } = resolveFixInFormFieldKey({
    key: "REQUIRED_DETAILS_MISSING",
    fields: [],
    evidence: { missingRequiredLabels: ["Some Future Checklist Item"] },
  });
  assert.equal(fieldKey, null);
});

// ---------------------------------------------------------------------------
console.log("resolveFixInFormFieldKey — per-line target resolution (Pass 2)");

// The real per-line instances evaluateInvoiceFlags actually produces —
// proving the full path (rule evaluation -> flag instance -> field
// resolution), not just hand-built fixtures, for the exact-instance
// requirement: two lines both missing the same thing must resolve to two
// different, independent DOM targets.
const TWO_LINES_MISSING_EVERYTHING = {
  currency: "INR",
  lineItemMode: "DETAILED",
  lineItems: [
    { id: "line-a", description: "Item A", hsnSac: "", tax: "CGST + SGST 18%" },
    { id: "line-b", description: "Item B", hsnSac: "", tax: "CGST + SGST 18%" },
  ],
};

check("HSN_SAC_CODE_MISSING on two different lines resolves to two different lineIds, same fieldKey", () => {
  const instances = evaluateInvoiceFlags(TWO_LINES_MISSING_EVERYTHING, {});
  const lineA = instances.find((i) => i.instanceId === "HSN_SAC_CODE_MISSING:line-a");
  const lineB = instances.find((i) => i.instanceId === "HSN_SAC_CODE_MISSING:line-b");
  assert.ok(lineA && lineB, "sanity: both lines actually fired the flag");

  const resolvedA = resolveFixInFormFieldKey(lineA);
  const resolvedB = resolveFixInFormFieldKey(lineB);
  assert.equal(resolvedA.fieldKey, "hsnSac");
  assert.equal(resolvedB.fieldKey, "hsnSac");
  assert.equal(resolvedA.lineId, "line-a");
  assert.equal(resolvedB.lineId, "line-b");
  assert.notEqual(resolvedA.lineId, resolvedB.lineId, "the whole point: same flag type, different target");
});

check("LINE_GROUP_BRANCH_UNASSIGNED resolves to accountGroup + the firing line's own id", () => {
  const instances = evaluateInvoiceFlags(TWO_LINES_MISSING_EVERYTHING, { isErpIntegrationEnabled: true });
  const lineB = instances.find((i) => i.instanceId === "LINE_GROUP_BRANCH_UNASSIGNED:line-b");
  assert.ok(lineB, "sanity: line-b fired (no groupId/accountGroupId set)");
  const { fieldKey, lineId } = resolveFixInFormFieldKey(lineB);
  assert.equal(fieldKey, "accountGroup");
  assert.equal(lineId, "line-b");
});

check("EXPENSE_TYPE_UNASSIGNED resolves to expenseType + the firing line's own id", () => {
  const instances = evaluateInvoiceFlags(TWO_LINES_MISSING_EVERYTHING, { isErpIntegrationEnabled: true });
  const lineA = instances.find((i) => i.instanceId === "EXPENSE_TYPE_UNASSIGNED:line-a");
  assert.ok(lineA, "sanity: line-a fired (no expenseType set)");
  const { fieldKey, lineId } = resolveFixInFormFieldKey(lineA);
  assert.equal(fieldKey, "expenseType");
  assert.equal(lineId, "line-a");
});

check("a per-line flag with no lineId in evidence (defensive fixture) resolves lineId to null, not undefined or a crash", () => {
  const { fieldKey, lineId } = resolveFixInFormFieldKey({ key: "HSN_SAC_CODE_MISSING", fields: [], evidence: null });
  assert.equal(fieldKey, "hsnSac");
  assert.equal(lineId, null);
});

// ---------------------------------------------------------------------------
console.log("FIX_OR_RESOLVE rollout — all remaining Fix-in-Form flags now also support Resolve");

// Every flag that used to be plain FIX_IN_FORM (DUE_DATE_NOT_SET was
// converted separately, earlier) is now FIX_OR_RESOLVE, with a
// resolveWarning explaining what resolving does and doesn't change. One
// loop-based check covers all 9 rather than 9 near-identical ones — the
// underlying mechanism (dual-button rendering, signature-based lifecycle)
// is already proven generic by DUE_DATE_NOT_SET's own dedicated tests
// above; what's left to prove here is that the catalog conversion itself
// landed correctly for every flag, and that the genuinely different
// situationSignature shapes among these 9 (multi-value, data-bearing,
// per-line) still behave correctly once paired with FIX_OR_RESOLVE.
const NEWLY_CONVERTED_FIX_OR_RESOLVE_FLAGS = [
  "BRANCH_GSTIN_CONFLICT",
  "DUE_DATE_PRECEDES_BILLING_DATE",
  "REQUIRED_DETAILS_MISSING",
  "RECOMMENDED_DETAILS_MISSING",
  "LINE_GROUP_BRANCH_UNASSIGNED",
  "EXPENSE_TYPE_UNASSIGNED",
  "GST_TREATMENT_NOT_SET",
  "HSN_SAC_CODE_MISSING",
  "TAX_TOTAL_DOES_NOT_RECONCILE",
];

check("all 9 newly-converted flags are FIX_OR_RESOLVE with a non-empty resolveWarning; DUE_DATE_NOT_SET (converted earlier) is unchanged", () => {
  NEWLY_CONVERTED_FIX_OR_RESOLVE_FLAGS.forEach((key) => {
    const entry = INVOICE_FLAG_CATALOG[key];
    assert.ok(entry, `${key}: missing from the catalog entirely`);
    assert.equal(entry.actionKind, INVOICE_FLAG_ACTION.FIX_OR_RESOLVE, `${key}: actionKind`);
    assert.equal(typeof entry.resolveWarning, "string", `${key}: resolveWarning`);
    assert.ok(entry.resolveWarning.length > 0, `${key}: resolveWarning is empty`);
  });
  assert.equal(INVOICE_FLAG_CATALOG.DUE_DATE_NOT_SET.actionKind, INVOICE_FLAG_ACTION.FIX_OR_RESOLVE);
});

check("no other catalog entry was accidentally left on or moved to FIX_IN_FORM — the rollout was exhaustive", () => {
  const stillFixInFormOnly = Object.values(INVOICE_FLAG_CATALOG).filter(
    (entry) => entry.actionKind === INVOICE_FLAG_ACTION.FIX_IN_FORM,
  );
  assert.deepEqual(stillFixInFormOnly, [], "every flag that had FIX_IN_FORM should now be FIX_OR_RESOLVE");
});

check("HSN_SAC_CODE_MISSING (per-line): resolving line A does not affect line B's flag, same as the pre-existing per-line RESOLVE precedent (UNUSUAL_TAX_RATE), now proven for FIX_OR_RESOLVE too", () => {
  const twoLines = {
    currency: "INR",
    lineItemMode: "DETAILED",
    lineItems: [
      { id: "line-a", description: "Item A", hsnSac: "", tax: "CGST + SGST 18%" },
      { id: "line-b", description: "Item B", hsnSac: "", tax: "CGST + SGST 18%" },
    ],
  };
  const instances = evaluateInvoiceFlags(twoLines, {});
  const lineA = instances.find((i) => i.instanceId === "HSN_SAC_CODE_MISSING:line-a");
  assert.ok(lineA, "sanity: line-a fires");
  const resolutions = {
    "HSN_SAC_CODE_MISSING:line-a": {
      key: "HSN_SAC_CODE_MISSING",
      status: "RESOLVED",
      reason: "Vendor confirmed this line is exempt; no HSN applies.",
      resolvedSituationSignature: lineA.situationSignature,
    },
  };
  const merged = mergeFlagsWithResolutions(instances, resolutions);
  assert.equal(merged.find((i) => i.instanceId === "HSN_SAC_CODE_MISSING:line-a").status, "RESOLVED");
  assert.equal(merged.find((i) => i.instanceId === "HSN_SAC_CODE_MISSING:line-b").status, "ACTIVE");
});

check("REQUIRED_DETAILS_MISSING resolved while 2 fields are missing reopens once only 1 of the 2 is fixed (materially different situation — the existing 'resolve then change to a different form of the same problem' rule, unaffected by this rollout)", () => {
  const bothMissing = evaluateInvoiceFlags(
    { ...baseFormDataForChecklist, invoiceNumber: "", gstTreatment: "" },
    { checklistOptions: {} },
  );
  const originalSignature = bothMissing.find((i) => i.key === "REQUIRED_DETAILS_MISSING").situationSignature;
  const resolutions = {
    REQUIRED_DETAILS_MISSING: {
      key: "REQUIRED_DETAILS_MISSING",
      status: "RESOLVED",
      reason: "Invoice number and GST Treatment will be added once the vendor confirms.",
      resolvedSituationSignature: originalSignature,
    },
  };

  const onlyGstTreatmentStillMissing = evaluateInvoiceFlags(
    { ...baseFormDataForChecklist, invoiceNumber: "INV-002", gstTreatment: "" },
    { checklistOptions: {} },
  );
  const merged = mergeFlagsWithResolutions(onlyGstTreatmentStillMissing, resolutions);
  assert.equal(
    merged.find((i) => i.key === "REQUIRED_DETAILS_MISSING").status,
    "ACTIVE",
    "the missing-fields set changed (invoiceNumber fixed, gstTreatment didn't) -> old reason no longer covers it -> reopens",
  );
});

check("TAX_TOTAL_DOES_NOT_RECONCILE resolved stays resolved if the exact same mismatch persists, but reopens if the mismatch amount changes", () => {
  const originalMismatch = evaluateInvoiceFlags(
    { ...baseFormDataForChecklist, totalTaxAmount: 100, lastReconciledTaxTotal: 180 },
    { checklistOptions: {} },
  );
  const signature = originalMismatch.find((i) => i.key === "TAX_TOTAL_DOES_NOT_RECONCILE").situationSignature;
  const resolutions = {
    TAX_TOTAL_DOES_NOT_RECONCILE: {
      key: "TAX_TOTAL_DOES_NOT_RECONCILE",
      status: "RESOLVED",
      reason: "Confirmed with finance this was a known OCR misread on the original document; the invoice is correct as filed.",
      resolvedSituationSignature: signature,
    },
  };

  const sameMismatchAgain = evaluateInvoiceFlags(
    { ...baseFormDataForChecklist, totalTaxAmount: 100, lastReconciledTaxTotal: 180 },
    { checklistOptions: {} },
  );
  const mergedSame = mergeFlagsWithResolutions(sameMismatchAgain, resolutions);
  assert.equal(mergedSame.find((i) => i.key === "TAX_TOTAL_DOES_NOT_RECONCILE").status, "RESOLVED");

  const differentMismatch = evaluateInvoiceFlags(
    { ...baseFormDataForChecklist, totalTaxAmount: 50, lastReconciledTaxTotal: 180 },
    { checklistOptions: {} },
  );
  const mergedDifferent = mergeFlagsWithResolutions(differentMismatch, resolutions);
  assert.equal(
    mergedDifferent.find((i) => i.key === "TAX_TOTAL_DOES_NOT_RECONCILE").status,
    "ACTIVE",
    "a genuinely different mismatch amount is a different situation -> the old resolution doesn't cover it -> reopens",
  );
});

// ---------------------------------------------------------------------------
console.log("catalog schema sanity check");

check("every catalog entry has the required shape, no contradictions", () => {
  const validSeverities = new Set(Object.values(INVOICE_FLAG_SEVERITY));
  Object.entries(INVOICE_FLAG_CATALOG).forEach(([key, entry]) => {
    assert.equal(entry.key, key, `${key}: entry.key must match its catalog key`);
    assert.ok(validSeverities.has(entry.severity), `${key}: invalid severity "${entry.severity}"`);
    assert.ok(typeof entry.title === "string" && entry.title.length > 0, `${key}: missing title`);
    assert.ok(typeof entry.describe === "function", `${key}: describe must be a function`);
    assert.ok(Array.isArray(entry.fields), `${key}: fields must be an array`);
    assert.ok(
      !(entry.neverDisableable && entry.canDisable),
      `${key}: cannot be both neverDisableable and canDisable`,
    );
  });
});

// ---------------------------------------------------------------------------
console.log("CHECKLIST_FLAGS subscription gate — activeInvoiceConfiguration parsing");

// isChecklistFlagsEnabled is the pure, RTK/React-free half of the
// subscription gate (useChecklistFlagsSubscription.js just wraps this with
// useRBAC() to read corporateScreens.activeInvoiceConfiguration, which isn't
// unit-testable here without a React harness). This pins the fail-closed
// contract: an org with no CHECKLIST_FLAGS entry — including one that has
// never sent activeInvoiceConfiguration at all — must resolve to disabled,
// not enabled.
check("isChecklistFlagsEnabled: absent/empty activeInvoiceConfiguration -> false (fail-closed)", () => {
  assert.equal(isChecklistFlagsEnabled([]), false);
  assert.equal(isChecklistFlagsEnabled(undefined), false);
});

check("isChecklistFlagsEnabled: CHECKLIST_FLAGS present -> true", () => {
  assert.equal(isChecklistFlagsEnabled(["CHECKLIST_FLAGS"]), true);
  assert.equal(isChecklistFlagsEnabled([INVOICE_CONFIG_SECTIONS.CHECKLIST_FLAGS]), true);
});

check("isChecklistFlagsEnabled: other sections present but not CHECKLIST_FLAGS -> false", () => {
  assert.equal(isChecklistFlagsEnabled(["INTERNAL_CHECKLIST", "REF_NO"]), false);
});

check("isChecklistFlagsEnabled: is case/whitespace-normalizing, same as its sibling INVOICE_CONFIG_SECTIONS checks", () => {
  assert.equal(isChecklistFlagsEnabled(["checklist_flags"]), true);
  assert.equal(isChecklistFlagsEnabled([" Checklist-Flags "]), true);
});

// ---------------------------------------------------------------------------
console.log(`\n${passed} check(s) passed.`);
if (process.exitCode) {
  console.error("\nSome checks FAILED.");
} else {
  console.log("All checks passed.");
}
