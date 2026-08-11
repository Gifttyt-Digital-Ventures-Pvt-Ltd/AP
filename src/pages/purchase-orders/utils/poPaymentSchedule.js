const SCHEDULE_ALIASES = [
  "paymentSchedule",
  "payment_schedule",
  "schedule",
  "payment_terms_schedule",
];

export const PAYMENT_SCHEDULE_TRIGGER_OPTIONS = [
  { value: "PO", label: "PO" },
  { value: "GRN", label: "GRN" },
  { value: "PI", label: "PI" },
  { value: "TI", label: "TI" },
];

export const PAYMENT_SCHEDULE_BASIS_OPTIONS = [
  { value: "PERCENT", label: "Percent" },
  { value: "AMOUNT", label: "Amount" },
];

export const PAYMENT_SCHEDULE_ADVANCE_TRIGGERS = new Set(["PO", "GRN", "PI"]);

const normalizeTriggerStage = (value = "") => {
  const normalized = String(value || "").trim().toUpperCase();
  return PAYMENT_SCHEDULE_TRIGGER_OPTIONS.some((option) => option.value === normalized)
    ? normalized
    : "PO";
};

const normalizeBasis = (value = "") => {
  const normalized = String(value || "").trim().toUpperCase();
  return PAYMENT_SCHEDULE_BASIS_OPTIONS.some((option) => option.value === normalized)
    ? normalized
    : "PERCENT";
};

const getScheduleCandidate = (source = {}) => {
  for (const key of SCHEDULE_ALIASES) {
    if (Array.isArray(source?.[key])) return source[key];
  }
  return [];
};

export const getPaymentScheduleRows = getScheduleCandidate;

export const normalizePaymentScheduleBasis = normalizeBasis;

export const createEmptyPaymentScheduleRow = (sequence = 1, basis = "PERCENT") => ({
  sequence,
  triggerStage: sequence === 1 ? "PO" : "TI",
  label: sequence === 1 ? "Advance on PO" : "Payable on invoice",
  basis: normalizeBasis(basis),
  value: "",
  creditDays: "0",
});

export const isAdvanceScheduleTrigger = (triggerStage = "") =>
  PAYMENT_SCHEDULE_ADVANCE_TRIGGERS.has(normalizeTriggerStage(triggerStage));

export const normalizePaymentScheduleRows = (source = {}) =>
  getScheduleCandidate(source).map((row = {}, index) => ({
    sequence: Number(row.sequence ?? row.seq ?? index + 1) || index + 1,
    triggerStage: normalizeTriggerStage(row.triggerStage ?? row.trigger_stage),
    label: row.label ?? row.name ?? row.description ?? "",
    basis: normalizeBasis(row.basis),
    value:
      row.value === undefined || row.value === null
        ? ""
        : String(row.value),
    creditDays:
      row.creditDays === undefined && row.credit_days === undefined
        ? "0"
        : String(row.creditDays ?? row.credit_days),
  }));

export const getPaymentScheduleComputedAmount = (row = {}, poGrossTotal = 0) => {
  const basis = normalizeBasis(row.basis);
  const value = Number(row.value) || 0;
  if (basis === "PERCENT") return (Number(poGrossTotal) || 0) * value / 100;
  return value;
};

export const getPaymentScheduleSummary = (rows = [], poGrossTotal = 0) => {
  const scheduledTotal = rows.reduce(
    (sum, row) => sum + getPaymentScheduleComputedAmount(row, poGrossTotal),
    0,
  );
  const grossTotal = Number(poGrossTotal) || 0;
  return {
    scheduledTotal,
    poGrossTotal: grossTotal,
    difference: scheduledTotal - grossTotal,
  };
};

export const validatePaymentScheduleRows = (rows = []) => {
  const errors = [];
  rows.forEach((row, index) => {
    const rowNumber = index + 1;
    if (!String(row.label || "").trim()) {
      errors.push(`Payment Schedule row ${rowNumber}: label is required`);
    }
    if (!(Number(row.value) > 0)) {
      errors.push(`Payment Schedule row ${rowNumber}: value must be greater than zero`);
    }
    if (Number(row.creditDays) < 0) {
      errors.push(`Payment Schedule row ${rowNumber}: credit days cannot be negative`);
    }
  });
  return errors;
};

export const buildPaymentSchedulePayload = (rows = []) =>
  rows.map((row, index) => ({
    sequence: Number(row.sequence) || index + 1,
    triggerStage: normalizeTriggerStage(row.triggerStage),
    label: String(row.label || "").trim(),
    basis: normalizeBasis(row.basis),
    value: Number(row.value) || 0,
    creditDays: Number(row.creditDays) || 0,
  }));
