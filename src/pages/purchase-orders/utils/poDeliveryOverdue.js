/**
 * Reads the backend-computed `overdueDays` field on a PO — no client-side
 * date/status guessing here. Backend hasn't shipped this field yet, so this
 * resolves to "not overdue" everywhere until it does; no frontend change
 * will be needed once it's added, since both casings are already handled.
 */
export const getPoDeliveryOverdueDays = (po = {}) => {
  const raw = po.overdueDays ?? po.overdue_days ?? 0;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
};

export const isPoDeliveryOverdue = (po = {}) => getPoDeliveryOverdueDays(po) > 0;

export const getPoDeliveryOverdueLabel = (po = {}) => {
  const days = getPoDeliveryOverdueDays(po);
  if (days <= 0) return "";
  return `Overdue by ${days} day${days === 1 ? "" : "s"}`;
};
