export const SUPPORTED_PO_CURRENCIES = ["INR", "USD", "EUR", "GBP"];

export const DEFAULT_PO_FORMAT_CONFIG = {
  id: "default-format",
  name: "Standard GST Format",
  defaultCurrency: "INR",
  companyName: "Optifii AP",
  poNumberPrefix: "PO-",
  dateFormat: "DD/MM/YYYY",
  templateCode: "T1",
  sections: [
    {
      section: "HEADER",
      label: "Header",
      isEnabled: true,
      fields: [
        { fieldKey: "h_logo", label: "Company Logo", isEnabled: true, isSystemField: false },
        { fieldKey: "po_number", label: "PO Number", isEnabled: true, isSystemField: true },
        { fieldKey: "po_date", label: "PO Date", isEnabled: true, isSystemField: true },
        { fieldKey: "valid_till", label: "Valid Till", isEnabled: true, isSystemField: false },
      ],
    },
    {
      section: "VENDOR",
      label: "Vendor",
      isEnabled: true,
      fields: [
        { fieldKey: "vendor_name", label: "Vendor Name", isEnabled: true, isSystemField: true },
        { fieldKey: "vendor_gstin", label: "Vendor GSTIN", isEnabled: true, isCurrencyDependent: true },
        { fieldKey: "vendor_pan", label: "Vendor PAN", isEnabled: true, isCurrencyDependent: true },
      ],
    },
    {
      section: "SHIP_BILL",
      label: "Ship & Bill",
      isEnabled: true,
      fields: [
        { fieldKey: "ship_to_address", label: "Ship To", isEnabled: true },
        { fieldKey: "billing_address", label: "Bill To", isEnabled: true },
        { fieldKey: "place_of_supply", label: "Place of Supply", isEnabled: true, isCurrencyDependent: true },
      ],
    },
    {
      section: "LINE_ITEM",
      label: "Line Items",
      isEnabled: true,
      fields: [
        { fieldKey: "item_name", label: "Description", isEnabled: true, isSystemField: true },
        { fieldKey: "hsn_sac_code", label: "HSN/SAC", isEnabled: true, isCurrencyDependent: true },
        { fieldKey: "uom", label: "UOM", isEnabled: true },
        { fieldKey: "quantity", label: "Quantity", isEnabled: true, isSystemField: true },
        { fieldKey: "unit_rate", label: "Unit Rate", isEnabled: true, isSystemField: true },
        { fieldKey: "discount_percent", label: "Discount %", isEnabled: true },
        { fieldKey: "gst_rate", label: "GST Rate", isEnabled: true, isCurrencyDependent: true },
      ],
    },
    {
      section: "TAX_TOTALS",
      label: "Tax & Totals",
      isEnabled: true,
      fields: [
        { fieldKey: "tax_summary", label: "Tax Summary", isEnabled: true },
        { fieldKey: "is_tds_applicable", label: "TDS", isEnabled: false, isCurrencyDependent: true },
      ],
    },
    {
      section: "PAYMENT",
      label: "Payment",
      isEnabled: true,
      fields: [
        { fieldKey: "payment_terms", label: "Payment Terms", isEnabled: true },
        { fieldKey: "delivery_terms", label: "Delivery Terms", isEnabled: true },
        { fieldKey: "freight_terms", label: "Freight Terms", isEnabled: true },
      ],
    },
  ],
  configVersion: 0,
};

export const getTaxMode = (currency = "INR") => (currency === "INR" ? "GST" : "EXPORT");

export const isInrCurrency = (currency = "INR") => getTaxMode(currency) === "GST";

