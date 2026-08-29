/**
 * Invoice Flags catalog — Phase 1 foundation slice (5 flags, chosen to exercise
 * every mechanism the full ~55-flag catalog needs): GSTIN Mismatch and Invoice
 * Date Out Of Current Period (Must explain, plain Resolve), Duplicate Invoice
 * (Must explain, View and Resolve — the one flag with an evidence sub-flow),
 * MSME Vendor (Just so you know — proves the "optional, never blocks" path),
 * Due Date Precedes Billing Date (Must fix — proves the "Fix in form, no
 * resolve" path). Severities/descriptions are taken directly from the source
 * spec's §5 tables, not the reference images (the spec's own §11 documents
 * the images as containing naming/ordering bugs — e.g. the strip shows
 * "Vendor Mismatch" for what the Flags box correctly calls "GSTIN Mismatch").
 *
 * Phase 1.5 adds two more (Required/Recommended Details Missing, sourced from
 * the checklist rather than a bespoke rule). Phase 3 adds the remaining ~45
 * from the spec's §5.1-§5.6 tables — same shape, no new plumbing needed.
 */

import { DOCUMENT_TYPE_LABELS } from "./proformaInvoice";

export const INVOICE_FLAG_SEVERITY = {
  MUST_FIX: "MUST_FIX",
  MUST_EXPLAIN: "MUST_EXPLAIN",
  WORTH_CHECKING: "WORTH_CHECKING",
  JUST_SO_YOU_KNOW: "JUST_SO_YOU_KNOW",
};

// must-fix -> must-explain -> the rest, matching the strip's required ordering.
export const INVOICE_FLAG_SEVERITY_ORDER = [
  INVOICE_FLAG_SEVERITY.MUST_FIX,
  INVOICE_FLAG_SEVERITY.MUST_EXPLAIN,
  INVOICE_FLAG_SEVERITY.WORTH_CHECKING,
  INVOICE_FLAG_SEVERITY.JUST_SO_YOU_KNOW,
];

export const INVOICE_FLAG_ACTION = {
  FIX_IN_FORM: "FIX_IN_FORM",
  RESOLVE: "RESOLVE",
  VIEW_AND_RESOLVE: "VIEW_AND_RESOLVE",
};

export const INVOICE_FLAG_GROUP = {
  ORG_DOCUMENT: "ORG_DOCUMENT",
  VENDOR: "VENDOR",
  DUPLICATES: "DUPLICATES",
  DATES_PERIOD: "DATES_PERIOD",
  TAX_COMPLIANCE: "TAX_COMPLIANCE",
  COMPLETENESS: "COMPLETENESS",
  AI_EXTRACTION_COMPARISON: "AI_EXTRACTION_COMPARISON",
};

export const INVOICE_FLAG_STATUS = {
  ACTIVE: "ACTIVE",
  RESOLVED: "RESOLVED",
  AUTO_CLEARED: "AUTO_CLEARED",
};

const { MUST_FIX, MUST_EXPLAIN, WORTH_CHECKING, JUST_SO_YOU_KNOW } = INVOICE_FLAG_SEVERITY;
const { FIX_IN_FORM, RESOLVE, VIEW_AND_RESOLVE } = INVOICE_FLAG_ACTION;
const {
  ORG_DOCUMENT,
  VENDOR,
  DUPLICATES,
  DATES_PERIOD,
  TAX_COMPLIANCE,
  COMPLETENESS,
  AI_EXTRACTION_COMPARISON,
} = INVOICE_FLAG_GROUP;

/** Shared shape for the §5.7 "X Changed After Extraction" simple field-value flags — see flagRules/extractionMismatch.js. */
const changedAfterExtractionEntry = (key, title, fieldKey) => ({
  key,
  group: AI_EXTRACTION_COMPARISON,
  title,
  severity: MUST_EXPLAIN,
  actionKind: RESOLVE,
  fields: [fieldKey],
  describe: (ctx) =>
    `The AI read "${ctx?.extractedValue ?? ""}" off the document; the form now has "${ctx?.currentValue ?? ""}".`,
  canDisable: false,
  neverDisableable: false,
  configurableStrictness: false,
  requiresReasonAlways: false,
  suppresses: [],
});

