/** Matches the date formatting already used by the Purchase Orders module (pages/purchase-orders/utils/index.js). */
export const formatDate = (dateStr) => {
  if (!dateStr) return "-";
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

const firstValue = (...values) => values.find((value) => value !== undefined && value !== null);

const mapDocumentChainSlot = (slot = {}) => ({
  state: firstValue(slot.state, "NOT_RECEIVED"),
  documents: Array.isArray(slot.documents) ? slot.documents : [],
  receivedValue: slot.receivedValue,
  orderValue: slot.orderValue,
});

/**
 * API response → OrderTrackingRow. The only place list-row backend field
 * names/casing are read — OrderTrackingTable, FilterBar, SummaryCards, and
 * DocumentChainCell must only ever consume the object this returns (see
 * docs/order-tracking-api-contract.md §7). Kept as the defensive
 * camelCase/snake_case dual-read seam this app's normalizers always use,
 * even though the mock (and the eventual real backend) is expected to
 * already send camelCase.
 */
export const mapOrderTrackingRow = (row = {}) => ({
  id: firstValue(row.id, row.orderId, row.order_id),
  orderNumber: firstValue(row.orderNumber, row.order_number, "-"),
  poNumber: firstValue(row.poNumber, row.po_number, "-"),
  vendorId: firstValue(row.vendorId, row.vendor_id, ""),
  vendorName: firstValue(row.vendorName, row.vendor_name, "-"),
  isMsme: Boolean(firstValue(row.isMsme, row.is_msme, false)),
  orderDate: firstValue(row.poDate, row.orderDate, row.po_date, row.order_date, null),
  orderValue: Number(firstValue(row.poAmount, row.orderValue, row.po_amount, row.order_value, 0)) || 0,
  currency: firstValue(row.currency, "INR"),
  amountOutstanding: Number(firstValue(row.amountOutstanding, row.amount_outstanding, 0)) || 0,
  orderStatus: firstValue(row.orderStatus, row.order_status, null),
  paymentStatus: firstValue(row.paymentStatus, row.payment_status, null),
  deliveryStatus: firstValue(row.deliveryStatus, row.delivery_status, null),
  fundingStatus: firstValue(row.fundingStatus, row.funding_status, null),
  documentChain: {
    grn: mapDocumentChainSlot(row.documentChain?.grn),
    pi: mapDocumentChainSlot(row.documentChain?.pi),
    ti: mapDocumentChainSlot(row.documentChain?.ti),
  },
});

const mapChecklist = (checklist = {}) => ({
  items: Array.isArray(checklist.items) ? checklist.items : [],
  completeCount: Number(checklist.completeCount ?? 0) || 0,
  totalCount: Number(checklist.totalCount ?? 0) || 0,
});

const mapDocumentChainDetail = (chain = []) =>
  (Array.isArray(chain) ? chain : []).map((entry) => ({
    type: entry.type,
    documents: Array.isArray(entry.documents) ? entry.documents : [],
  }));

const mapPaymentObligations = (obligations = []) =>
  (Array.isArray(obligations) ? obligations : []).map((obligation) => ({
    id: firstValue(obligation.id, obligation.obligationId, obligation.obligation_id),
    obligationId: firstValue(obligation.obligationId, obligation.obligation_id, obligation.id),
    scheduleRowId: firstValue(
      obligation.scheduleRowId,
      obligation.schedule_row_id,
      obligation.paymentScheduleRowId,
      obligation.payment_schedule_row_id,
    ),
    stage: firstValue(obligation.stage, obligation.triggerStage, obligation.trigger_stage, "-"),
    label: firstValue(obligation.label, obligation.milestoneLabel, obligation.milestone_label, ""),
    scheduled: Number(firstValue(obligation.scheduled, obligation.scheduled_amount, 0)) || 0,
    triggered: Number(firstValue(obligation.triggered, obligation.triggered_amount, 0)) || 0,
    paid: Number(firstValue(obligation.paid, obligation.paid_amount, 0)) || 0,
    outstanding: obligation.outstanding,
    availableAdvance: Number(firstValue(obligation.availableAdvance, obligation.available_advance, 0)) || 0,
    advanceAdjustedAmount:
      Number(firstValue(obligation.advanceAdjustedAmount, obligation.advance_adjusted_amount, 0)) || 0,
    netPayable: obligation.netPayable ?? obligation.net_payable,
    status: firstValue(obligation.status, obligation.obligationStatus, obligation.obligation_status, null),
    advanceState: firstValue(obligation.advanceState, obligation.advance_state, null),
    isAdvance: Boolean(
      firstValue(obligation.isAdvance, obligation.is_advance, obligation.obligationType === "ADVANCE"),
    ),
    dueDate: firstValue(obligation.dueDate, obligation.due_date, null),
    untriggeredReason: firstValue(obligation.untriggeredReason, obligation.untriggered_reason, null),
    history: Array.isArray(obligation.history)
      ? obligation.history
      : Array.isArray(obligation.paymentHistory)
        ? obligation.paymentHistory
        : Array.isArray(obligation.payment_history)
          ? obligation.payment_history
          : [],
  }));

/**
 * API detail response → OrderTrackingDetail. The only place drawer-level
 * backend field names are read — OrderTrackingDetailDrawer and its
 * sub-sections must only ever consume the object this returns (see
 * docs/order-tracking-api-contract.md §7).
 */
export const mapOrderTrackingDetail = (detail = {}) => ({
  id: firstValue(detail.id, detail.orderId, detail.order_id),
  orderNumber: firstValue(detail.orderNumber, detail.order_number, "-"),
  orderStatus: firstValue(detail.orderStatus, detail.order_status, null),
  orderDate: firstValue(detail.orderDate, detail.order_date, null),
  vendor: {
    id: detail.vendor?.id ?? "",
    name: detail.vendor?.name ?? "-",
    gstin: detail.vendor?.gstin ?? "",
    isMsme: Boolean(detail.vendor?.isMsme),
  },
  orderValue: Number(firstValue(detail.orderValue, detail.order_value, 0)) || 0,
  currency: firstValue(detail.currency, "INR"),
  amountOutstanding: Number(firstValue(detail.amountOutstanding, detail.amount_outstanding, 0)) || 0,
  paymentStatus: firstValue(detail.paymentStatus, detail.payment_status, null),
  checklist: mapChecklist(detail.checklist),
  documentChain: mapDocumentChainDetail(detail.documentChain),
  paymentObligations: mapPaymentObligations(detail.paymentObligations),
  delivery: {
    status: detail.delivery?.status ?? null,
    remarks: detail.delivery?.remarks ?? "",
    updatedAt: detail.delivery?.updatedAt ?? null,
    updatedBy: detail.delivery?.updatedBy ?? null,
  },
  funding: {
    status: detail.funding?.status ?? "NON_FUNDED",
    praxiaAmount: Number(detail.funding?.praxiaAmount ?? 0) || 0,
    financierAmount: Number(detail.funding?.financierAmount ?? 0) || 0,
    currency: detail.funding?.currency ?? detail.currency ?? "INR",
    history: Array.isArray(detail.funding?.history) ? detail.funding.history : [],
  },
  advances: {
    advanceBalance: Number(detail.advances?.advanceBalance ?? 0) || 0,
    outstandingAdvanceBalance: Number(detail.advances?.outstandingAdvanceBalance ?? 0) || 0,
    advances: Array.isArray(detail.advances?.advances) ? detail.advances.advances : [],
  },
});

/**
 * API response → summary-card counts (docs/order-tracking-api-contract.md
 * §3.2). Same mapper-boundary rule as the row/detail mappers above — this is
 * the only place OrderTrackingSummaryCards' backend field names are read.
 */
export const mapOrderTrackingSummary = (summary = {}) => ({
  openOrders: Number(firstValue(summary.openOrders, summary.open_orders, 0)) || 0,
  overduePayments: Number(firstValue(summary.overduePayments, summary.overdue_payments, 0)) || 0,
  pendingDelivery: Number(firstValue(summary.pendingDelivery, summary.pending_delivery, 0)) || 0,
  fullyClosed: Number(firstValue(summary.fullyClosed, summary.fully_closed, 0)) || 0,
});

/** API response → filter-options (docs/order-tracking-api-contract.md §3.5). */
export const mapOrderTrackingFilterOptions = (options = {}) => ({
  vendors: Array.isArray(options.vendors) ? options.vendors : [],
});
