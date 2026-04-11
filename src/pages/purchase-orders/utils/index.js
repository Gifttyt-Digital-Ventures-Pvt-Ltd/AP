export const formatCurrency = (amount) => {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
  }).format(amount || 0);
};

export const formatDate = (dateStr) => {
  if (!dateStr) return "-";
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

export const truncateText = (value, max = 12) => {
  const text = String(value ?? "");
  if (!text) return "-";
  return text.length > max ? `${text.substring(0, max)}...` : text;
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
  gl_account_id: item.gl_account_id ?? item.glAccountId ?? "",
  cost_center_id: item.cost_center_id ?? item.costCenterId ?? "",
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
  shipping_address: po.shipping_address ?? po.shippingAddress ?? "",
  billing_address: po.billing_address ?? po.billingAddress ?? "",
  po_type: po.po_type ?? po.poType ?? "Standard",
  created_by_name: po.created_by_name ?? po.createdByName ?? "",
  approval_records: po.approval_records ?? po.approvalRecords ?? po.approvals ?? [],
});

export const normalizeGlAccount = (account = {}) => ({
  ...account,
  account_code: account.account_code ?? account.accountCode ?? "",
  account_name: account.account_name ?? account.accountName ?? "",
  account_type: account.account_type ?? account.accountType ?? "",
  is_active: account.is_active ?? account.isActive ?? true,
});

export const normalizeCostCenter = (center = {}) => ({
  ...center,
  cost_center_code: center.cost_center_code ?? center.costCenterCode ?? "",
  cost_center_name: center.cost_center_name ?? center.costCenterName ?? "",
});

export const normalizeHsnSacCode = (code = {}) => ({
  ...code,
  hsn_sac_code: code.hsn_sac_code ?? code.hsnSacCode ?? code.code ?? "",
});
