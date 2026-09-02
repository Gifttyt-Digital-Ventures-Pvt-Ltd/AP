import { buildInvoiceFormChecklist } from "../../components/InvoiceFormChecklist";
import { EXTRACTED_MISMATCH_HINT, matchesExtractedLoosely } from "../extractionComparison";
import { DOCUMENT_TYPE } from "../../constants/proformaInvoice";
import { LINE_ITEM_MODE_SUMMARY_ONLY } from "../invoiceTax";

/**
 * §5.6 Completeness — Phase 1.5. Deliberately *consumes* the checklist's own
 * done/required output rather than re-deriving field-completeness a third
 * time, so the checklist and these flags can never disagree with each other
 * (exactly the bug class the source spec's §11 calls out: a checklist and a
 * flag/form telling the user two different things about the same field).
 *
 * "Required Details Missing" is ONE flag no matter how many required items
 * are still empty. "Recommended Details Missing" covers Category/Department
 * specifically and only fires when the checklist itself currently marks
 * them required (i.e. the org's mandatory config actually expects them) —
 * not on every empty Category/Department. Line Group/Branch Unassigned and
 * Expense Type Unassigned (below) are the line-item-scoped §5.6 flags,
 * using the per-line instanceId architecture proven by
 * flagRules/taxCompliance.js's HSN_SAC_CODE_MISSING/UNUSUAL_TAX_RATE.
 */
