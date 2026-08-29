import { INVOICE_FLAG_CATALOG, INVOICE_FLAG_STATUS } from "../constants/invoiceFlags";
import { evaluateOrganisationDocumentFlags } from "./flagRules/organisationDocument";
import { evaluateVendorFlags } from "./flagRules/vendor";
import { evaluateDuplicateFlags } from "./flagRules/duplicates";
import { evaluateDatesAccountingPeriodFlags } from "./flagRules/datesAccountingPeriod";
import { evaluateCompletenessFlags } from "./flagRules/completeness";
import { evaluateExtractionMismatchFlags } from "./flagRules/extractionMismatch";
import { evaluateTaxComplianceFlags } from "./flagRules/taxCompliance";

const RULE_EVALUATORS = [
  evaluateOrganisationDocumentFlags,
  evaluateVendorFlags,
  evaluateDuplicateFlags,
  evaluateDatesAccountingPeriodFlags,
  evaluateCompletenessFlags,
  evaluateExtractionMismatchFlags,
  evaluateTaxComplianceFlags,
];

/**
 * Pure — same shape as buildInvoiceFormChecklist(formData, options): reads
 * formData + a context object (reference data, mocked today / real API
 * responses later), produces flag *instances* fresh every call. Never
 * touches formData.flagResolutions itself — see mergeFlagsWithResolutions.
 */
export const evaluateInvoiceFlags = (formData, context = {}) => {
  if (!formData) return [];
  const instances = RULE_EVALUATORS.flatMap((evaluate) => evaluate(formData, context) || []);
  return applySuppressions(instances);
};

/**
 * Post-evaluation pass: if any firing instance's catalog entry lists another
 * key under `suppresses`, that other key's instance is dropped — so the user
 * never gets two chips for one underlying problem (e.g. Vendor Switched
 * After Extraction suppresses Vendor Mismatch, once §5.7 lands in Phase 2).
 * Runs before merge-with-resolutions so a previously-resolved suppressed
 * flag can't "auto-clear-reappear" every render.
 */
const applySuppressions = (instances) => {
  const suppressedKeys = new Set();
  instances.forEach((instance) => {
    const entry = INVOICE_FLAG_CATALOG[instance.key];
    (entry?.suppresses || []).forEach((key) => suppressedKeys.add(key));
  });
  return instances.filter((instance) => !suppressedKeys.has(instance.key));
};

const signaturesMatch = (a, b) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);

/**
 * Merge step — where every lifecycle rule from the spec concentrates:
 *   firing + no record                              -> ACTIVE (new)
 *   firing + RESOLVED, signature still matches       -> RESOLVED
 *   firing + RESOLVED, signature differs              -> ACTIVE (reopened — old
 *                                                         explanation didn't cover this)
 *   firing + REOPENED (reviewer-forced)               -> ACTIVE regardless of signature
 *   not firing + has a RESOLVED record                -> RESOLVED, auto-cleared
 * `instances` must already be post-suppression. Pure — no side effects,
 * callers persist nothing here.
 */
export const mergeFlagsWithResolutions = (instances = [], flagResolutions = {}) => {
  const merged = [];
  const seenInstanceIds = new Set();

  instances.forEach((instance) => {
    seenInstanceIds.add(instance.instanceId);
    const record = flagResolutions[instance.instanceId] || null;

    if (!record) {
      merged.push({ ...instance, status: INVOICE_FLAG_STATUS.ACTIVE, record: null });
      return;
    }

    if (record.status === "REOPENED") {
      merged.push({ ...instance, status: INVOICE_FLAG_STATUS.ACTIVE, record });
      return;
    }

    if (signaturesMatch(instance.situationSignature, record.resolvedSituationSignature)) {
      merged.push({ ...instance, status: INVOICE_FLAG_STATUS.RESOLVED, record });
    } else {
      // Same flag, different underlying situation — the old reason doesn't cover this.
      merged.push({ ...instance, status: INVOICE_FLAG_STATUS.ACTIVE, record: null, reopenedFrom: record });
    }
  });

  // instanceId, not key, is the identity here — this is what makes two
  // per-line instances of the same flag type (e.g. HSN_SAC_CODE_MISSING on
  // two different lines) independently resolvable/reopenable instead of
  // colliding on one shared record. For a non-line flag instanceId === key
  // always, so this is behaviorally identical to before for every flag
  // shipped prior to this change. record.key (stored by resolveFlag) is
  // what lets an auto-cleared entry still resolve its catalog metadata once
  // the instance itself is gone (e.g. its line was removed) — instanceId
  // alone isn't a valid catalog key for a per-line flag.
  Object.entries(flagResolutions).forEach(([instanceId, record]) => {
    if (seenInstanceIds.has(instanceId) || !record) return;
    if (record.status === "RESOLVED") {
      merged.push({
        key: record.key ?? instanceId,
        instanceId,
        situationSignature: null,
        evidence: null,
        status: INVOICE_FLAG_STATUS.AUTO_CLEARED,
        record,
      });
    }
  });

  return merged;
};
