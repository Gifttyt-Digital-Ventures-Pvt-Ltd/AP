/**
 * "Fix in form" field navigation for Invoice Flags. Fields are anchored with
 * plain `id="invoice-field-<key>"` attributes directly on the actual
 * input/select/button in InvoiceForm.jsx (see that file) — no ref plumbing
 * needed, since a flag only ever needs to reach a field at click-time, not
 * hold a live reference to it. vendorName/gstin are the one exception:
 * ConnectedVendorPicker (src/components/common/ConnectedVendorPicker.jsx) is
 * a shared component reused across several unrelated screens, so rather than
 * modify it to forward an id, the id sits on the surrounding vendor card
 * wrapper (vendorName) or the GSTIN trigger button (gstin) instead — both
 * always render regardless of whether a vendor is selected yet, so they work
 * for the "still empty" case too, not just "wrong value."
 *
 * Per-line fields (HSN/SAC, line group/branch, expense type) use the same
 * `invoice-field-<key>` convention with the line's own stable id appended —
 * `invoice-field-<key>-<lineId>` — since a fieldKey alone can't tell two
 * rows apart. lineId always comes from the flag's own evidence.lineId
 * (flagRules/taxCompliance.js and flagRules/completeness.js both already
 * attach it), never a row index — indexes shift on add/remove, ids don't.
 */

const HIGHLIGHT_CLASSES = ["ring-2", "ring-amber-500", "ring-offset-2", "rounded-md"];
const HIGHLIGHT_DURATION_MS = 1600;

const buildFieldElementId = (fieldKey, lineId) =>
  lineId ? `invoice-field-${fieldKey}-${lineId}` : `invoice-field-${fieldKey}`;

export const scrollToInvoiceField = (fieldKey, lineId = null) => {
  if (!fieldKey) return false;
  const element = document.getElementById(buildFieldElementId(fieldKey, lineId));
  if (!element) return false;

  element.scrollIntoView({ behavior: "smooth", block: "center" });
  if (typeof element.focus === "function") {
    requestAnimationFrame(() => element.focus({ preventScroll: true }));
  }

  element.classList.add(...HIGHLIGHT_CLASSES);
  window.setTimeout(() => {
    element.classList.remove(...HIGHLIGHT_CLASSES);
  }, HIGHLIGHT_DURATION_MS);

  return true;
};

export const CHECKLIST_LABEL_TO_FIELD_KEY = {
  "Document Type": "documentType",
  "Organization GST": "billingGstin",
  "Vendor Name": "vendorName",
  "Vendor GST": "gstin",
  "GST Treatment": "gstTreatment",
  "Invoice/Bill Number": "invoiceNumber",
  "Billing Date": "invoiceDate",
  Currency: "currency",
  "Invoice tax": "invoiceTax",
  "Tax name": "invoiceTaxName",
  "Tax rate %": "invoiceTaxRate",
  Category: "categoryId",
  Department: "departmentId",
};

/**
 * The 3 per-line §5.6/§5.5 flags — each fires once per affected line
 * (instanceId `${key}:${lineId}`, see flagRules/taxCompliance.js and
 * flagRules/completeness.js), so resolving one always needs both the field
 * key AND which specific line, never just the key.
 */
const PER_LINE_FLAG_FIELD_KEYS = {
  HSN_SAC_CODE_MISSING: "hsnSac",
  LINE_GROUP_BRANCH_UNASSIGNED: "accountGroup",
  EXPENSE_TYPE_UNASSIGNED: "expenseType",
};

/**
 * Resolves a flag to its scroll target, structured as { fieldKey, lineId } —
 * lineId is null for every header-level field, so callers pass it straight
 * through to scrollToInvoiceField unconditionally without branching on flag
 * type themselves. One reusable resolution path for both header and
 * per-line flags, not a separate mechanism per flag.
 */
export const resolveFixInFormFieldKey = (flag) => {
  if (!flag) return { fieldKey: null, lineId: null };

  const perLineFieldKey = PER_LINE_FLAG_FIELD_KEYS[flag.key];
  if (perLineFieldKey) {
    return { fieldKey: perLineFieldKey, lineId: flag.evidence?.lineId ?? null };
  }

  const missingLabel =
    flag.evidence?.missingRequiredLabels?.[0] ?? flag.evidence?.missingRecommendedLabels?.[0];
  if (missingLabel) {
    return { fieldKey: CHECKLIST_LABEL_TO_FIELD_KEY[missingLabel] || null, lineId: null };
  }

  return { fieldKey: flag.fields?.[0] || null, lineId: null };
};

/** Human labels for the toast fallback when a field has no DOM anchor to scroll to. */
const FIELD_KEY_TO_LABEL = {
  documentType: "Document Type",
  gstTreatment: "GST Treatment",
  invoiceNumber: "Invoice/Bill Number",
  invoiceDate: "Billing Date",
  dueDate: "Due Date",
  currency: "Currency",
  invoiceTax: "Invoice Tax",
  invoiceTaxName: "Tax Name",
  invoiceTaxRate: "Tax Rate %",
  categoryId: "Category",
  departmentId: "Department",
  billingGstin: "Organisation GST",
  gstin: "Vendor GST",
  vendorId: "Vendor",
  vendorName: "Vendor",
  hsnSac: "HSN/SAC Code",
  accountGroup: "Line Group/Branch",
  expenseType: "Expense Type",
};

export const labelForFieldKey = (fieldKey) => FIELD_KEY_TO_LABEL[fieldKey] || fieldKey;