export const evaluateCompletenessFlags = (formData, context = {}) => {
  const instances = [];
  if (!formData) return instances;

  const checklistOptions = context.checklistOptions || {};
  const groups = buildInvoiceFormChecklist(formData, checklistOptions);
  const visibleItems = groups.flatMap((group) => group.items.filter((item) => !item.hidden));

  // A required item can be `done: false` for two different reasons: it's
  // genuinely empty, or it's filled but diverges from what OCR extracted
  // (item.hint === EXTRACTED_MISMATCH_HINT). Only the first case is "missing"
  // — the second is flagRules/extractionMismatch.js's job to report, with the
  // actual extracted-vs-entered values, not this flag's generic count.
  const isGenuinelyEmpty = (item) => item.hint !== EXTRACTED_MISMATCH_HINT;

  const RECOMMENDED_LABELS = new Set(["Category", "Department"]);
  const missingRequired = visibleItems.filter(
    (item) => item.required && !item.done && !RECOMMENDED_LABELS.has(item.label) && isGenuinelyEmpty(item),
  );
  const missingRecommended = visibleItems.filter(
    (item) => RECOMMENDED_LABELS.has(item.label) && item.required && !item.done && isGenuinelyEmpty(item),
  );

  if (missingRequired.length > 0) {
    instances.push({
      key: "REQUIRED_DETAILS_MISSING",
      instanceId: "REQUIRED_DETAILS_MISSING",
      situationSignature: { missingLabels: missingRequired.map((item) => item.label).sort() },
      evidence: { missingRequiredLabels: missingRequired.map((item) => item.label) },
    });
  }

  if (missingRecommended.length > 0) {
    instances.push({
      key: "RECOMMENDED_DETAILS_MISSING",
      instanceId: "RECOMMENDED_DETAILS_MISSING",
      situationSignature: { missingLabels: missingRecommended.map((item) => item.label).sort() },
      evidence: { missingRecommendedLabels: missingRecommended.map((item) => item.label) },
    });
  }

  // Shipping Address Missing — "a goods invoice with no shipping address."
  // Reuses the checklist's own "Shipping Address" done-state (visibleItems),
  // same principle as above: never re-derive "is it empty" a second way.
  // This codebase's DOCUMENT_TYPE enum only distinguishes Tax Invoice from
  // Proforma Invoice — there's no goods-vs-services field anywhere to test
  // against the MD's literal "goods invoice" condition, so this excludes
  // Proforma Invoices (a pre-finalization document where shipping is
  // routinely still unsettled) as the closest available proxy, and fires for
  // any other (i.e. Tax Invoice) document type — a documented approximation,
  // not an exact match to "goods invoice" specifically.
  const shippingAddressItem = visibleItems.find((item) => item.label === "Shipping Address");
  if (
    shippingAddressItem &&
    !shippingAddressItem.done &&
    formData.documentType !== DOCUMENT_TYPE.PROFORMA_INVOICE
  ) {
    instances.push({
      key: "SHIPPING_ADDRESS_MISSING",
      instanceId: "SHIPPING_ADDRESS_MISSING",
      situationSignature: {},
      evidence: null,
    });
  }

  // Billing Address Differs From Document — "the billing address on the
  // form doesn't match the 'Bill To' address on the document." Not
  // confidence-gated (§9 scopes that setting to §5.7 only, and this is a
  // §5.1-shaped "does it match the document" check, not a §5.7 one) — its
  // more specific sibling BILLING_ADDRESS_CHANGED_AFTER_EXTRACTION
  // (extractionMismatch.js, confidence-gated) suppresses this one whenever
  // it fires, same pattern as Document Type. Compares directly against
  // extractedSnapshot.billingAddress (not the checklist's own "Billing
  // Address" item, which only checks emptiness, a different question).
  const extractedBillingAddress = formData.extractedSnapshot?.billingAddress;
  const currentBillingAddress = String(formData.billingAddress ?? "").trim();
  if (
    extractedBillingAddress &&
    currentBillingAddress &&
    !matchesExtractedLoosely(formData.extractedSnapshot, "billingAddress", currentBillingAddress)
  ) {
    instances.push({
      key: "BILLING_ADDRESS_DIFFERS_FROM_DOCUMENT",
      instanceId: "BILLING_ADDRESS_DIFFERS_FROM_DOCUMENT",
      situationSignature: { extractedBillingAddress, currentBillingAddress },
      evidence: { extractedBillingAddress, currentBillingAddress },
    });
  }

  // Line Group/Branch Unassigned + Expense Type Unassigned — gated on
  // context.isErpIntegrationEnabled, not currency. Both fields' UI column,
  // underlying Chart-of-Accounts data fetch, and outbound save payload are
  // all conditioned on the same org-level ERP integration setting
  // (InvoiceForm.jsx's showErpIntegrationFields / useGetCoaTreeQuery skip /
  // InvoicesPage.jsx's payload spread) — evaluating these for a non-ERP org
  // would be an unfixable, blocking Must-Fix false positive, since the
  // columns that would let a maker fix them don't even render. No INR gate
  // (unlike HSN_SAC_CODE_MISSING/UNUSUAL_TAX_RATE): these are accounting/ERP
  // classification concepts, not GST ones, so they apply to foreign-currency
  // invoices too once ERP is enabled. Same Summary-Only gate and per-line
  // instanceId architecture as those two flags.
  if (
    context.isErpIntegrationEnabled &&
    formData.lineItemMode !== LINE_ITEM_MODE_SUMMARY_ONLY &&
    Array.isArray(formData.lineItems)
  ) {
    formData.lineItems.forEach((line, index) => {
      const lineId = line?.id;
      if (!lineId) return;

      const lineNumber = index + 1;
      const lineDescription = String(line?.description ?? "").trim();

      // "A line item has no group or branch selected." One combined picker
      // in this codebase, not two separate fields — groupId/accountGroupId
      // are mutual fallbacks of each other (mapExtractedLineItemToForm), so
      // checking either is equivalent for any normalized line.
      const groupOrBranch = String(line?.groupId ?? line?.accountGroupId ?? "").trim();
      if (!groupOrBranch) {
        instances.push({
          key: "LINE_GROUP_BRANCH_UNASSIGNED",
          instanceId: `LINE_GROUP_BRANCH_UNASSIGNED:${lineId}`,
          situationSignature: { lineId },
          evidence: { lineNumber, lineDescription, lineId },
        });
      }

      // "A line item has no expense type selected."
      const expenseType = String(line?.expenseType ?? "").trim();
      if (!expenseType) {
        instances.push({
          key: "EXPENSE_TYPE_UNASSIGNED",
          instanceId: `EXPENSE_TYPE_UNASSIGNED:${lineId}`,
          situationSignature: { lineId },
          evidence: { lineNumber, lineDescription, lineId },
        });
      }
    });
  }

  return instances;
};
