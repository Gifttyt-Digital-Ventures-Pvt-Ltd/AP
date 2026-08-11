const hasValue = (value) =>
  value !== undefined && value !== null && value !== "";

const firstValue = (...values) => values.find(hasValue);

const toNumberOrNull = (value) => {
  if (!hasValue(value)) return null;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
};

const normalizeAdvanceRows = (rows = []) => {
  if (!Array.isArray(rows)) return [];

  return rows
    .map((row = {}) => ({
      id: firstValue(row.id, row.advanceId, row.advance_id),
      poId: firstValue(row.poId, row.po_id),
      poNumber: firstValue(row.poNumber, row.po_number),
      origin: firstValue(row.origin, row.source),
      requestedAmount: toNumberOrNull(firstValue(row.requestedAmount, row.requested_amount)),
      approvedAmount: toNumberOrNull(firstValue(row.approvedAmount, row.approved_amount)),
      paidAmount: toNumberOrNull(firstValue(row.paidAmount, row.paid_amount)),
      adjustedAmount: toNumberOrNull(firstValue(row.adjustedAmount, row.adjusted_amount)),
      refundedAmount: toNumberOrNull(firstValue(row.refundedAmount, row.refunded_amount)),
      outstandingAmount: toNumberOrNull(firstValue(row.outstandingAmount, row.outstanding_amount)),
      status: firstValue(row.status, row.advanceStatus, row.advance_status),
      createdAt: firstValue(row.createdAt, row.created_at),
      paidAt: firstValue(row.paidAt, row.paid_at),
    }))
    .filter((row) =>
      hasValue(row.id) ||
      hasValue(row.poNumber) ||
      hasValue(row.outstandingAmount) ||
      hasValue(row.paidAmount),
    );
};

export const normalizeAdvanceContext = (source = {}) => {
  const summary = firstValue(
    source.advanceSummary,
    source.advance_summary,
    source.vendorAdvanceSummary,
    source.vendor_advance_summary,
    source.poAdvanceSummary,
    source.po_advance_summary,
    {},
  );
  const advances = normalizeAdvanceRows(
    firstValue(
      source.advances,
      source.vendorAdvances,
      source.vendor_advances,
      source.advanceHistory,
      source.advance_history,
      [],
    ),
  );
  const advancesByPo = normalizeAdvanceRows(
    firstValue(source.advancesByPo, source.advances_by_po, []),
  );

  const values = {
    advanceBalance: toNumberOrNull(
      firstValue(
        source.vendorAdvanceBalance,
        source.vendor_advance_balance,
        source.poAdvanceBalance,
        source.po_advance_balance,
        summary.advanceBalance,
        summary.advance_balance,
      ),
    ),
    outstandingAdvanceBalance: toNumberOrNull(
      firstValue(
        source.outstandingAdvanceBalance,
        source.outstanding_advance_balance,
        source.outstandingAdvanceTotal,
        source.outstanding_advance_total,
        summary.outstandingAdvanceBalance,
        summary.outstanding_advance_balance,
        summary.outstandingAdvanceTotal,
        summary.outstanding_advance_total,
      ),
    ),
    totalAdvancesPaid: toNumberOrNull(
      firstValue(
        source.totalAdvancesPaid,
        source.total_advances_paid,
        source.paidAdvanceTotal,
        source.paid_advance_total,
        summary.totalAdvancesPaid,
        summary.total_advances_paid,
        summary.paidAdvanceTotal,
        summary.paid_advance_total,
      ),
    ),
    totalAdvancesAdjusted: toNumberOrNull(
      firstValue(
        source.totalAdvancesAdjusted,
        source.total_advances_adjusted,
        source.adjustedAdvanceTotal,
        source.adjusted_advance_total,
        summary.totalAdvancesAdjusted,
        summary.total_advances_adjusted,
        summary.adjustedAdvanceTotal,
        summary.adjusted_advance_total,
      ),
    ),
    totalAdvancesRefunded: toNumberOrNull(
      firstValue(
        source.totalAdvancesRefunded,
        source.total_advances_refunded,
        source.refundedAdvanceTotal,
        source.refunded_advance_total,
        summary.totalAdvancesRefunded,
        summary.total_advances_refunded,
        summary.refundedAdvanceTotal,
        summary.refunded_advance_total,
      ),
    ),
    manualAdvancesTotal: toNumberOrNull(
      firstValue(
        source.manualAdvancesTotal,
        source.manual_advances_total,
        summary.manualAdvancesTotal,
        summary.manual_advances_total,
      ),
    ),
    milestoneAdvancesTotal: toNumberOrNull(
      firstValue(
        source.milestoneAdvancesTotal,
        source.milestone_advances_total,
        summary.milestoneAdvancesTotal,
        summary.milestone_advances_total,
      ),
    ),
  };

  const hasContext =
    Object.values(values).some(hasValue) ||
    advances.length > 0 ||
    advancesByPo.length > 0;

  return {
    ...values,
    advances,
    advancesByPo,
    hasContext,
  };
};