export const INVOICE_FLAG_CATALOG = {
  GSTIN_MISMATCH: {
    key: "GSTIN_MISMATCH",
    group: ORG_DOCUMENT,
    title: "GSTIN Mismatch",
    severity: MUST_EXPLAIN,
    actionKind: RESOLVE,
    fields: ["billingGstin"],
    describe: () => "GSTIN on invoice does not belong to the organization.",
    canDisable: false,
    neverDisableable: true, // one of the MD §9 "never disableable" 7 flags
    configurableStrictness: false,
    requiresReasonAlways: false,
    suppresses: [],
  },
  // Not confidence-gated (§9 scopes that setting to §5.7 only) — see
  // flagRules/organisationDocument.js for why this and its more specific
  // §5.7 sibling both exist, and how the suppression below keeps the user
  // from seeing two chips for one thing.
  DOCUMENT_TYPE_MISMATCH: {
    key: "DOCUMENT_TYPE_MISMATCH",
    group: ORG_DOCUMENT,
    title: "Document Type Mismatch",
    severity: WORTH_CHECKING,
    actionKind: RESOLVE,
    fields: ["documentType"],
    describe: (ctx) =>
      `The document looks like a ${DOCUMENT_TYPE_LABELS[ctx?.extractedDocumentType] ?? ctx?.extractedDocumentType ?? "different type"}, but the form says ${DOCUMENT_TYPE_LABELS[ctx?.currentDocumentType] ?? ctx?.currentDocumentType ?? ""}.`,
    canDisable: true,
    neverDisableable: false,
    configurableStrictness: false,
    requiresReasonAlways: false,
    suppresses: [],
  },
  // §5.1: "The branch you selected isn't registered under the GSTIN you
  // selected." Organisation-level (context.organisationBranches, the org's
  // own branch registry) — a different concept from VENDOR_GSTIN_BRANCH_MISMATCH
  // (flagRules/vendor.js), which is about the vendor's branch. fields
  // matches GSTIN_MISMATCH's own convention for this field — no live DOM
  // anchor exists for billingGstin yet (a pre-existing gap, not new here),
  // so "Fix in form" degrades to closing the dialog either way.
  BRANCH_GSTIN_CONFLICT: {
    key: "BRANCH_GSTIN_CONFLICT",
    group: ORG_DOCUMENT,
    title: "Branch / GSTIN Conflict",
    severity: MUST_FIX,
    actionKind: FIX_IN_FORM,
    fields: ["billingGstin"],
    describe: (ctx) =>
      `The selected branch is registered under ${ctx?.registeredGstin ?? ""}; the invoice has ${ctx?.billingGstin ?? ""} selected.`,
    canDisable: false,
    neverDisableable: false,
    configurableStrictness: false,
    requiresReasonAlways: false,
    suppresses: [],
  },
  // §5.1: "The scanner wasn't confident about one or more fields it read off
  // the document — check them before trusting them." Reuses
  // isLowConfidenceOverride (utils/extractionComparison.js) — the same
  // mechanism the §5.7 confidence-gated flags already use. No real backend
  // confidence source exists yet, so this stays silent for every invoice
  // today (see flagRules/organisationDocument.js) and activates the moment
  // one does. fields is empty — this is a whole-invoice signal, not a
  // single field, same as REQUIRED_DETAILS_MISSING/TAX_TOTAL_DOES_NOT_RECONCILE.
  LOW_EXTRACTION_CONFIDENCE: {
    key: "LOW_EXTRACTION_CONFIDENCE",
    group: ORG_DOCUMENT,
    title: "Low Extraction Confidence",
    severity: WORTH_CHECKING,
    actionKind: RESOLVE,
    fields: [],
    describe: (ctx) =>
      `The scanner wasn't confident about: ${(ctx?.lowConfidenceFields || []).join(", ") || "one or more fields"}. Check them before trusting them.`,
    canDisable: true,
    neverDisableable: false,
    configurableStrictness: false,
    requiresReasonAlways: false,
    suppresses: [],
  },
  DUPLICATE_INVOICE: {
    key: "DUPLICATE_INVOICE",
    group: DUPLICATES,
    title: "Duplicate Invoice",
    severity: MUST_EXPLAIN,
    actionKind: VIEW_AND_RESOLVE,
    fields: ["invoiceNumber", "vendorId", "vendorName"],
    describe: () => "Invoices with the same invoice number already exists in the system.",
    canDisable: false,
    neverDisableable: true, // exact-match layer is one of the 7 never-disableable flags
    configurableStrictness: false,
    requiresReasonAlways: false,
    suppresses: [],
  },
  // Cross-year shares "Duplicate Invoice" as its display name with the
  // exact-match layer above — the spec's own §5.3 table names both the same
  // way, only severity differs. Distinguished in the UI by severity color
  // (amber vs blue) since they're presented as the same underlying finding
  // at different confidence.
  DUPLICATE_INVOICE_CROSS_YEAR: {
    key: "DUPLICATE_INVOICE_CROSS_YEAR",
    group: DUPLICATES,
    title: "Duplicate Invoice",
    severity: WORTH_CHECKING,
    actionKind: RESOLVE,
    fields: ["invoiceNumber", "vendorId", "vendorName"],
    describe: () => "An invoice with the same number exists for this vendor in a different financial year.",
    canDisable: true,
    neverDisableable: false,
    configurableStrictness: false,
    requiresReasonAlways: false,
    suppresses: [],
  },
  SIMILAR_INVOICE: {
    key: "SIMILAR_INVOICE",
    group: DUPLICATES,
    title: "Similar Invoice",
    severity: WORTH_CHECKING,
    actionKind: RESOLVE,
    fields: ["invoiceDate", "vendorId", "vendorName"],
    describe: () => "Same vendor, same amount, and an invoice date within a week of another invoice with a different number.",
    canDisable: true,
    neverDisableable: false,
    configurableStrictness: false,
    requiresReasonAlways: false,
    suppresses: [],
  },
  DUPLICATE_DOCUMENT: {
    key: "DUPLICATE_DOCUMENT",
    group: DUPLICATES,
    title: "Duplicate Document",
    severity: WORTH_CHECKING,
    actionKind: RESOLVE,
    fields: [],
    describe: () => "The exact same file has been uploaded before, for any vendor.",
    canDisable: true,
    neverDisableable: false,
    configurableStrictness: false,
    requiresReasonAlways: false,
    suppresses: [],
  },
  DUPLICATE_AVOIDED_BY_EDIT: {
    key: "DUPLICATE_AVOIDED_BY_EDIT",
    group: DUPLICATES,
    title: "Duplicate Avoided By Edit",
    severity: MUST_EXPLAIN,
    actionKind: VIEW_AND_RESOLVE,
    fields: ["invoiceNumber"],
    describe: () => "The invoice number the AI read from the document would have matched an existing invoice — the number you entered doesn't.",
    canDisable: false,
    neverDisableable: true, // the one flag in the entire system that no organisation can switch off
    configurableStrictness: false,
    requiresReasonAlways: false,
    suppresses: [],
  },
  INVOICE_DATE_OUT_OF_PERIOD: {
    key: "INVOICE_DATE_OUT_OF_PERIOD",
    group: DATES_PERIOD,
    title: "Invoice Date Is Out Of Current Period",
    severity: MUST_EXPLAIN,
    actionKind: RESOLVE,
    fields: ["invoiceDate"],
    describe: () => "This invoice's billing date falls outside the accounting period that's currently open.",
    canDisable: false,
    neverDisableable: false,
    configurableStrictness: false,
    requiresReasonAlways: false,
    suppresses: [],
  },
  MSME_VENDOR: {
    key: "MSME_VENDOR",
    group: VENDOR,
    title: "MSME Vendor",
    severity: JUST_SO_YOU_KNOW,
    actionKind: RESOLVE, // per confirmed decision: Resolve, not a separate Acknowledge action
    fields: ["vendorId", "vendorName"],
    describe: () => "This vendor is registered as MSME and requires special attention.",
    canDisable: true,
    neverDisableable: false,
    configurableStrictness: false,
    requiresReasonAlways: false,
    suppresses: [],
  },
  // §5.2: "The payment terms exceed the MSME limit — 45 days, or 15 days if
  // there's no written agreement on file." Only the 45-day branch is
  // implemented — see flagRules/vendor.js for why the agreement-based
  // 15-day branch can't be. One of the MD §9 "never disableable" 7 flags
  // (real statutory consequence under Section 43B(h)).
  MSME_CREDIT_PERIOD_EXCEEDED: {
    key: "MSME_CREDIT_PERIOD_EXCEEDED",
    group: VENDOR,
    title: "MSME Credit Period Exceeded",
    severity: MUST_EXPLAIN,
    actionKind: RESOLVE,
    fields: ["dueDate"],
    describe: (ctx) =>
      `Due Date (${ctx?.dueDate ?? ""}) exceeds the MSME payment limit — the latest allowed due date is ${ctx?.maxDueDate ?? ""}.`,
    canDisable: false,
    neverDisableable: true,
    configurableStrictness: false,
    requiresReasonAlways: false,
    suppresses: [],
  },
  VENDOR_APPROVAL_PENDING: {
    key: "VENDOR_APPROVAL_PENDING",
    group: VENDOR,
    title: "Vendor Approval Pending",
    severity: JUST_SO_YOU_KNOW,
    actionKind: RESOLVE,
    fields: ["vendorId", "vendorName"],
    describe: () =>
      "This vendor hasn't been approved yet. The invoice can be captured but will wait for vendor approval before moving on.",
    canDisable: true,
    neverDisableable: false,
    configurableStrictness: false,
    requiresReasonAlways: false,
    suppresses: [],
  },
  // §5.2: "This vendor is inactive, blocked, or blacklisted." Only
  // "Inactive" is representable in this app's vendor data model — see
  // flagRules/vendor.js.
  VENDOR_INACTIVE: {
    key: "VENDOR_INACTIVE",
    group: VENDOR,
    title: "Vendor Inactive",
    severity: MUST_EXPLAIN,
    actionKind: RESOLVE,
    fields: ["vendorId", "vendorName"],
    describe: () => "This vendor is marked Inactive.",
    canDisable: false,
    neverDisableable: false,
    configurableStrictness: false,
    requiresReasonAlways: false,
    suppresses: [],
  },
  CAMPAIGN_REFERENCE_INVALID: {
    key: "CAMPAIGN_REFERENCE_INVALID",
    group: VENDOR,
    title: "Campaign Reference Invalid",
    severity: WORTH_CHECKING,
    actionKind: RESOLVE,
    fields: ["campaignName", "referenceNumber"],
    describe: (ctx) =>
      `"${ctx?.campaignName || ctx?.referenceNumber || ""}" doesn't match any of this vendor's approved campaigns.`,
    canDisable: true,
    neverDisableable: false,
    configurableStrictness: false,
    requiresReasonAlways: false,
    suppresses: [],
  },
  // §5.2: "The vendor branch you picked is registered under a different
  // GSTIN than the one selected." Distinct from §5.1's "Branch / GSTIN
  // Conflict" (Must fix, not implemented here) — see flagRules/vendor.js.
  VENDOR_GSTIN_BRANCH_MISMATCH: {
    key: "VENDOR_GSTIN_BRANCH_MISMATCH",
    group: VENDOR,
    title: "Vendor GSTIN / Branch Mismatch",
    severity: WORTH_CHECKING,
    actionKind: RESOLVE,
    fields: ["vendorBranchGstin"],
    describe: (ctx) =>
      `The selected branch is registered under ${ctx?.registeredBranchGstin ?? ""}; the invoice has ${ctx?.invoiceBranchGstin ?? ""}.`,
    canDisable: true,
    neverDisableable: false,
    configurableStrictness: false,
    requiresReasonAlways: false,
    suppresses: [],
  },
  // §5.2: "The vendor master says TDS applies, but 'No TDS' is selected on
  // this invoice." Distinct from §5.5's "TDS Not Deducted" (a broader
  // vendor-and-value threshold check, not implemented) — see flagRules/vendor.js.
  TDS_MAPPING_NOT_APPLIED: {
    key: "TDS_MAPPING_NOT_APPLIED",
    group: VENDOR,
    title: "TDS Mapping Not Applied",
    severity: WORTH_CHECKING,
    actionKind: RESOLVE,
    fields: ["tds"],
    describe: (ctx) => `This vendor's TDS mapping is ${ctx?.vendorTdsLabel ?? ""}, but "No TDS" is selected on this invoice.`,
    canDisable: true,
    neverDisableable: false,
    configurableStrictness: false,
    requiresReasonAlways: false,
    suppresses: [],
  },
  // §5.2: "There's no active bank account on file, so this invoice can't be
  // paid later." Bank details live in the Vendors module, not on the
  // invoice form, and can't be fixed from here — WORTH_CHECKING/RESOLVE
  // (not MUST_FIX/FIX_IN_FORM) so it's informational and non-blocking
  // rather than stranding the maker with no way to clear it. Only fires
  // when Connected Banking is enabled for the org (context.isBankIntegrationEnabled
  // — see flagRules/vendor.js and useInvoiceFlags.js), reusing
  // RBACContext.jsx's existing isConnectedBankingEnabled, not a new toggle.
  VENDOR_BANK_DETAILS_MISSING: {
    key: "VENDOR_BANK_DETAILS_MISSING",
    group: VENDOR,
    title: "Vendor Bank Details Missing",
    severity: WORTH_CHECKING,
    actionKind: RESOLVE,
    fields: [],
    describe: () => "There's no active bank account on file for this vendor, so this invoice can't be paid later.",
    canDisable: false,
    neverDisableable: false,
    configurableStrictness: false,
    requiresReasonAlways: false,
    suppresses: [],
  },
  // §5.2: "The vendor name or GSTIN on the document doesn't match the
  // vendor you've selected." Suppressed by VENDOR_SWITCHED_AFTER_EXTRACTION
  // (extractionMismatch.js) whenever that more specific §5.7 flag fires —
  // see this file's VENDOR_SWITCHED_AFTER_EXTRACTION entry's own suppresses
  // array, and the MD's own §5.7 overlap table. See flagRules/vendor.js.
  VENDOR_MISMATCH: {
    key: "VENDOR_MISMATCH",
    group: VENDOR,
    title: "Vendor Mismatch",
    severity: MUST_EXPLAIN,
    actionKind: RESOLVE,
    fields: ["vendorId", "vendorName", "gstin"],
    describe: (ctx) =>
      `The document shows "${ctx?.extractedVendorName ?? ""}" (${ctx?.extractedVendorGstin ?? ""}); the form has "${ctx?.currentVendorName ?? ""}" (${ctx?.currentVendorGstin ?? ""}) selected.`,
    canDisable: false,
    neverDisableable: false,
    configurableStrictness: false,
    requiresReasonAlways: false,
    suppresses: [],
  },
  DUE_DATE_PRECEDES_BILLING_DATE: {
    key: "DUE_DATE_PRECEDES_BILLING_DATE",
    group: DATES_PERIOD,
    title: "Due Date Precedes Billing Date",
    severity: MUST_FIX,
    actionKind: FIX_IN_FORM,
    fields: ["dueDate", "invoiceDate"],
    describe: () => "The due date is earlier than the billing date.",
    canDisable: false,
    neverDisableable: false,
    configurableStrictness: false,
    requiresReasonAlways: false,
    suppresses: [],
  },
  FUTURE_DATED_INVOICE: {
    key: "FUTURE_DATED_INVOICE",
    group: DATES_PERIOD,
    title: "Future-Dated Invoice",
    severity: MUST_EXPLAIN,
    actionKind: RESOLVE,
    fields: ["invoiceDate"],
    describe: (ctx) => `Billing Date (${ctx?.invoiceDate ?? ""}) is in the future.`,
    canDisable: false,
    neverDisableable: false,
    configurableStrictness: true, // MD §9 — one of only two flags an org can adjust the strictness of
    requiresReasonAlways: false,
    suppresses: [],
  },
  // Deliberately independent of the checklist's own Due Date required/optional
  // designation, which stays optional — see flagRules/datesAccountingPeriod.js.
  DUE_DATE_NOT_SET: {
    key: "DUE_DATE_NOT_SET",
    group: DATES_PERIOD,
    title: "Due Date Not Set",
    severity: MUST_FIX,
    actionKind: FIX_IN_FORM,
    fields: ["dueDate"],
    describe: () => "No due date is set, and none could be determined automatically.",
    canDisable: false,
    neverDisableable: false,
    configurableStrictness: false,
    requiresReasonAlways: false,
    suppresses: [],
  },
  ALREADY_PAST_DUE: {
    key: "ALREADY_PAST_DUE",
    group: DATES_PERIOD,
    title: "Already Past Due",
    severity: WORTH_CHECKING,
    actionKind: RESOLVE,
    fields: ["dueDate"],
    describe: (ctx) => `Due Date (${ctx?.dueDate ?? ""}) has already passed.`,
    canDisable: true,
    neverDisableable: false,
    configurableStrictness: false,
    requiresReasonAlways: false,
    suppresses: [],
  },
  INVOICE_OLDER_THAN_THRESHOLD: {
    key: "INVOICE_OLDER_THAN_THRESHOLD",
    group: DATES_PERIOD,
    title: "Invoice Older Than Threshold",
    severity: WORTH_CHECKING,
    actionKind: RESOLVE,
    fields: ["invoiceDate"],
    describe: (ctx) =>
      `This invoice is ${ctx?.ageInDays ?? "?"} days old, past your organisation's ${ctx?.thresholdDays ?? ""}-day threshold for late capture.`,
    canDisable: true,
    neverDisableable: false,
    configurableStrictness: false,
    requiresReasonAlways: false,
    suppresses: [],
  },
  // Placeholder day-count until a real GST filing-calendar backend exists —
  // see DEFAULT_ITC_CLAIM_WINDOW_WARNING_DAYS in mocks/invoiceFlagsMockData.js.
  ITC_CLAIM_WINDOW_AT_RISK: {
    key: "ITC_CLAIM_WINDOW_AT_RISK",
    group: DATES_PERIOD,
    title: "ITC Claim Window At Risk",
    severity: WORTH_CHECKING,
    actionKind: RESOLVE,
    fields: ["invoiceDate"],
    describe: (ctx) =>
      `This invoice is ${ctx?.ageInDays ?? "?"} days old — the window for claiming input tax credit is closing.`,
    canDisable: true,
    neverDisableable: false,
    configurableStrictness: false,
    requiresReasonAlways: false,
    suppresses: [],
  },

  // Phase 1.5 — sourced from InvoiceFormChecklist's own done/required output,
  // never re-derives field-completeness independently (see completeness.js).
  REQUIRED_DETAILS_MISSING: {
    key: "REQUIRED_DETAILS_MISSING",
    group: COMPLETENESS,
    title: "Required Details Missing",
    severity: MUST_FIX,
    actionKind: FIX_IN_FORM,
    fields: [], // deliberately empty — "fix in form" here just closes the dialog, checklist shows which ones
    describe: (ctx) =>
      `${ctx?.missingRequiredLabels?.length || 0} required checklist item(s) still empty.`,
    canDisable: false,
    neverDisableable: false,
    configurableStrictness: false,
    requiresReasonAlways: false,
    suppresses: [],
  },
  RECOMMENDED_DETAILS_MISSING: {
    key: "RECOMMENDED_DETAILS_MISSING",
    group: COMPLETENESS,
    title: "Recommended Details Missing",
    severity: MUST_FIX,
    actionKind: FIX_IN_FORM,
    fields: ["categoryId", "departmentId"],
    describe: () => "Category or Department is empty where your organisation expects them for reporting.",
    canDisable: false,
    neverDisableable: false,
    configurableStrictness: false,
    requiresReasonAlways: false,
    suppresses: [],
  },
  // "A goods invoice with no shipping address" — this codebase has no
  // goods-vs-services field, so this excludes Proforma Invoices as the
  // closest available proxy; see flagRules/completeness.js.
  SHIPPING_ADDRESS_MISSING: {
    key: "SHIPPING_ADDRESS_MISSING",
    group: COMPLETENESS,
    title: "Shipping Address Missing",
    severity: JUST_SO_YOU_KNOW,
    actionKind: RESOLVE,
    fields: ["shippingAddress"],
    describe: () => "No shipping address is set on this invoice.",
    canDisable: true,
    neverDisableable: false,
    configurableStrictness: false,
    requiresReasonAlways: false,
    suppresses: [],
  },
  // Not confidence-gated (§9 scopes that setting to §5.7 only) — see
  // flagRules/completeness.js for why this and its more specific §5.7
  // sibling both exist, and how the suppression below keeps the user from
  // seeing two chips for one thing.
  BILLING_ADDRESS_DIFFERS_FROM_DOCUMENT: {
    key: "BILLING_ADDRESS_DIFFERS_FROM_DOCUMENT",
    group: COMPLETENESS,
    title: "Billing Address Differs From Document",
    severity: WORTH_CHECKING,
    actionKind: RESOLVE,
    fields: ["billingAddress"],
    describe: (ctx) =>
      `The document's Bill To address was "${ctx?.extractedBillingAddress ?? ""}"; the form now has "${ctx?.currentBillingAddress ?? ""}".`,
    canDisable: true,
    neverDisableable: false,
    configurableStrictness: false,
    requiresReasonAlways: false,
    suppresses: [],
  },
  // §5.6: "A line item has no group or branch selected." Per-line, gated on
  // context.isErpIntegrationEnabled — see flagRules/completeness.js. fields
  // is empty for the same reason HSN_SAC_CODE_MISSING's is: no per-line
  // "Fix in form" DOM navigation exists yet, so this degrades to "closes
  // the dialog."
  LINE_GROUP_BRANCH_UNASSIGNED: {
    key: "LINE_GROUP_BRANCH_UNASSIGNED",
    group: COMPLETENESS,
    title: "Line Group/Branch Unassigned",
    severity: MUST_FIX,
    actionKind: FIX_IN_FORM,
    fields: [],
    describe: (ctx) =>
      `Line ${ctx?.lineNumber ?? "?"}${ctx?.lineDescription ? ` (${ctx.lineDescription})` : ""} has no group or branch selected.`,
    canDisable: false,
    neverDisableable: false,
    configurableStrictness: false,
    requiresReasonAlways: false,
    suppresses: [],
  },
  // §5.6: "A line item has no expense type selected." Same per-line shape
  // as LINE_GROUP_BRANCH_UNASSIGNED above.
  EXPENSE_TYPE_UNASSIGNED: {
    key: "EXPENSE_TYPE_UNASSIGNED",
    group: COMPLETENESS,
    title: "Expense Type Unassigned",
    severity: MUST_FIX,
    actionKind: FIX_IN_FORM,
    fields: [],
    describe: (ctx) =>
      `Line ${ctx?.lineNumber ?? "?"}${ctx?.lineDescription ? ` (${ctx.lineDescription})` : ""} has no expense type selected.`,
    canDisable: false,
    neverDisableable: false,
    configurableStrictness: false,
    requiresReasonAlways: false,
    suppresses: [],
  },

  // §5.7 AI-extraction-comparison — corrected to the MD's exact flag names
  // and scope (an earlier pass invented names/flags not in the spec — see
  // flagRules/extractionMismatch.js and utils/extractionComparison.js for
  // the confidence-gating mechanism, applied to every flag below except
  // Vendor Switched, which isn't an OCR "field read" with a confidence
  // score). Not yet built, deliberately: Document Type Changed After
  // Extraction (no documentType baseline stored), Organisation Name Changed
  // (no real field — see InvoiceFormChecklist.jsx), Billing/Shipping Address
  // Changed (need a loose/fuzzy comparator, not strict equality), Duplicate
  // Avoided By Edit (needs a second duplicate-candidate lookup against the
  // AI-read number) — these stay part of the deferred ~39.
  INVOICE_NUMBER_CHANGED_AFTER_EXTRACTION: changedAfterExtractionEntry(
    "INVOICE_NUMBER_CHANGED_AFTER_EXTRACTION",
    "Invoice Number Changed After Extraction",
    "invoiceNumber",
  ),
  BILLING_DATE_CHANGED_AFTER_EXTRACTION: changedAfterExtractionEntry(
    "BILLING_DATE_CHANGED_AFTER_EXTRACTION",
    "Billing Date Changed After Extraction",
    "invoiceDate",
  ),
  ORGANISATION_GSTIN_CHANGED_AFTER_EXTRACTION: changedAfterExtractionEntry(
    "ORGANISATION_GSTIN_CHANGED_AFTER_EXTRACTION",
    "Organisation GSTIN Changed After Extraction",
    "billingGstin",
  ),
  VENDOR_GSTIN_CHANGED_AFTER_EXTRACTION: changedAfterExtractionEntry(
    "VENDOR_GSTIN_CHANGED_AFTER_EXTRACTION",
    "Vendor GSTIN Changed After Extraction",
    "gstin",
  ),
  CURRENCY_CHANGED_AFTER_EXTRACTION: changedAfterExtractionEntry(
    "CURRENCY_CHANGED_AFTER_EXTRACTION",
    "Currency Changed After Extraction",
    "currency",
  ),
  // MD §5.7 "Where these overlap with other flags": this one suppresses/
  // retires DOCUMENT_TYPE_MISMATCH (§5.1) once it fires — the more specific,
  // confident-AI-read flag replaces the generic one. Bespoke (not
  // changedAfterExtractionEntry) purely for the human-readable describe()
  // text (DOCUMENT_TYPE_LABELS) and the suppresses array.
  DOCUMENT_TYPE_CHANGED_AFTER_EXTRACTION: {
    key: "DOCUMENT_TYPE_CHANGED_AFTER_EXTRACTION",
    group: AI_EXTRACTION_COMPARISON,
    title: "Document Type Changed After Extraction",
    severity: MUST_EXPLAIN,
    actionKind: RESOLVE,
    fields: ["documentType"],
    describe: (ctx) =>
      `The AI read this as a ${DOCUMENT_TYPE_LABELS[ctx?.extractedValue] ?? ctx?.extractedValue ?? "different type"}; the form now says ${DOCUMENT_TYPE_LABELS[ctx?.currentValue] ?? ctx?.currentValue ?? ""}.`,
    canDisable: false,
    neverDisableable: false,
    configurableStrictness: false,
    requiresReasonAlways: false,
    suppresses: ["DOCUMENT_TYPE_MISMATCH"],
  },
  // MD §5.7 "Where these overlap with other flags": suppresses/retires
  // BILLING_ADDRESS_DIFFERS_FROM_DOCUMENT (§5.6, completeness.js) once it
  // fires. Uses matchesExtractedLoosely (via SIMPLE_FIELDS' matcher option
  // in extractionMismatch.js) — MD: "names and addresses are compared
  // loosely, so ordinary rewording passes."
  BILLING_ADDRESS_CHANGED_AFTER_EXTRACTION: {
    key: "BILLING_ADDRESS_CHANGED_AFTER_EXTRACTION",
    group: AI_EXTRACTION_COMPARISON,
    title: "Billing Address Changed After Extraction",
    severity: WORTH_CHECKING,
    actionKind: RESOLVE,
    fields: ["billingAddress"],
    describe: (ctx) =>
      `The AI read the billing address as "${ctx?.extractedValue ?? ""}"; the form now has "${ctx?.currentValue ?? ""}".`,
    canDisable: true,
    neverDisableable: false,
    configurableStrictness: false,
    requiresReasonAlways: false,
    suppresses: ["BILLING_ADDRESS_DIFFERS_FROM_DOCUMENT"],
  },
  // No §5.6 sibling exists for Shipping Address in the MD (only Shipping
  // Address Missing, already built) — nothing to suppress or be suppressed by.
  SHIPPING_ADDRESS_CHANGED_AFTER_EXTRACTION: {
    key: "SHIPPING_ADDRESS_CHANGED_AFTER_EXTRACTION",
    group: AI_EXTRACTION_COMPARISON,
    title: "Shipping Address Changed After Extraction",
    severity: WORTH_CHECKING,
    actionKind: RESOLVE,
    fields: ["shippingAddress"],
    describe: (ctx) =>
      `The AI read the shipping address as "${ctx?.extractedValue ?? ""}"; the form now has "${ctx?.currentValue ?? ""}".`,
    canDisable: true,
    neverDisableable: false,
    configurableStrictness: false,
    requiresReasonAlways: false,
    suppresses: [],
  },
  VENDOR_SWITCHED_AFTER_EXTRACTION: {
    key: "VENDOR_SWITCHED_AFTER_EXTRACTION",
    group: AI_EXTRACTION_COMPARISON,
    title: "Vendor Switched After Extraction",
    severity: MUST_EXPLAIN,
    actionKind: RESOLVE,
    fields: ["vendorId", "vendorName"],
    describe: (ctx) =>
      `The AI matched this invoice to "${ctx?.extractedVendorName || "a different vendor"}"; the form now has "${ctx?.currentVendorName || ""}".`,
    canDisable: false,
    neverDisableable: false,
    configurableStrictness: false,
    requiresReasonAlways: false,
    suppresses: ["VENDOR_MISMATCH"],
  },
  TAX_CHANGED_AFTER_EXTRACTION: {
    key: "TAX_CHANGED_AFTER_EXTRACTION",
    group: AI_EXTRACTION_COMPARISON,
    title: "Tax Changed After Extraction",
    severity: MUST_EXPLAIN,
    actionKind: RESOLVE,
    fields: ["invoiceTax", "invoiceTaxName", "invoiceTaxRate"],
    describe: (ctx) =>
      `Tax on the document was ${ctx?.extractedAmount ?? ""}; the form now computes ${ctx?.currentAmount ?? ""} (differs by more than ₹1).`,
    canDisable: false,
    neverDisableable: false,
    configurableStrictness: false,
    requiresReasonAlways: false,
    suppresses: [],
  },

  // §5.1 — grouped with the other "does this match the document" flags per
  // the MD's own categorization, even though its evaluator lives alongside
  // Tax Changed After Extraction for shared "live totals vs. scannedTotal"
  // infrastructure. Not confidence-gated: §9 scopes the confidence setting
  // to §5.7 only.
  FORM_TOTAL_DIFFERS_FROM_DOCUMENT: {
    key: "FORM_TOTAL_DIFFERS_FROM_DOCUMENT",
    group: ORG_DOCUMENT,
    title: "Form Total Differs From Document",
    severity: MUST_EXPLAIN,
    actionKind: RESOLVE,
    fields: ["netPayable"],
    describe: (ctx) =>
      `The total on the document was ${ctx?.extractedAmount ?? ""}; the form now totals ${ctx?.currentAmount ?? ""}.`,
    canDisable: false,
    neverDisableable: false,
    configurableStrictness: false,
    requiresReasonAlways: false,
    suppresses: [],
  },

  // §5.5 Tax and compliance — first 3 of 12; the rest are Phase 3, same
  // shape. See flagRules/taxCompliance.js.
  GST_TREATMENT_NOT_SET: {
    key: "GST_TREATMENT_NOT_SET",
    group: TAX_COMPLIANCE,
    title: "GST Treatment Not Set",
    severity: MUST_FIX,
    actionKind: FIX_IN_FORM,
    fields: ["gstTreatment"],
    describe: () => "Both the organisation and the vendor are GST-registered, but GST Treatment is still N/A.",
    canDisable: false,
    neverDisableable: false,
    configurableStrictness: false,
    requiresReasonAlways: false,
    suppresses: [],
  },
  TAX_TOTAL_DOES_NOT_RECONCILE: {
    key: "TAX_TOTAL_DOES_NOT_RECONCILE",
    group: TAX_COMPLIANCE,
    title: "Tax Total Does Not Reconcile",
    severity: MUST_FIX,
    actionKind: FIX_IN_FORM,
    fields: [], // no single field to jump to — same "closes the dialog" pattern as REQUIRED_DETAILS_MISSING
    describe: (ctx) =>
      `The declared Total Tax (${ctx?.declaredTaxTotal ?? ""}) doesn't match what the line items compute to (${ctx?.reconciledTaxTotal ?? ""}).`,
    canDisable: false,
    neverDisableable: true, // one of the MD §9 "never disableable" 7 flags
    configurableStrictness: false,
    requiresReasonAlways: false,
    suppresses: [],
  },
  NET_PAYABLE_MANUALLY_OVERRIDDEN: {
    key: "NET_PAYABLE_MANUALLY_OVERRIDDEN",
    group: TAX_COMPLIANCE,
    title: "Net Payable Manually Overridden",
    severity: MUST_EXPLAIN,
    actionKind: RESOLVE,
    fields: ["netAmount"],
    describe: (ctx) =>
      `Net Payable was calculated as ${ctx?.calculatedAmount ?? ""} but the form now has ${ctx?.currentAmount ?? ""}.`,
    canDisable: false,
    neverDisableable: true, // one of the MD §9 "never disableable" 7 flags
    configurableStrictness: false,
    requiresReasonAlways: false,
    suppresses: [],
  },
  TAX_TYPE_CONTRADICTS_PLACE_OF_SUPPLY: {
    key: "TAX_TYPE_CONTRADICTS_PLACE_OF_SUPPLY",
    group: TAX_COMPLIANCE,
    title: "Tax Type Contradicts Place Of Supply",
    severity: MUST_EXPLAIN,
    actionKind: RESOLVE,
    fields: ["sourceOfSupply", "destinationOfSupply"],
    describe: (ctx) =>
      `Source (${ctx?.sourceOfSupply ?? ""}) and destination (${ctx?.destinationOfSupply ?? ""}) don't match the ${ctx?.appliedTaxType ?? ""} applied.`,
    canDisable: false,
    neverDisableable: false,
    configurableStrictness: false,
    requiresReasonAlways: false,
    suppresses: [],
  },
  TAX_CHARGED_BY_UNREGISTERED_VENDOR: {
    key: "TAX_CHARGED_BY_UNREGISTERED_VENDOR",
    group: TAX_COMPLIANCE,
    title: "Tax Charged By Unregistered Vendor",
    severity: MUST_EXPLAIN,
    actionKind: RESOLVE,
    fields: ["gstin"],
    describe: (ctx) => `The vendor has no GSTIN on file, but ${ctx?.appliedTaxType ?? "GST"} was applied.`,
    canDisable: false,
    neverDisableable: false,
    configurableStrictness: false,
    requiresReasonAlways: false,
    suppresses: [],
  },
  // §5.5: "A different TDS section is selected than the one on the vendor
  // record." Distinct from TDS_MAPPING_NOT_APPLIED (fires when no TDS is
  // applied at all) — see flagRules/taxCompliance.js.
  TDS_SECTION_DIFFERS_FROM_VENDOR_MASTER: {
    key: "TDS_SECTION_DIFFERS_FROM_VENDOR_MASTER",
    group: TAX_COMPLIANCE,
    title: "TDS Section Differs From Vendor Master",
    severity: WORTH_CHECKING,
    actionKind: RESOLVE,
    fields: ["tds"],
    describe: (ctx) =>
      `The vendor's TDS section on file is ${ctx?.vendorSectionCode ?? ""}; this invoice has ${ctx?.invoiceSectionCode ?? ""} selected.`,
    canDisable: true,
    neverDisableable: false,
    configurableStrictness: false,
    requiresReasonAlways: false,
    suppresses: [],
  },
  // §5.5: "The TDS rate applied isn't the statutory rate for the selected
  // section." Compares against the section's own statutory rate, not the
  // vendor's configured rate (the flag above) — see flagRules/taxCompliance.js.
  TDS_RATE_OVERRIDDEN: {
    key: "TDS_RATE_OVERRIDDEN",
    group: TAX_COMPLIANCE,
    title: "TDS Rate Overridden",
    severity: WORTH_CHECKING,
    actionKind: RESOLVE,
    fields: ["tds"],
    describe: (ctx) =>
      `The statutory rate for this TDS section is ${ctx?.statutoryRate ?? ""}%; the invoice applies ${ctx?.appliedRate ?? ""}%.`,
    canDisable: true,
    neverDisableable: false,
    configurableStrictness: false,
    requiresReasonAlways: false,
    suppresses: [],
  },
  // §5.5: "Tax is being charged on a line with no HSN code." First of the
  // per-line flags — instanceId is `HSN_SAC_CODE_MISSING:<lineId>`, not this
  // key alone, so each affected line resolves/reopens independently. fields
  // is deliberately empty: per-line "Fix in form" navigation doesn't exist
  // yet (invoiceFieldNavigation.js only anchors header-level fields), so
  // this degrades to "closes the dialog," the same precedent
  // REQUIRED_DETAILS_MISSING/TAX_TOTAL_DOES_NOT_RECONCILE already use.
  HSN_SAC_CODE_MISSING: {
    key: "HSN_SAC_CODE_MISSING",
    group: TAX_COMPLIANCE,
    title: "HSN/SAC Code Missing",
    severity: MUST_FIX,
    actionKind: FIX_IN_FORM,
    fields: [],
    describe: (ctx) =>
      `Line ${ctx?.lineNumber ?? "?"}${ctx?.lineDescription ? ` (${ctx.lineDescription})` : ""} has tax applied but no HSN/SAC code.`,
    canDisable: false,
    neverDisableable: false,
    configurableStrictness: false,
    requiresReasonAlways: false,
    suppresses: [],
  },
  // §5.5: "The effective rate on a line isn't a recognised GST slab (0,
  // 0.25, 3, 5, 12, 18, 28%)." Second per-line flag, same
  // instanceId-per-line shape as HSN_SAC_CODE_MISSING above.
  UNUSUAL_TAX_RATE: {
    key: "UNUSUAL_TAX_RATE",
    group: TAX_COMPLIANCE,
    title: "Unusual Tax Rate",
    severity: WORTH_CHECKING,
    actionKind: RESOLVE,
    fields: [],
    describe: (ctx) =>
      `Line ${ctx?.lineNumber ?? "?"}${ctx?.lineDescription ? ` (${ctx.lineDescription})` : ""} has a tax rate of ${ctx?.effectiveRate ?? ""}%, not a standard GST slab.`,
    canDisable: true,
    neverDisableable: false,
    configurableStrictness: false,
    requiresReasonAlways: false,
    suppresses: [],
  },
};

export const getInvoiceFlagCatalogEntry = (key) => INVOICE_FLAG_CATALOG[key] || null;
