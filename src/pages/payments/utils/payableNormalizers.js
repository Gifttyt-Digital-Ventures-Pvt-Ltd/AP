const hasValue = (value) =>
  value !== undefined && value !== null && value !== "";

const firstValue = (...values) => values.find(hasValue);

const toNumberOrNull = (value) => {
  if (!hasValue(value)) return null;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
};

const toNumber = (value) => {
  const numeric = toNumberOrNull(value);
  return numeric === null ? 0 : numeric;
};

const normalizeSourceType = (value) => {
  const normalized = String(value || "INVOICE").trim().toUpperCase();
  if (normalized === "ADVANCE" || normalized === "VENDOR_ADVANCE") return "ADVANCE";
  if (normalized === "OBLIGATION" || normalized === "MILESTONE_OBLIGATION") return "OBLIGATION";
  return "INVOICE";
};

const normalizeTriggerStage = (value) => {
  const normalized = String(value || "").trim().toUpperCase();
  return ["PO", "GRN", "PI", "TI"].includes(normalized) ? normalized : "";
};

const getArray = (value) => {
  if (Array.isArray(value)) return value;
  return value ? [value] : [];
};

const getMoneyField = (row, camelKey, snakeKey, fallbackKeys = []) =>
  toNumberOrNull(firstValue(row[camelKey], row[snakeKey], ...fallbackKeys.map((key) => row[key])));

const hasSourceAwareIdentity = (row = {}) =>
  [
    row.sourceType,
    row.source_type,
    row.payableType,
    row.payable_type,
    row.payableKey,
    row.payable_key,
    row.sourceId,
    row.source_id,
    row.obligationId,
    row.obligation_id,
    row.advanceId,
    row.advance_id,
  ].some(hasValue);

const getFallbackGrossAmount = (row = {}) =>
  toNumberOrNull(
    firstValue(
      row.grossAmount,
      row.gross_amount,
      row.invoiceGross,
      row.invoice_gross,
      row.originalAmount,
      row.original_amount,
      row.totalAmount,
      row.total_amount,
      row.amount,
    ),
  );

const getFallbackPayableAmount = (row = {}) =>
  toNumberOrNull(
    firstValue(
      row.payableAmount,
      row.payable_amount,
      row.netPayableAfterAdvance,
      row.net_payable_after_advance,
      row.netAmount,
      row.net_amount,
      row.netPayable,
      row.net_payable,
      row.paymentAmount,
      row.payment_amount,
      row.amountDue,
      row.amount_due,
      row.amount,
      row.totalAmount,
      row.total_amount,
    ),
  );

const getFallbackNetPayableAmount = (row = {}) =>
  toNumberOrNull(
    firstValue(
      row.netPayableAmount,
      row.net_payable_amount,
      row.netPayableAfterAdvance,
      row.net_payable_after_advance,
      row.netAmount,
      row.net_amount,
      row.netPayable,
      row.net_payable,
      row.paymentAmount,
      row.payment_amount,
      row.payableAmount,
      row.payable_amount,
      row.amountDue,
      row.amount_due,
      row.amount,
      row.totalAmount,
      row.total_amount,
    ),
  );

const getFallbackObligationAmount = (row = {}) =>
  toNumberOrNull(
    firstValue(
      row.remainingAmount,
      row.remaining_amount,
      row.outstandingAmount,
      row.outstanding_amount,
      row.scheduledAmount,
      row.scheduled_amount,
      row.triggeredAmount,
      row.triggered_amount,
    ),
  );

const getMissingMoneyFields = (row = {}, { strictMoney = false } = {}) => {
  const requiresCanonicalMoney = strictMoney && hasSourceAwareIdentity(row);
  if (!requiresCanonicalMoney) {
    return getFallbackNetPayableAmount(row) === null ? ["netPayableAmount"] : [];
  }

  const requiredKeys = [
    ["grossAmount", "gross_amount"],
    ["advanceAdjustedAmount", "advance_adjusted_amount"],
    ["payableAmount", "payable_amount"],
    ["tdsAmount", "tds_amount"],
    ["netPayableAmount", "net_payable_amount"],
  ];

  return requiredKeys
    .filter(([camelKey, snakeKey]) => !hasValue(row[camelKey]) && !hasValue(row[snakeKey]))
    .map(([camelKey]) => camelKey)
};

