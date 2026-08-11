const hasValue = (value) =>
  value !== undefined && value !== null && value !== "";

const firstValue = (...values) => values.find(hasValue);

const toNumberOrNull = (value) => {
  if (!hasValue(value)) return null;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
};

const unwrapPayload = (response) =>
  response?.data ??
  response?.proposal ??
  response?.advanceAdjustment ??
  response?.advance_adjustment ??
  response;

export const normalizeAdvanceAdjustmentRows = (rows = []) => {
  if (!Array.isArray(rows)) return [];

  return rows
    .map((row = {}) => ({
      advanceId: firstValue(
        row.advanceId,
        row.advance_id,
        row.id,
        row.referenceNumber,
        row.reference_number,
      ),
      paidAt: firstValue(row.paidAt, row.paid_at, row.paymentDate, row.payment_date),
      outstandingAmount: toNumberOrNull(
        firstValue(row.outstandingAmount, row.outstanding_amount),
      ),
      adjustedAmount: toNumberOrNull(
        firstValue(
          row.adjustedAmount,
          row.adjusted_amount,
          row.proposedAdjustedAmount,
          row.proposed_adjusted_amount,
        ),
      ),
      proposedAdjustedAmount: toNumberOrNull(
        firstValue(row.proposedAdjustedAmount, row.proposed_adjusted_amount),
      ),
      origin: firstValue(row.origin, row.source, "MANUAL"),
      referenceNumber: firstValue(
        row.referenceNumber,
        row.reference_number,
        row.advanceNumber,
        row.advance_number,
      ),
    }))
    .filter((row) => hasValue(row.advanceId) || hasValue(row.referenceNumber));
};

export const normalizeAdvanceAdjustmentProposal = (response) => {
  const payload = unwrapPayload(response);
  if (!payload || typeof payload !== "object") return null;

  const isApplicable = firstValue(
    payload.isApplicable,
    payload.is_applicable,
    payload.applicable,
    payload.hasAdjustment,
    payload.has_adjustment,
  );
  if (isApplicable === false) return null;

  const advances = normalizeAdvanceAdjustmentRows(
    firstValue(
      payload.advances,
      payload.advance_allocations,
      payload.advanceAllocations,
      payload.adjustedAdvances,
      payload.adjusted_advances,
      [],
    ),
  );

  const proposedAdjustmentAmount = toNumberOrNull(
    firstValue(
      payload.proposedAdjustmentAmount,
      payload.proposed_adjustment_amount,
      payload.confirmedAdjustmentAmount,
      payload.confirmed_adjustment_amount,
      payload.advanceAdjustedTotal,
      payload.advance_adjusted_total,
    ),
  );
  const netPayableAfterAdvance = toNumberOrNull(
    firstValue(payload.netPayableAfterAdvance, payload.net_payable_after_advance),
  );
  const totalOutstandingAdvance = toNumberOrNull(
    firstValue(
      payload.totalOutstandingAdvance,
      payload.total_outstanding_advance,
      payload.outstandingAdvanceTotal,
      payload.outstanding_advance_total,
    ),
  );
  const requiresConfirmation = Boolean(
    firstValue(payload.requiresConfirmation, payload.requires_confirmation, false),
  );

  const hasMeaningfulProposal =
    requiresConfirmation ||
    hasValue(proposedAdjustmentAmount) ||
    hasValue(netPayableAfterAdvance) ||
    totalOutstandingAdvance > 0 ||
    advances.length > 0 ||
    hasValue(payload.proposalId) ||
    hasValue(payload.proposal_id);

  if (!hasMeaningfulProposal) return null;

  return {
    invoiceId: firstValue(payload.invoiceId, payload.invoice_id),
    proposalId: firstValue(payload.proposalId, payload.proposal_id),
    poId: firstValue(payload.poId, payload.po_id),
    poNumber: firstValue(payload.poNumber, payload.po_number),
    vendorId: firstValue(payload.vendorId, payload.vendor_id),
    vendorName: firstValue(payload.vendorName, payload.vendor_name),
    invoiceGross: toNumberOrNull(firstValue(payload.invoiceGross, payload.invoice_gross)),
    totalOutstandingAdvance,
    proposedAdjustmentAmount,
    netPayableAfterAdvance,
    adjustmentMethod: firstValue(
      payload.adjustmentMethod,
      payload.adjustment_method,
      "PRO_RATA",
    ),
    consumptionOrder: firstValue(payload.consumptionOrder, payload.consumption_order, "FIFO"),
    requiresConfirmation,
    confirmed: Boolean(
      firstValue(payload.confirmed, payload.isConfirmed, payload.is_confirmed, false),
    ),
    advances,
  };
};

export const buildAdvanceAdjustmentConfirmPayload = (proposal) => ({
  ...(hasValue(proposal?.proposalId) ? { proposalId: proposal.proposalId } : {}),
  confirmedAdjustmentAmount: proposal?.proposedAdjustmentAmount ?? 0,
  advanceAllocations: (proposal?.advances ?? [])
    .filter((advance) => hasValue(advance.advanceId))
    .map((advance) => ({
      advanceId: advance.advanceId,
      adjustedAmount:
        advance.proposedAdjustedAmount ?? advance.adjustedAmount ?? 0,
    })),
});

export const normalizeHistoricalAdvanceAdjustment = (invoice = {}) => {
  const advanceAdjustedTotal = toNumberOrNull(
    firstValue(
      invoice.advanceAdjustedTotal,
      invoice.advance_adjusted_total,
      invoice.advanceAdjustmentTotal,
      invoice.advance_adjustment_total,
    ),
  );
  const netPayableAfterAdvance = toNumberOrNull(
    firstValue(invoice.netPayableAfterAdvance, invoice.net_payable_after_advance),
  );
  const adjustedAdvances = normalizeAdvanceAdjustmentRows(
    firstValue(
      invoice.adjustedAdvances,
      invoice.adjusted_advances,
      invoice.advanceAdjustments,
      invoice.advance_adjustments,
      [],
    ),
  );

  return {
    advanceAdjustedTotal,
    netPayableAfterAdvance,
    adjustedAdvances,
    hasAdjustmentContext:
      hasValue(advanceAdjustedTotal) ||
      hasValue(netPayableAfterAdvance) ||
      adjustedAdvances.length > 0,
  };
};
