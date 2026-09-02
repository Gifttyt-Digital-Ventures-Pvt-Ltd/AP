import {
  DEFAULT_STALE_INVOICE_THRESHOLD_DAYS,
  DEFAULT_FUTURE_DATED_TOLERANCE_DAYS,
  DEFAULT_ITC_CLAIM_WINDOW_WARNING_DAYS,
} from "../../mocks/invoiceFlagsMockData";

/**
 * §5.4 Dates and accounting period — all flags except Accounting Period
 * Locked (structurally blocked: no period-lock concept, distinct from
 * "currently open period," exists anywhere in this codebase).
 */

// context.today lets tests pin "now" deterministically; production never
// sets it, so this always reflects the real current date live.
const todayIso = () => new Date().toISOString().slice(0, 10);

/** Whole days from `a` to `b` (positive when b is after a). Null if either date is unparseable. */
const daysBetween = (a, b) => {
  const dateA = new Date(a);
  const dateB = new Date(b);
  if (Number.isNaN(dateA.getTime()) || Number.isNaN(dateB.getTime())) return null;
  return Math.round((dateB.getTime() - dateA.getTime()) / (1000 * 60 * 60 * 24));
};

export const evaluateDatesAccountingPeriodFlags = (formData, context = {}) => {
  const instances = [];
  const invoiceDate = formData.invoiceDate;
  const period = context.currentAccountingPeriod;
  const today = context.today || todayIso();

  if (invoiceDate && period?.start && period?.end && (invoiceDate < period.start || invoiceDate > period.end)) {
    instances.push({
      key: "INVOICE_DATE_OUT_OF_PERIOD",
      instanceId: "INVOICE_DATE_OUT_OF_PERIOD",
      situationSignature: { invoiceDate, period },
      evidence: null,
    });
  }

  if (formData.dueDate && invoiceDate && formData.dueDate < invoiceDate) {
    instances.push({
      key: "DUE_DATE_PRECEDES_BILLING_DATE",
      instanceId: "DUE_DATE_PRECEDES_BILLING_DATE",
      situationSignature: { dueDate: formData.dueDate, invoiceDate },
      evidence: null,
    });
  }

  // Future-Dated Invoice — MD §9: one of only two flags with configurable
  // strictness. futureDatedToleranceDays (0 by default) is sourced from
  // reference data so a real org setting needs no rule change later.
  const futureDatedToleranceDays = context.futureDatedToleranceDays ?? DEFAULT_FUTURE_DATED_TOLERANCE_DAYS;
  if (invoiceDate) {
    const daysInFuture = daysBetween(today, invoiceDate);
    if (daysInFuture !== null && daysInFuture > futureDatedToleranceDays) {
      instances.push({
        key: "FUTURE_DATED_INVOICE",
        instanceId: "FUTURE_DATED_INVOICE",
        situationSignature: { invoiceDate, today },
        evidence: { invoiceDate, today },
      });
    }
  }

  // Due Date Not Set — deliberately independent of the checklist's own
  // required/optional designation (Due Date stays optional there, per the
  // confirmed decision — InvoiceFormChecklist.jsx is untouched by this rule).
  // Evaluated after any vendor/PO-driven auto-fill has already run upstream
  // (normalizeDueDateForInvoice etc.) — this only asks "is it still empty."
  if (!String(formData.dueDate ?? "").trim()) {
    instances.push({
      key: "DUE_DATE_NOT_SET",
      instanceId: "DUE_DATE_NOT_SET",
      situationSignature: {},
      evidence: null,
    });
  }

  // Already Past Due — only meaningful once a due date actually exists;
  // mutually exclusive with Due Date Not Set by construction (both read the
  // same field, one requires it empty, this one requires it set).
  if (formData.dueDate && formData.dueDate < today) {
    instances.push({
      key: "ALREADY_PAST_DUE",
      instanceId: "ALREADY_PAST_DUE",
      situationSignature: { dueDate: formData.dueDate, today },
      evidence: { dueDate: formData.dueDate, today },
    });
  }

  // Invoice Older Than Threshold — "90 days by default" per §5.4, org-configurable per §9.
  const staleInvoiceThresholdDays = context.staleInvoiceThresholdDays ?? DEFAULT_STALE_INVOICE_THRESHOLD_DAYS;
  if (invoiceDate) {
    const ageInDays = daysBetween(invoiceDate, today);
    if (ageInDays !== null && ageInDays > staleInvoiceThresholdDays) {
      instances.push({
        key: "INVOICE_OLDER_THAN_THRESHOLD",
        instanceId: "INVOICE_OLDER_THAN_THRESHOLD",
        situationSignature: { invoiceDate, today, thresholdDays: staleInvoiceThresholdDays },
        evidence: { invoiceDate, ageInDays, thresholdDays: staleInvoiceThresholdDays },
      });
    }
  }

  // ITC Claim Window At Risk — placeholder day-count (see
  // DEFAULT_ITC_CLAIM_WINDOW_WARNING_DAYS) until a real GST filing-calendar
  // backend exists. Independent of, and can co-fire with, Invoice Older Than
  // Threshold — the MD treats them as separate concerns (late capture vs.
  // ITC deadline), and nothing suppresses one in favor of the other.
  const itcClaimWindowWarningDays = context.itcClaimWindowWarningDays ?? DEFAULT_ITC_CLAIM_WINDOW_WARNING_DAYS;
  if (invoiceDate) {
    const ageInDays = daysBetween(invoiceDate, today);
    if (ageInDays !== null && ageInDays > itcClaimWindowWarningDays) {
      instances.push({
        key: "ITC_CLAIM_WINDOW_AT_RISK",
        instanceId: "ITC_CLAIM_WINDOW_AT_RISK",
        situationSignature: { invoiceDate, today, thresholdDays: itcClaimWindowWarningDays },
        evidence: { invoiceDate, ageInDays, thresholdDays: itcClaimWindowWarningDays },
      });
    }
  }

  return instances;
};
