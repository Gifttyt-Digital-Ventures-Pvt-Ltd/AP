const hasValue = (value) =>
  value !== undefined && value !== null && value !== "";

const firstValue = (...values) => values.find(hasValue);

const toNumberOrNull = (value) => {
  if (!hasValue(value)) return null;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
};

const normalizeSourceType = (value) => {
  const normalized = String(value || "INVOICE").trim().toUpperCase();
  if (normalized === "ADVANCE" || normalized === "VENDOR_ADVANCE") return "ADVANCE";
  if (normalized === "OBLIGATION" || normalized === "MILESTONE_OBLIGATION") return "OBLIGATION";
  return "INVOICE";
};

export const getPayableSourceType = (row = {}) =>
  normalizeSourceType(
    firstValue(
      row.sourceType,
      row.source_type,
      row.payableType,
      row.payable_type,
      row.type,
    ),
  );

export const getPayableReference = (row = {}) =>
  firstValue(
    row.referenceNumber,
    row.reference_number,
    row.advanceReference,
    row.advance_reference,
    row.advanceId,
    row.advance_id,
    row.obligationReference,
    row.obligation_reference,
    row.milestoneLabel,
    row.milestone_label,
    row.invoiceNumber,
    row.invoice_number,
  ) || "-";

export const normalizePayableRow = (row = {}) => {
  const sourceType = getPayableSourceType(row);
  const invoiceId = firstValue(row.invoiceId, row.invoice_id, sourceType === "INVOICE" ? row.id : undefined);
  const sourceId = firstValue(
    row.sourceId,
    row.source_id,
    sourceType === "INVOICE" ? invoiceId : undefined,
    row.advanceId,
    row.advance_id,
    row.obligationId,
    row.obligation_id,
    row.id,
  );
  const netPayableAfterAdvance = toNumberOrNull(
    firstValue(row.netPayableAfterAdvance, row.net_payable_after_advance),
  );
  const advanceAdjustedTotal = toNumberOrNull(
    firstValue(
      row.advanceAdjustedTotal,
      row.advance_adjusted_total,
      row.advanceAdjustmentTotal,
      row.advance_adjustment_total,
    ),
  );
  const backendPayableAmount = toNumberOrNull(
    firstValue(row.payableAmount, row.payable_amount, row.paymentAmount, row.payment_amount),
  );
  const fallbackAmount = toNumberOrNull(
    firstValue(
      row.netAmount,
      row.net_amount,
      row.netPayable,
      row.net_payable,
      row.amount,
      row.totalAmount,
      row.total_amount,
      row.amountDue,
      row.amount_due,
    ),
  );
  const payableAmount = firstValue(
    backendPayableAmount,
    netPayableAfterAdvance,
    fallbackAmount,
    0,
  );
  const originalAmount = toNumberOrNull(
    firstValue(
      row.originalAmount,
      row.original_amount,
      row.invoiceGross,
      row.invoice_gross,
      row.totalAmount,
      row.total_amount,
      row.grossAmount,
      row.gross_amount,
      row.amount,
    ),
  );
  const selectable =
    sourceType === "INVOICE" &&
    firstValue(row.selectable, row.isSelectable, row.is_selectable, true) !== false;
  const disabledReason =
    selectable
      ? ""
      : firstValue(
          row.disabledReason,
          row.disabled_reason,
          "Backend source-aware payment payload is not confirmed.",
        );

  return {
    ...row,
    id: firstValue(row.id, invoiceId, sourceId),
    sourceType,
    sourceId,
    invoiceId,
    invoiceNumber: firstValue(row.invoiceNumber, row.invoice_number, sourceType === "INVOICE" ? "-" : ""),
    vendorName: firstValue(row.vendorName, row.vendor_name, row.vendor?.name, "-"),
    poNumber: firstValue(row.poNumber, row.po_number),
    referenceNumber: getPayableReference(row),
    milestoneLabel: firstValue(row.milestoneLabel, row.milestone_label),
    triggerStage: firstValue(row.triggerStage, row.trigger_stage),
    amount: Number(payableAmount || 0),
    payableAmount: Number(payableAmount || 0),
    originalAmount,
    advanceAdjustedTotal,
    netPayableAfterAdvance,
    tdsAmount: toNumberOrNull(firstValue(row.tdsAmount, row.tds_amount)),
    status: firstValue(row.status, row.paymentStatus, row.payment_status),
    dueDate: firstValue(row.dueDate, row.due_date),
    selectable,
    disabledReason,
    hasAdvanceAdjustment:
      hasValue(advanceAdjustedTotal) || hasValue(netPayableAfterAdvance),
    raw: row.raw ?? row,
  };
};

export const isPayableSelectable = (row = {}) => row.selectable !== false;

export const getSelectablePayableRows = (rows = []) =>
  rows.filter(isPayableSelectable);

export const getPayableDisplayLabel = (row = {}) => {
  if (row.sourceType === "ADVANCE") return row.referenceNumber || row.poNumber || "Advance";
  if (row.sourceType === "OBLIGATION") return row.milestoneLabel || row.referenceNumber || "Obligation";
  return row.invoiceNumber || "-";
};
