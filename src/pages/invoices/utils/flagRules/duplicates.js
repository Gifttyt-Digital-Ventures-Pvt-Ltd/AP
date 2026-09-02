/**
 * §5.3 Duplicates — all four layers now produce a flag: exact match (Must
 * explain, "Duplicate Invoice"), cross-year (Worth checking, same display
 * name per the spec's own table — only severity differs), economic (Worth
 * checking, "Similar Invoice"), same-file (Worth checking, "Duplicate
 * Document"). Plus Duplicate Avoided By Edit (Must explain, never
 * disableable) — the one flag in the entire catalog that runs the duplicate
 * lookup a second time, against the AI-read invoice number instead of the
 * typed one.
 *
 * Reads context.duplicateCandidates (current typed number) and
 * context.extractedNumberDuplicateCandidates (AI-read number, only fetched
 * by useInvoiceFlags.js when it differs from the typed one) — both already
 * computed (mocked today, a real network call later) by
 * useGetDuplicateInvoiceCandidatesQuery via computeDuplicateCandidates
 * (duplicateDetection.js). This rule never touches the raw invoice dataset.
 */
const nonDeemphasized = (matches = []) => matches.filter((match) => !match.deemphasized);

export const evaluateDuplicateFlags = (formData, context = {}) => {
  const instances = [];
  const candidates = context.duplicateCandidates || {};
  const situationSignature = {
    invoiceNumber: String(formData.invoiceNumber ?? "").trim().toUpperCase(),
    vendor: formData.vendorId || formData.vendorName || null,
  };

  const exactMatches = nonDeemphasized(candidates.exactMatches);
  if (exactMatches.length > 0) {
    instances.push({
      key: "DUPLICATE_INVOICE",
      instanceId: "DUPLICATE_INVOICE",
      situationSignature,
      // Full match list (including deemphasized rows) so the evidence panel
      // can still show cancelled/rejected invoices greyed out, per spec.
      evidence: { matches: candidates.exactMatches },
    });
  }

  const crossYearMatches = nonDeemphasized(candidates.crossYearMatches);
  if (crossYearMatches.length > 0) {
    instances.push({
      key: "DUPLICATE_INVOICE_CROSS_YEAR",
      instanceId: "DUPLICATE_INVOICE_CROSS_YEAR",
      situationSignature,
      evidence: { matches: candidates.crossYearMatches },
    });
  }

  const economicMatches = nonDeemphasized(candidates.economicMatches);
  if (economicMatches.length > 0) {
    instances.push({
      key: "SIMILAR_INVOICE",
      instanceId: "SIMILAR_INVOICE",
      situationSignature,
      evidence: { matches: candidates.economicMatches },
    });
  }

  const sameFileMatches = nonDeemphasized(candidates.sameFileMatches);
  if (sameFileMatches.length > 0) {
    instances.push({
      key: "DUPLICATE_DOCUMENT",
      instanceId: "DUPLICATE_DOCUMENT",
      situationSignature,
      evidence: { matches: candidates.sameFileMatches },
    });
  }

  // Duplicate Avoided By Edit — "the number the AI read would have collided,
  // but the number you typed doesn't." Naturally mutually exclusive with
  // DUPLICATE_INVOICE/DUPLICATE_INVOICE_CROSS_YEAR: this only fires when the
  // *current* number has no match at all, which is exactly the condition
  // that keeps those two from firing — no suppression relationship needed.
  // Ignores the confidence-gating setting entirely, per the spec, and is
  // never disableable.
  const extractedCandidates = context.extractedNumberDuplicateCandidates;
  if (extractedCandidates) {
    const extractedWouldHaveCollided =
      nonDeemphasized(extractedCandidates.exactMatches).length > 0 ||
      nonDeemphasized(extractedCandidates.crossYearMatches).length > 0;
    const currentCollides = exactMatches.length > 0 || crossYearMatches.length > 0;
    if (extractedWouldHaveCollided && !currentCollides) {
      instances.push({
        key: "DUPLICATE_AVOIDED_BY_EDIT",
        instanceId: "DUPLICATE_AVOIDED_BY_EDIT",
        situationSignature: {
          extractedInvoiceNumber: String(formData.extractedSnapshot?.invoiceNumber ?? "")
            .trim()
            .toUpperCase(),
          currentInvoiceNumber: situationSignature.invoiceNumber,
        },
        evidence: {
          matches: [
            ...(extractedCandidates.exactMatches || []),
            ...(extractedCandidates.crossYearMatches || []),
          ],
        },
      });
    }
  }

  return instances;
};