const getBasePayable = (row = {}, options = {}) => {
  const sourceType = normalizeSourceType(
    firstValue(row.sourceType, row.source_type, row.payableType, row.payable_type, row.type),
  );
  const triggerStage = normalizeTriggerStage(firstValue(row.triggerStage, row.trigger_stage));
  const isAdvanceStageObligation = sourceType === "OBLIGATION" && triggerStage !== "TI";
  const obligationFallbackAmount = isAdvanceStageObligation ? getFallbackObligationAmount(row) : null;
  const rawSourceId = firstValue(row.sourceId, row.source_id);
  const invoiceId = firstValue(row.invoiceId, row.invoice_id, sourceType === "INVOICE" ? row.id : undefined);
  const obligationId = firstValue(
    row.obligationId,
    row.obligation_id,
    sourceType === "OBLIGATION" ? rawSourceId : undefined,
    sourceType === "OBLIGATION" ? row.id : undefined,
  );
  const advanceId = firstValue(
    row.advanceId,
    row.advance_id,
    sourceType === "ADVANCE" ? rawSourceId : undefined,
    sourceType === "ADVANCE" ? row.id : undefined,
  );
  const sourceId = firstValue(rawSourceId, invoiceId, obligationId, advanceId, row.id);
  const payableKey = firstValue(
    row.payableKey,
    row.payable_key,
    sourceType === "OBLIGATION" && obligationId ? `OBL:${obligationId}` : undefined,
    sourceType === "ADVANCE" && advanceId ? `ADV:${advanceId}` : undefined,
    sourceType === "INVOICE" && invoiceId ? `INV:${invoiceId}` : undefined,
    sourceId ? `${sourceType}:${sourceId}` : undefined,
    row.id,
  );

  const missingMoneyFields = getMissingMoneyFields(row, options);
  const grossAmount =
    getMoneyField(row, "grossAmount", "gross_amount") ?? getFallbackGrossAmount(row) ?? 0;
  const advanceAdjustedAmount =
    getMoneyField(row, "advanceAdjustedAmount", "advance_adjusted_amount", [
      "advanceAdjustedTotal",
      "advance_adjusted_total",
      "advanceAdjustmentTotal",
      "advance_adjustment_total",
    ]) ?? 0;
  const payableAmount =
    getMoneyField(row, "payableAmount", "payable_amount") ??
    obligationFallbackAmount ??
    getFallbackPayableAmount(row) ??
    0;
  const tdsAmount = getMoneyField(row, "tdsAmount", "tds_amount", ["tds"]) ?? 0;
  const netPayableAmount =
    getMoneyField(row, "netPayableAmount", "net_payable_amount") ??
    obligationFallbackAmount ??
    getFallbackNetPayableAmount(row) ??
    0;
  const backendSelectable = firstValue(row.isSelectable, row.is_selectable, row.selectable);
  const releaseBlockers = getArray(row.releaseBlockers ?? row.release_blockers);
  const warnings = getArray(row.warnings);
  const missingMoneyMessage = missingMoneyFields.length
    ? `Missing payment amount field${missingMoneyFields.length === 1 ? "" : "s"}: ${missingMoneyFields.join(", ")}`
    : "";
  const isSelectable =
    missingMoneyFields.length === 0 &&
    (sourceType === "INVOICE" ? backendSelectable !== false : backendSelectable === true);
  const disabledReason = isSelectable
    ? ""
    : firstValue(
        row.disabledReason,
        row.disabled_reason,
        missingMoneyMessage,
        releaseBlockers[0]?.message,
        sourceType !== "INVOICE"
          ? "Backend source-aware payment payload is not confirmed for this row."
          : undefined,
        "This payable row is not available for payment.",
      );

  return {
    ...row,
    id: firstValue(row.id, payableKey, sourceId),
    payableKey,
    sourceId,
    sourceType,
    isAdvance: Boolean(
      row.isAdvance ??
        row.is_advance ??
        (sourceType === "ADVANCE" || ["PO", "GRN", "PI"].includes(triggerStage)),
    ),
    orderId: firstValue(row.orderId, row.order_id),
    orderNumber: firstValue(row.orderNumber, row.order_number, row.poNumber, row.po_number),
    poId: firstValue(row.poId, row.po_id),
    vendorId: firstValue(row.vendorId, row.vendor_id),
    vendorName: firstValue(row.vendorName, row.vendor_name, row.vendor?.name, "-"),
    currency: firstValue(row.currency, row.currencyCode, row.currency_code, "INR"),
    dueDate: firstValue(row.dueDate, row.due_date),
    obligationId,
    triggerStage,
    milestoneLabel: firstValue(row.milestoneLabel, row.milestone_label),
    sharePct: toNumberOrNull(firstValue(row.sharePct, row.share_pct, row.sharePercent, row.share_percent)),
    scheduledAmount: toNumber(firstValue(row.scheduledAmount, row.scheduled_amount)),
    triggeredAmount: toNumber(firstValue(row.triggeredAmount, row.triggered_amount)),
    rolledInAmount: toNumber(firstValue(row.rolledInAmount, row.rolled_in_amount)),
    paidAmount: toNumber(firstValue(row.paidAmount, row.paid_amount)),
    triggerDocumentRefs: getArray(row.triggerDocumentRefs ?? row.trigger_document_refs),
    invoiceId,
    invoiceNumber: firstValue(row.invoiceNumber, row.invoice_number, sourceType === "INVOICE" ? "-" : ""),
    matchStatus: firstValue(row.matchStatus, row.match_status),
    advanceId,
    advanceNumber: firstValue(row.advanceNumber, row.advance_number),
    referenceNumber:
      firstValue(
        row.referenceNumber,
        row.reference_number,
        row.invoiceNumber,
        row.invoice_number,
        row.advanceNumber,
        row.advance_number,
        row.obligationReference,
        row.obligation_reference,
        row.milestoneLabel,
        row.milestone_label,
      ) || "-",
    grossAmount,
    advanceAdjustedAmount,
    advanceAdjustedTotal: advanceAdjustedAmount,
    payableAmount,
    tdsAmount,
    netPayableAmount,
    netPayableAfterAdvance:
      getMoneyField(row, "netPayableAfterAdvance", "net_payable_after_advance") ??
      (advanceAdjustedAmount > 0 ? payableAmount : null),
    amount: netPayableAmount,
    netAmount: netPayableAmount,
    netPayable: netPayableAmount,
    originalAmount: grossAmount,
    isSelectable,
    selectable: isSelectable,
    disabledReason,
    missingMoneyFields,
    releaseBlockers,
    warnings,
    hasAdvanceAdjustment: advanceAdjustedAmount > 0 || hasValue(row.netPayableAfterAdvance) || hasValue(row.net_payable_after_advance),
    raw: row.raw ?? row,
  };
};

