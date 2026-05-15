export const formatCurrency = (amount) => {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
  }).format(amount || 0);
};

export const normalizePoStatus = (status = "") => {
  const normalized = String(status || "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

  const statusMap = {
    DRAFT: "Draft",
    PENDING_APPROVAL: "Pending Approval",
    APPROVED: "Approved",
    PARTIALLY_RECEIVED: "Partially Received",
    CLOSED: "Closed",
    CANCELLED: "Cancelled",
    CANCELED: "Cancelled",
    REJECTED: "Rejected",
    SENT_BACK: "Sent Back",
  };

  return statusMap[normalized] || status || "-";
};

export const isPendingPoApproval = (status = "") =>
  normalizePoStatus(status) === "Pending Approval";

export const formatDate = (dateStr) => {
  if (!dateStr) return "-";
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

export const normalizePoLineItem = (item = {}) => ({
  ...item,
  item_description: item.item_description ?? item.description ?? "",
  hsn_sac_code: item.hsn_sac_code ?? item.hsnSac ?? "",
  unit_of_measure: item.unit_of_measure ?? item.uom ?? "NOS",
  unit_price: item.unit_price ?? item.unitPrice ?? 0,
  gst_rate: item.gst_rate ?? item.gstRate ?? 0,
  tax_amount: item.tax_amount ?? item.taxAmount ?? 0,
  total_amount: item.total_amount ?? item.totalAmount ?? item.amount ?? 0,
});

export const normalizePurchaseOrder = (po = {}) => ({
  ...po,
  po_number: po.po_number ?? po.poNumber,
  vendor_id: po.vendor_id ?? po.vendorId,
  vendor_name: po.vendor_name ?? po.vendorName,
  po_date: po.po_date ?? po.poDate,
  expected_delivery_date: po.expected_delivery_date ?? po.expectedDeliveryDate,
  line_items: Array.isArray(po.line_items)
    ? po.line_items.map(normalizePoLineItem)
    : Array.isArray(po.lineItems)
      ? po.lineItems.map(normalizePoLineItem)
      : [],
  subtotal: po.subtotal ?? 0,
  tax_amount: po.tax_amount ?? po.taxAmount ?? 0,
  total_amount: po.total_amount ?? po.totalAmount ?? 0,
  status: normalizePoStatus(po.status),
  shipping_address: po.shipping_address ?? po.shippingAddress ?? "",
  billing_address: po.billing_address ?? po.billingAddress ?? "",
  remarks: po.remarks ?? "",
  po_type: po.po_type ?? po.poType ?? "Standard",
  created_by_name: po.created_by_name ?? po.createdByName ?? "",
  approval_records: po.approval_records ?? po.approvalRecords ?? po.approvals ?? [],
});