export const formatCurrency = (amount, currency = "INR") => {
  const safeCurrency = SUPPORTED_PO_CURRENCIES.includes(currency) ? currency : "INR";
  return new Intl.NumberFormat(safeCurrency === "INR" ? "en-IN" : "en-US", {
    style: "currency",
    currency: safeCurrency,
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
    ISSUED: "Issued",
    AMENDED: "Amended",
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
  discount_percent: item.discount_percent ?? item.discountPercent ?? 0,
  gst_rate: item.gst_rate ?? item.gstRate ?? 0,
  tax_amount: item.tax_amount ?? item.taxAmount ?? 0,
  total_amount: item.total_amount ?? item.totalAmount ?? item.lineTotal ?? item.amount ?? 0,
});

export const normalizePurchaseOrder = (po = {}) => ({
  ...po,
  po_number: po.po_number ?? po.poNumber,
  vendor_id: po.vendor_id ?? po.vendorId,
  vendor_name: po.vendor_name ?? po.vendorName,
  po_date: po.po_date ?? po.poDate,
  valid_till: po.valid_till ?? po.validTill ?? "",
  expected_delivery_date: po.expected_delivery_date ?? po.expectedDeliveryDate,
  currency: po.currency ?? "INR",
  exchange_rate: po.exchange_rate ?? po.exchangeRate ?? "",
  tax_mode: po.tax_mode ?? po.taxMode ?? getTaxMode(po.currency ?? "INR"),
  tds_applicable: po.tds_applicable ?? po.isTdsApplicable ?? false,
  tds_section: po.tds_section ?? po.tdsSection ?? "",
  tds_percent: po.tds_percent ?? po.tdsPercent ?? "",
  tds_amount: po.tds_amount ?? po.tdsAmount ?? 0,
  po_format_id: po.po_format_id ?? po.poFormatId ?? po.formatConfigId ?? "",
  po_format_name: po.po_format_name ?? po.poFormatName ?? po.formatName ?? "",
  template_code: po.template_code ?? po.templateCode ?? "",
  place_of_supply: po.place_of_supply ?? po.placeOfSupply ?? "",
  line_items: Array.isArray(po.line_items)
    ? po.line_items.map(normalizePoLineItem)
    : Array.isArray(po.lineItems)
      ? po.lineItems.map(normalizePoLineItem)
      : [],
  subtotal: po.subtotal ?? 0,
  tax_amount:
    po.tax_amount ??
    po.taxAmount ??
    Number(po.total_cgst ?? po.totalCgst ?? 0) +
      Number(po.total_sgst ?? po.totalSgst ?? 0) +
      Number(po.total_igst ?? po.totalIgst ?? 0) +
      Number(po.total_cess ?? po.totalCess ?? 0),
  total_amount: po.total_amount ?? po.totalAmount ?? po.grand_total ?? po.grandTotal ?? 0,
  net_payable: po.net_payable ?? po.netPayable ?? po.total_amount ?? po.totalAmount ?? po.grand_total ?? po.grandTotal ?? 0,
  status: normalizePoStatus(po.status),
  shipping_address: po.shipping_address ?? po.shippingAddress ?? "",
  billing_address: po.billing_address ?? po.billingAddress ?? "",
  delivery_terms: po.delivery_terms ?? po.deliveryTerms ?? "",
  freight_terms: po.freight_terms ?? po.freightTerms ?? "",
  payment_terms: po.payment_terms ?? po.paymentTerms ?? "",
  remarks: po.remarks ?? "",
  created_by_name: po.created_by_name ?? po.createdByName ?? "",
  approval_records: po.approval_records ?? po.approvalRecords ?? po.approvals ?? [],
});

export const sanitizeLineItemForCurrency = (item = {}, currency = "INR") => {
  if (isInrCurrency(currency)) {
    return {
      ...item,
      hsn_sac_code: item.hsn_sac_code ?? "",
      gst_rate: item.gst_rate ?? 18,
    };
  }

  return {
    ...item,
    hsn_sac_code: "",
    gst_rate: 0,
  };
};

export const isFormatSectionEnabled = (formatConfig = {}, sectionKey = "") => {
  const section = (formatConfig.sections || []).find((item) => item.section === sectionKey);
  return section ? Boolean(section.isEnabled) : true;
};

export const isFormatFieldEnabled = (formatConfig = {}, sectionKey = "", fieldKey = "") => {
  const section = (formatConfig.sections || []).find((item) => item.section === sectionKey);
  if (!section) return true;
  if (!section.isEnabled) return false;
  const field = (section.fields || []).find((item) => item.fieldKey === fieldKey);
  return field ? Boolean(field.isEnabled) : true;
};

export const buildCreatePurchaseOrderPayload = (form = {}, formatConfig = null) => {
  const currency = form.currency || "INR";
  const isInr = isInrCurrency(currency);
  const headerOn = (key) => !formatConfig || isFormatFieldEnabled(formatConfig, "HEADER", key);
  const shipBillOn = (key) => !formatConfig || isFormatFieldEnabled(formatConfig, "SHIP_BILL", key);
  const paymentOn = (key) => !formatConfig || isFormatFieldEnabled(formatConfig, "PAYMENT", key);
  const taxTotalsOn = (key) => !formatConfig || isFormatFieldEnabled(formatConfig, "TAX_TOTALS", key);
  const lineOn = (key) => !formatConfig || isFormatFieldEnabled(formatConfig, "LINE_ITEM", key);
  const tdsApplicable = isInr && taxTotalsOn("is_tds_applicable") && Boolean(form.tds_applicable);

  return {
    vendorId: form.vendor_id,
    formatConfigId: form.po_format_id || null,
    poDate: form.po_date,
    validTill: headerOn("valid_till") ? form.valid_till || null : null,
    currency,
    exchangeRate: isInr ? null : Number(form.exchange_rate) || null,
    placeOfSupply: isInr && shipBillOn("place_of_supply") ? form.place_of_supply || null : null,
    expectedDeliveryDate: form.expected_delivery_date || null,
    deliveryTerms: paymentOn("delivery_terms") ? form.delivery_terms || "" : "",
    freightTerms: paymentOn("freight_terms") ? form.freight_terms || "" : "",
    paymentTerms: paymentOn("payment_terms") ? form.payment_terms || "" : "",
    isTdsApplicable: tdsApplicable,
    tdsSection: tdsApplicable ? form.tds_section || null : null,
    tdsPercent: tdsApplicable ? Number(form.tds_percent) || null : null,
    shipToAddress: shipBillOn("ship_to_address") ? form.shipping_address || null : null,
    billingAddress: shipBillOn("billing_address") ? form.billing_address || null : null,
    remarks: form.remarks || "",
    lineItems: (form.line_items || []).map((item) => {
      const quantity = Number(item.quantity) || 0;
      const unitRate = Number(item.unit_price) || 0;
      const discountPercent = lineOn("discount_percent") ? Number(item.discount_percent) || 0 : 0;
      const baseLine = {
        itemDescription: item.item_description || "",
        quantity,
        unitOfMeasure: lineOn("uom") ? item.unit_of_measure || "NOS" : null,
        unitRate,
        discountPercent,
        remarks: item.remarks || "",
      };

      if (!isInr) return baseLine;

      return {
        ...baseLine,
        hsnSacCode: lineOn("hsn_sac_code") ? item.hsn_sac_code || "" : "",
        gstRate: lineOn("gst_rate") ? Number(item.gst_rate) || 0 : 0,
      };
    }),
  };
};

export const calculatePurchaseOrderPreview = (form = {}) => {
  const currency = form.currency || "INR";
  const isInr = isInrCurrency(currency);
  let subtotal = 0;
  let taxAmount = 0;
  const tdsApplicable = isInr && Boolean(form.tds_applicable);
  const tdsPercent = tdsApplicable ? Number(form.tds_percent) || 0 : 0;

  const lineItems = (form.line_items || []).map((item, index) => {
    const quantity = Number(item.quantity) || 0;
    const unitPrice = Number(item.unit_price) || 0;
    const discountPercent = Number(item.discount_percent) || 0;
    const gross = quantity * unitPrice;
    const discountAmount = gross * discountPercent / 100;
    const taxableValue = Math.max(gross - discountAmount, 0);
    const lineTax = isInr ? taxableValue * (Number(item.gst_rate) || 0) / 100 : 0;
    const totalAmount = taxableValue + lineTax;

    subtotal += taxableValue;
    taxAmount += lineTax;

    return {
      line_number: index + 1,
      item_description: item.item_description || "",
      hsn_sac_code: isInr ? item.hsn_sac_code || "" : "",
      quantity,
      unit_of_measure: item.unit_of_measure || "NOS",
      unit_price: unitPrice,
      discount_percent: discountPercent,
      gst_rate: isInr ? Number(item.gst_rate) || 0 : 0,
      tax_amount: lineTax,
      total_amount: totalAmount,
      remarks: item.remarks || "",
    };
  });

  const totalAmount = subtotal + taxAmount;
  const tdsAmount = subtotal * tdsPercent / 100;

  return {
    lineItems,
    subtotal,
    taxAmount,
    totalAmount,
    tdsAmount,
    netPayable: totalAmount - tdsAmount,
  };
};

export const buildDemoPurchaseOrder = ({ form = {}, vendor = {}, formatConfig = {}, sequence = 1, status = "DRAFT" }) => {
  const preview = calculatePurchaseOrderPreview(form);
  const currency = form.currency || "INR";
  const isInr = isInrCurrency(currency);
  const id = `demo-po-${Date.now()}`;

  return normalizePurchaseOrder({
    id,
    po_number: `PO-DEMO-${String(sequence).padStart(4, "0")}`,
    vendor_id: form.vendor_id,
    vendor_name: vendor?.name || "Demo Vendor",
    po_format_id: form.po_format_id || formatConfig.id || "",
    po_format_name: formatConfig.name || "Demo Format",
    template_code: formatConfig.templateCode || "T1",
    po_date: form.po_date,
    valid_till: form.valid_till,
    expected_delivery_date: form.expected_delivery_date,
    currency,
    exchange_rate: form.exchange_rate,
    tax_mode: getTaxMode(currency),
    tds_applicable: isInr && Boolean(form.tds_applicable),
    tds_section: isInr && form.tds_applicable ? form.tds_section : "",
    tds_percent: isInr && form.tds_applicable ? Number(form.tds_percent) || 0 : 0,
    tds_amount: preview.tdsAmount,
    place_of_supply: isInr ? form.place_of_supply : "",
    line_items: preview.lineItems,
    subtotal: preview.subtotal,
    tax_amount: preview.taxAmount,
    total_amount: preview.totalAmount,
    grand_total: preview.totalAmount,
    net_payable: preview.netPayable,
    status,
    current_approval_level: status === "PENDING_APPROVAL" ? 1 : null,
    approvals: [],
    shipping_address: form.shipping_address,
    billing_address: form.billing_address,
    delivery_terms: form.delivery_terms,
    freight_terms: form.freight_terms,
    payment_terms: form.payment_terms,
    remarks: form.remarks || "Demo PO generated locally until backend creation is ready.",
    created_by_name: "Demo User",
  });
};
