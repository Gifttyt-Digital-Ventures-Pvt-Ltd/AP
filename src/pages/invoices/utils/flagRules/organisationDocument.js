import { isLowConfidenceOverride } from "../extractionComparison";

/**
 * §5.1 Organisation and document flags. Form Total Differs From Document
 * lives in extractionMismatch.js (shared "live totals vs. scanned baseline"
 * plumbing — see that file for why). Proforma Invoice Not Mapped and Invoice
 * Exceeds Mapped PI remain blocked: their data (proforma suggestions/link
 * validation) is mutation-driven, non-reactive component state inside
 * InvoiceForm.jsx with its own local-fallback business logic, not a clean
 * source this engine can read without duplicating that logic or firing
 * redundant network/mutation calls.
 */

/**
 * "The GSTIN printed on the uploaded document isn't one of your
 * organisation's registered GSTINs." formData.billingGstin is set directly
 * from OCR extraction at form-init time (invoicePayloadBuilders.js) with no
 * validation against the org's real registered list at that point — this is
 * a "does it match reality" check (§5.1), not a "does it match the document"
 * check (§5.7), so it compares against context.organisationGstins (the
 * org's actual registered GSTINs), not against extractedSnapshot.
 */
export const evaluateOrganisationDocumentFlags = (formData, context = {}) => {
  const instances = [];
  const billingGstin = String(formData.billingGstin ?? "").trim().toUpperCase();
  const organisationGstins = (context.organisationGstins || [])
    .map((value) => String(value ?? "").trim().toUpperCase())
    .filter(Boolean);

  if (billingGstin && organisationGstins.length > 0 && !organisationGstins.includes(billingGstin)) {
    instances.push({
      key: "GSTIN_MISMATCH",
      instanceId: "GSTIN_MISMATCH",
      situationSignature: { billingGstin },
      evidence: null,
    });
  }

  // "The scan looks like one document type, but you've selected another."
  // Deliberately NOT confidence-gated — per §9, the confidence-threshold
  // setting scopes to §5.7 flags only, and this is a §5.1 flag. That's the
  // real reason both this flag and DOCUMENT_TYPE_CHANGED_AFTER_EXTRACTION
  // (extractionMismatch.js, confidence-gated) exist side by side rather than
  // being one flag: when the AI wasn't confident, the §5.7 flag stays quiet
  // (correcting an unsure read shouldn't force an explanation) but this
  // Worth-checking one can still fire; when confidence is high enough that
  // the §5.7 flag does fire, its catalog entry suppresses this one — see
  // constants/invoiceFlags.js — so the user only ever sees one chip for it.
  const extractedDocumentType = formData.extractedSnapshot?.documentType;
  if (
    extractedDocumentType &&
    formData.documentType &&
    formData.documentType !== extractedDocumentType
  ) {
    instances.push({
      key: "DOCUMENT_TYPE_MISMATCH",
      instanceId: "DOCUMENT_TYPE_MISMATCH",
      situationSignature: { extractedDocumentType, currentDocumentType: formData.documentType },
      evidence: { extractedDocumentType, currentDocumentType: formData.documentType },
    });
  }

  // "The branch you selected isn't registered under the GSTIN you
  // selected." Ground truth is context.organisationBranches (the org's own
  // branch registry, from useGetOrganisationQuery) — the same registry
  // InvoiceForm.jsx's own branch picker reads, via the same normalizer
  // (normalizeOrganisationBranchesFromApi). Matches the currently selected
  // org branch by branchCode first, branchName as fallback — an unmatched
  // branch (not found in the registry) has nothing reliable to compare
  // against, so the rule stays silent rather than guessing. This is a
  // different, organisation-level concept from VENDOR_GSTIN_BRANCH_MISMATCH
  // (flagRules/vendor.js), which is about the vendor's own branch.
  const orgBranchCode = String(formData.branchCode ?? "").trim().toUpperCase();
  const orgBranchName = String(formData.branchName ?? "").trim();
  const organisationBranches = Array.isArray(context.organisationBranches)
    ? context.organisationBranches
    : null;

  if ((orgBranchCode || orgBranchName) && organisationBranches) {
    const matchedBranch = orgBranchCode
      ? organisationBranches.find(
          (branch) => String(branch?.branchCode ?? "").trim().toUpperCase() === orgBranchCode,
        )
      : organisationBranches.find((branch) => String(branch?.branchName ?? "").trim() === orgBranchName);

    const registeredGstin = String(matchedBranch?.billingGstin ?? "").trim().toUpperCase();

    if (matchedBranch && registeredGstin && billingGstin && registeredGstin !== billingGstin) {
      instances.push({
        key: "BRANCH_GSTIN_CONFLICT",
        instanceId: "BRANCH_GSTIN_CONFLICT",
        situationSignature: {
          branchCode: String(matchedBranch.branchCode ?? "").trim().toUpperCase() || null,
          branchName: String(matchedBranch.branchName ?? "").trim() || null,
          billingGstin,
          registeredGstin,
        },
        evidence: { billingGstin, registeredGstin },
      });
    }
  }

  // "The scanner wasn't confident about one or more fields it read off the
  // document — check them before trusting them." Reuses
  // isLowConfidenceOverride, the exact mechanism §5.7's confidence-gated
  // flags already use, rather than a second confidence concept.
  // extractedSnapshot.fieldConfidence is always empty today (no backend
  // confidence source exists yet), so this stays silent for every real
  // invoice until that data starts arriving.
  const fieldConfidence = formData.extractedSnapshot?.fieldConfidence;
  const confidenceThreshold = context.aiConfidenceThreshold;
  if (fieldConfidence && typeof confidenceThreshold === "number" && Number.isFinite(confidenceThreshold)) {
    const lowConfidenceFields = Object.keys(fieldConfidence)
      .filter((field) => isLowConfidenceOverride(formData.extractedSnapshot, field, confidenceThreshold))
      .sort();

    if (lowConfidenceFields.length > 0) {
      instances.push({
        key: "LOW_EXTRACTION_CONFIDENCE",
        instanceId: "LOW_EXTRACTION_CONFIDENCE",
        situationSignature: { lowConfidenceFields },
        evidence: { lowConfidenceFields },
      });
    }
  }

  return instances;
};
