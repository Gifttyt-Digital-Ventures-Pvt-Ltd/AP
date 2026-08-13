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

export const DEFAULT_PAYMENT_SCHEDULE_BASIS = "AMOUNT";
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
    : DEFAULT_PAYMENT_SCHEDULE_BASIS;
};

const getScheduleCandidate = (source = {}) => {
  for (const key of SCHEDULE_ALIASES) {
    if (Array.isArray(source?.[key])) return source[key];
  }
  return [];
};

export const getPaymentScheduleRows = getScheduleCandidate;

export const normalizePaymentScheduleBasis = normalizeBasis;
export const normalizePaymentScheduleTriggerStage = normalizeTriggerStage;

const hasValue = (value) =>
  value !== undefined && value !== null && value !== "";

const getPoGrossTotal = (source = {}) =>
  Number(
    source.total_amount ??
      source.totalAmount ??
      source.poGrossTotal ??
      source.po_gross_total ??
      source.grossTotal ??
      source.gross_total ??
      0,
  ) || 0;

const getRowValue = (row = {}) => Number(row.value ?? row.amount ?? row.scheduledAmount ?? row.scheduled_amount) || 0;

export const inferPaymentScheduleBasis = (rows = [], poGrossTotal = 0) => {
  const safeRows = Array.isArray(rows) ? rows : [];
  if (!safeRows.length) return DEFAULT_PAYMENT_SCHEDULE_BASIS;

  const values = safeRows.map(getRowValue);
  const totalValue = values.reduce((sum, value) => sum + value, 0);
  const grossTotal = Number(poGrossTotal) || 0;
  const explicitBases = safeRows
    .map((row) => row.basis ?? row.basis_type ?? row.basisType)
    .filter(hasValue)
    .map(normalizeBasis);

  if (explicitBases.includes("AMOUNT")) return "AMOUNT";
  if (values.some((value) => value > 100)) return "AMOUNT";
  if (grossTotal > 0 && Math.abs(totalValue - grossTotal) <= 0.009) return "AMOUNT";
  if (explicitBases.includes("PERCENT")) return "PERCENT";
  return DEFAULT_PAYMENT_SCHEDULE_BASIS;
};

const getDefaultScheduleLabel = (triggerStage = "PO") =>
  normalizeTriggerStage(triggerStage) === "TI"
    ? "Payable on invoice"
    : `Advance on ${normalizeTriggerStage(triggerStage)}`;

export const getNextPaymentScheduleTriggerStage = (rows = []) => {
  const usedTriggers = new Set(
    (Array.isArray(rows) ? rows : []).map((row) => normalizeTriggerStage(row.triggerStage)),
  );
  return PAYMENT_SCHEDULE_TRIGGER_OPTIONS.find((option) => !usedTriggers.has(option.value))?.value || null;
};

export const createEmptyPaymentScheduleRow = (
  sequence = 1,
  basis = DEFAULT_PAYMENT_SCHEDULE_BASIS,
  triggerStage,
) => {
  const normalizedTriggerStage = normalizeTriggerStage(
    triggerStage || (sequence === 1 ? "PO" : "TI"),
  );

  return {
  sequence,
  triggerStage: normalizedTriggerStage,
  label: getDefaultScheduleLabel(normalizedTriggerStage),
  basis: normalizeBasis(basis),
  value: "",
  creditDays: "0",
  };
};

export const isAdvanceScheduleTrigger = (triggerStage = "") =>
  PAYMENT_SCHEDULE_ADVANCE_TRIGGERS.has(normalizeTriggerStage(triggerStage));

export const normalizePaymentScheduleRows = (source = {}) => {
  const rows = getScheduleCandidate(source);
  const inferredBasis = inferPaymentScheduleBasis(rows, getPoGrossTotal(source));

  return rows.map((row = {}, index) => ({
    sequence: Number(row.sequence ?? row.seq ?? index + 1) || index + 1,
    triggerStage: normalizeTriggerStage(row.triggerStage ?? row.trigger_stage),
    label: row.label ?? row.name ?? row.description ?? "",
    basis: inferredBasis,
    value:
      row.value === undefined || row.value === null
        ? ""
        : String(row.value),
    creditDays:
      row.creditDays === undefined && row.credit_days === undefined
        ? "0"
        : String(row.creditDays ?? row.credit_days),
  }));
};

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
  const triggerRows = new Map();
  rows.forEach((row, index) => {
    const rowNumber = index + 1;
    const triggerStage = normalizeTriggerStage(row.triggerStage);
    if (!String(row.label || "").trim()) {
      errors.push(`Payment Schedule row ${rowNumber}: label is required`);
    }
    if (!(Number(row.value) > 0)) {
      errors.push(`Payment Schedule row ${rowNumber}: value must be greater than zero`);
    }
    if (Number(row.creditDays) < 0) {
      errors.push(`Payment Schedule row ${rowNumber}: credit days cannot be negative`);
    }
    if (triggerRows.has(triggerStage)) {
      errors.push(
        `Payment Schedule row ${rowNumber}: trigger stage ${triggerStage} is already used in row ${triggerRows.get(triggerStage)}`,
      );
    } else {
      triggerRows.set(triggerStage, rowNumber);
    }
  });
  if (rows.length > 0 && !triggerRows.has("TI")) {
    errors.push("Payment Schedule must include a TI row for final invoice payment");
  }
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
