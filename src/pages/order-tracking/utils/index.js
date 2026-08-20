/** Matches the date formatting already used by the Purchase Orders module (pages/purchase-orders/utils/index.js). */
export const formatDate = (dateStr) => {
  if (!dateStr) return "-";
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

/**
 * Maps one raw Order Tracking row (a backend row, per docs/order-tracking-api-contract.md)
 * into the shape the table/components render. Kept as a defensive seam even
 * though the backend is expected to already return these exact camelCase
 * field names — dual-cased the same way the rest of this app's normalizers
 * handle any camelCase/snake_case drift from an API response.
 */
export const normalizeOrderTrackingRow = (row = {}) => {
  const scheduledAmount = Number(row.scheduledAmount ?? row.scheduled_amount ?? row.poAmount ?? row.po_amount ?? 0) || 0;
  const paidAmount = Number(row.paidAmount ?? row.paid_amount ?? 0) || 0;

  return {
    id: row.id ?? row.poId ?? row.po_id,
    poNumber: row.poNumber ?? row.po_number ?? "-",
    vendorId: row.vendorId ?? row.vendor_id ?? "",
    vendorName: row.vendorName ?? row.vendor_name ?? "-",
    branchName: row.branchName ?? row.branch_name ?? "-",
    poDate: row.poDate ?? row.po_date ?? null,
    expectedDeliveryDate: row.expectedDeliveryDate ?? row.expected_delivery_date ?? null,
    poAmount: Number(row.poAmount ?? row.po_amount ?? 0) || 0,
    currency: row.currency ?? "INR",
    scheduledAmount,
    paidAmount,
    amountOutstanding:
      row.amountOutstanding ?? row.amount_outstanding ?? scheduledAmount - paidAmount,
    documentStatus: row.documentStatus ?? row.document_status ?? null,
    paymentStatus: row.paymentStatus ?? row.payment_status ?? null,
    deliveryStatus: row.deliveryStatus ?? row.delivery_status ?? null,
    fundingStatus: row.fundingStatus ?? row.funding_status ?? null,
  };
};