export const normalizeInvoicePayable = (row = {}, options = {}) =>
  getBasePayable({ ...row, sourceType: firstValue(row.sourceType, row.source_type, "INVOICE") }, options);

export const normalizeObligationPayable = (row = {}, options = {}) =>
  getBasePayable({ ...row, sourceType: "OBLIGATION" }, options);

export const normalizeAdvancePayable = (row = {}, options = {}) =>
  getBasePayable({ ...row, sourceType: "ADVANCE" }, options);

export const normalizePayableItem = (row = {}, options = {}) => {
  const sourceType = normalizeSourceType(firstValue(row.sourceType, row.source_type, row.payableType, row.payable_type, row.type));
  if (sourceType === "OBLIGATION") return normalizeObligationPayable(row, options);
  if (sourceType === "ADVANCE") return normalizeAdvancePayable(row, options);
  return normalizeInvoicePayable(row, options);
};

export const normalizePayablesResponse = (raw, options = {}) => {
  const source = raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {};
  const items = Array.isArray(raw)
    ? raw
    : firstValue(source.items, source.data, source.content, source.payables, source.pendingPayments, source.pending_payments) || [];
  return (Array.isArray(items) ? items : []).map((item) => normalizePayableItem(item, options));
};

export const getPayableDisplayLabel = (row = {}) => {
  if (row.sourceType === "ADVANCE") return row.advanceNumber || row.referenceNumber || row.orderNumber || "Advance";
  if (row.sourceType === "OBLIGATION") {
    if (row.triggerStage === "TI" && row.invoiceNumber) return row.invoiceNumber;
    return row.milestoneLabel || row.orderNumber || row.referenceNumber || "Obligation";
  }
  return row.invoiceNumber || row.referenceNumber || "-";
};

export const isPayableSelectable = (row = {}) => row.isSelectable !== false && row.selectable !== false;

export const getSelectablePayableRows = (rows = []) => rows.filter(isPayableSelectable);

export const getPayableSelectionKey = (row = {}) =>
  String(row.payableKey ?? row.payable_key ?? row.id ?? row.invoiceId ?? row.invoice_id ?? "");
