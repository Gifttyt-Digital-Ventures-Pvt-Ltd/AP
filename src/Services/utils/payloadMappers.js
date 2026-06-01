import { DEFAULT_CURRENCY, normalizeCurrencyCode } from "../../utils/currency";

const toLocalDateTimeString = (value) => {
  if (!value) return value;
  if (typeof value !== "string") return value;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return `${value}T00:00:00`;
  return value;
};

export const toVendorApiPayload = (vendor = {}) => {
  const {
    name,
    vendor_type,
    vendorType,
    email,
    phone,
    mobile,
    pan,
    gstin,
    address_line1,
    addressLine1,
    address_line2,
    addressLine2,
    city,
    state,
    pincode,
    country,
    bank_name,
    bankName,
    account_number,
    accountNumber,
    ifsc_code,
    ifscCode,
    branch,
    account_holder_name,
    accountHolderName,
    category,
    currency,
    payment_terms,
    paymentTerms,
    contact_person,
    contactPerson,
    website,
    notes,
  } = vendor;

  return {
    name,
    vendorType: vendorType ?? vendor_type,
    email,
    phone,
    mobile,
    pan,
    gstin,
    addressLine1: addressLine1 ?? address_line1,
    addressLine2: addressLine2 ?? address_line2,
    city,
    state,
    pincode,
    country,
    bankName: bankName ?? bank_name,
    accountNumber: accountNumber ?? account_number,
    ifscCode: ifscCode ?? ifsc_code,
    branch,
    accountHolderName: accountHolderName ?? account_holder_name,
    category,
    currency,
    paymentTerms: paymentTerms ?? payment_terms,
    contactPerson: contactPerson ?? contact_person,
    website,
    notes,
  };
};

export const toVendorUiPayload = (vendor = {}) => ({
  ...vendor,
  vendor_type: vendor.vendor_type ?? vendor.vendorType,
  address_line1: vendor.address_line1 ?? vendor.addressLine1,
  address_line2: vendor.address_line2 ?? vendor.addressLine2,
  bank_name: vendor.bank_name ?? vendor.bankName,
  account_number: vendor.account_number ?? vendor.accountNumber,
  ifsc_code: vendor.ifsc_code ?? vendor.ifscCode,
  account_holder_name: vendor.account_holder_name ?? vendor.accountHolderName,
  payment_terms: vendor.payment_terms ?? vendor.paymentTerms,
  contact_person: vendor.contact_person ?? vendor.contactPerson,
  created_by_email: vendor.created_by_email ?? vendor.createdByEmail,
  created_by_name: vendor.created_by_name ?? vendor.createdByName,
  created_by_id: vendor.created_by_id ?? vendor.createdById,
  created_by: vendor.created_by ?? vendor.createdBy,
  requested_by_email: vendor.requested_by_email ?? vendor.requestedByEmail,
  requested_by: vendor.requested_by ?? vendor.requestedBy,
});

export const extractVendorIdFromResponse = (response) => {
  if (!response) return "";
  const candidate = response?.vendor ?? response?.data ?? response;
  const id =
    candidate?.id ??
    candidate?.vendorId ??
    candidate?.vendor_id ??
    response?.id ??
    response?.vendorId ??
    response?.vendor_id;
  return id !== undefined && id !== null ? String(id) : "";
};

export const mergeInvoiceVendorOptions = (approvedVendors = [], pendingVendors = []) => {
  const merged = new Map();

  approvedVendors.forEach((vendor) => {
    if (vendor?.id === undefined || vendor?.id === null) return;
    merged.set(String(vendor.id), { ...vendor, is_pending_approval: false });
  });

  pendingVendors.forEach((vendor) => {
    if (vendor?.id === undefined || vendor?.id === null) return;
    merged.set(String(vendor.id), { ...vendor, is_pending_approval: true });
  });

  return Array.from(merged.values());
};

export const toBankAccountApiPayload = (account = {}) => {
  const {
    account_name,
    account_number,
    bank_name,
    account_type,
    ifsc_code,
    is_active,
    ...rest
  } = account;

  return {
    ...rest,
    accountName: rest.accountName ?? account_name,
    accountNumber: rest.accountNumber ?? account_number,
    bankName: rest.bankName ?? bank_name,
    accountType: rest.accountType ?? account_type,
    ifscCode: rest.ifscCode ?? ifsc_code,
    isActive: rest.isActive ?? is_active,
  };
};

export const toBankAccountUiPayload = (account = {}) => ({
  ...account,
  account_name: account.account_name ?? account.accountName,
  account_number: account.account_number ?? account.accountNumber,
  bank_name: account.bank_name ?? account.bankName,
  account_type: account.account_type ?? account.accountType,
  ifsc_code: account.ifsc_code ?? account.ifscCode,
  is_active: account.is_active ?? account.isActive,
});

const normalizeDepartmentId = (value) => {
  if (value === "" || value === null || value === undefined) return undefined;
  const numeric = Number(value);
  return Number.isNaN(numeric) ? value : numeric;
};

/** Mirrors invoice form TAX_RATES — used to map UI tax labels to API gstRate */
const INVOICE_TAX_RATE_OPTIONS = [
  { value: "CGST + SGST 5%", cgst: 2.5, sgst: 2.5 },
  { value: "CGST + SGST 12%", cgst: 6, sgst: 6 },
  { value: "CGST + SGST 18%", cgst: 9, sgst: 9 },
  { value: "CGST + SGST 28%", cgst: 14, sgst: 14 },
  { value: "IGST 5%", igst: 5 },
  { value: "IGST 12%", igst: 12 },
  { value: "IGST 18%", igst: 18 },
  { value: "IGST 28%", igst: 28 },
  { value: "Exempt", cgst: 0, sgst: 0 },
];

export const resolveGstRateFromLineItem = (item = {}) => {
  const direct = item.gstRate ?? item.gst_rate;
  if (direct !== null && direct !== undefined && direct !== "") {
    const numeric = Number(direct);
    return Number.isFinite(numeric) ? numeric : undefined;
  }

  const explicitRate = item.tax_rate ?? item.taxRate;
  if (explicitRate !== null && explicitRate !== undefined && explicitRate !== "") {
    const numeric = Number(explicitRate);
    return Number.isFinite(numeric) ? numeric : undefined;
  }

  const taxLabel = String(item.tax ?? "").trim();
  if (!taxLabel) return undefined;

  const match = INVOICE_TAX_RATE_OPTIONS.find((option) => option.value === taxLabel);
  if (match) {
    if (match.igst != null) return match.igst;
    if (match.cgst != null && match.sgst != null) return match.cgst + match.sgst;
    return 0;
  }

  if (/exempt/i.test(taxLabel)) return 0;

  const percentMatch = taxLabel.match(/(\d+(?:\.\d+)?)\s*%/);
  if (percentMatch) {
    const numeric = Number(percentMatch[1]);
    return Number.isFinite(numeric) ? numeric : undefined;
  }

  return undefined;
};

const inferTaxLabelFromGstRate = (gstRate) => {
  const rate = Number(gstRate);
  if (!Number.isFinite(rate)) return "";
  if (rate === 0) return "Exempt";

  const match = INVOICE_TAX_RATE_OPTIONS.find((option) => {
    if (option.igst != null) return option.igst === rate;
    if (option.cgst != null && option.sgst != null) return option.cgst + option.sgst === rate;
    return false;
  });

  return match?.value ?? "";
};

const mapInvoiceLineItemForCreate = (item = {}) => {
  const quantity = Number(item.quantity ?? item.qty ?? 1) || 1;
  const unitPrice =
    Number(item.unit_price ?? item.unit_rate ?? item.unitPrice ?? item.price ?? 0) || 0;
  const amount =
    Number(item.amount ?? item.lineTotal ?? quantity * unitPrice) || quantity * unitPrice;
  const gstRate = resolveGstRateFromLineItem(item);

  return {
    description: item.description ?? item.name ?? "",
    quantity,
    unit_price: unitPrice,
    amount,
    hsn_sac: item.hsn_sac ?? item.hsnSac ?? "",
    ...(gstRate !== undefined ? { gst_rate: gstRate } : {}),
    // UI-only fields kept for form state / totals (stripped in toInvoiceLineItemApiPayload)
    tax: item.tax ?? "",
    ledger: item.ledger ?? "",
    discount: Number(item.discount ?? 0) || 0,
    discount_type: item.discount_type ?? item.discountType ?? "%",
    eligible_for_itc: item.eligible_for_itc ?? item.eligibleForItc ?? true,
  };
};

/** Backend LineItem: description, quantity, unitPrice, amount, hsnSac, gstRate, itemCode, uom */
const toInvoiceLineItemApiPayload = (item = {}) => {
  const quantity = Number(item.quantity ?? item.qty ?? 1) || 1;
  const unitPrice =
    Number(item.unit_price ?? item.unit_rate ?? item.unitPrice ?? item.price ?? 0) || 0;
  const amount =
    Number(item.amount ?? item.lineTotal ?? quantity * unitPrice) || quantity * unitPrice;
  const gstRate = resolveGstRateFromLineItem(item);
  const hsnSac = String(item.hsn_sac ?? item.hsnSac ?? "").trim();
  const itemCode = String(item.item_code ?? item.itemCode ?? "").trim();
  const uom = String(item.uom ?? item.unit_of_measure ?? item.unitOfMeasure ?? "").trim();

  const payload = {
    description: item.description ?? item.name ?? "",
    quantity,
    unitPrice,
    amount,
  };

  if (hsnSac) payload.hsnSac = hsnSac;
  if (gstRate !== undefined) payload.gstRate = gstRate;
  if (itemCode) payload.itemCode = itemCode;
  if (uom) payload.uom = uom;

  return payload;
};

const toInvoiceLineItemUiPayload = (item = {}) => ({
  ...item,
  unit_price: item.unit_price ?? item.unitPrice,
  unit_rate: item.unit_rate ?? item.unitPrice ?? item.unit_price,
  hsn_sac: item.hsn_sac ?? item.hsnSac,
  gst_rate: item.gst_rate ?? item.gstRate,
  tax: item.tax ?? inferTaxLabelFromGstRate(item.gst_rate ?? item.gstRate),
  eligible_for_itc: item.eligible_for_itc ?? item.eligibleForItc,
});

const resolveInvoiceCategoryPayload = (invoice = {}) => {
  const category = invoice.category;
  const categoryId =
    category?.id ?? invoice.category_id ?? invoice.categoryId ?? undefined;
  if (categoryId === undefined || categoryId === null || categoryId === "") {
    return undefined;
  }
  const numericId = Number(categoryId);
  return {
    id: Number.isNaN(numericId) ? categoryId : numericId,
    name:
      category?.name ??
      invoice.category_name ??
      invoice.categoryName ??
      "",
  };
};

export const buildCreateInvoiceRequestBody = (invoice = {}, options = {}) => {
  const { totals, tdsAmount, uploadedFileName, categoryEnabled = true } = options;
  const lineItemsSource = invoice.line_items ?? invoice.lineItems ?? [];
  const lineItems = Array.isArray(lineItemsSource)
    ? lineItemsSource.map(mapInvoiceLineItemForCreate)
    : [];

  const subTotalFromLines = lineItems.reduce(
    (sum, item) => sum + (Number(item.amount) || 0),
    0,
  );
  const gstAmount =
    totals != null
      ? (Number(totals.cgst) || 0) + (Number(totals.sgst) || 0) + (Number(totals.igst) || 0)
      : Number(invoice.gst_amount ?? invoice.gstAmount ?? 0);
  const amount =
    totals?.total != null
      ? Number(totals.total)
      : Number(invoice.amount ?? subTotalFromLines + gstAmount) || 0;
  const resolvedTdsAmount =
    tdsAmount != null
      ? Number(tdsAmount)
      : Number(invoice.tds_amount ?? invoice.tdsAmount ?? 0);

  const source = invoice.source || "Upload";
  const originalFileName =
    invoice.original_file_name ??
    invoice.original_filename ??
    invoice.originalFileName ??
    null;
  const currentFileName =
    invoice.current_file_name ??
    invoice.currentFileName ??
    uploadedFileName ??
    originalFileName;

  const category = categoryEnabled ? resolveInvoiceCategoryPayload(invoice) : undefined;

  return {
    invoice_number: invoice.invoice_number ?? invoice.invoiceNumber ?? "",
    vendor_id: invoice.vendor_id ?? invoice.vendorId ?? "",
    vendor_name: invoice.vendor_name ?? invoice.vendorName ?? "",
    invoice_date: invoice.invoice_date ?? invoice.invoiceDate ?? "",
    due_date: invoice.due_date ?? invoice.dueDate ?? "",
    amount,
    gst_amount: gstAmount,
    tds_amount: resolvedTdsAmount,
    currency: invoice.currency || "INR",
    line_items: lineItems,
    memo:
      invoice.memo ??
      invoice.description ??
      (Array.isArray(invoice.notes) ? invoice.notes.join("\n") : "") ??
      "",
    source,
    source_email: source === "Email" ? invoice.source_email ?? invoice.sourceEmail ?? null : null,
    original_file_name: originalFileName,
    current_file_name: currentFileName,
    file_id: invoice.file_id ?? invoice.fileId ?? null,
    file_hash: invoice.file_hash ?? invoice.fileHash ?? null,
    invoice_file_url: invoice.invoice_file_url ?? invoice.invoiceFileUrl ?? null,
    receipt_file_url: invoice.receipt_file_url ?? invoice.receiptFileUrl ?? null,
    file_category: invoice.file_category ?? invoice.fileCategory ?? "Expense Invoice",
    branch_name: invoice.branch_name ?? invoice.branchName ?? "",
    work_item_id: invoice.work_item_id ?? invoice.workItemId ?? "",
    department_id: normalizeDepartmentId(invoice.department_id ?? invoice.departmentId),
    department_name: invoice.department_name ?? invoice.departmentName ?? "",
    po_id: invoice.po_id ?? invoice.poId ?? "",
    po_number: invoice.po_number ?? invoice.poNumber ?? "",
    grn_id: invoice.grn_id ?? invoice.grnId ?? "",
    grn_number: invoice.grn_number ?? invoice.grnNumber ?? "",
    matching_id: invoice.matching_id ?? invoice.matchingId ?? "",
    workflow_id:
      invoice.workflow_id ??
      invoice.workflowId ??
      invoice.approval_workflow_id ??
      invoice.approvalWorkflowId,
    workflow_name:
      invoice.workflow_name ??
      invoice.workflowName ??
      invoice.approval_workflow_name ??
      invoice.approvalWorkflowName ??
      "",
    ...(category ? { category, category_id: category.id, category_name: category.name } : {}),
    gst_treatment: invoice.gst_treatment ?? invoice.gstTreatment ?? "",
    gstin:
      invoice.gstin ??
      invoice.vendor_gstin ??
      invoice.vendorGstin ??
      "",
    source_of_supply: invoice.source_of_supply ?? invoice.sourceOfSupply ?? "",
    destination_of_supply:
      invoice.destination_of_supply ?? invoice.destinationOfSupply ?? "",
    billing_address: invoice.billing_address ?? invoice.billingAddress ?? "",
    shipping_address: invoice.shipping_address ?? invoice.shippingAddress ?? "",
    discounts_level: invoice.discounts_level ?? invoice.discountsLevel ?? "",
    invoice_discount: Number(
      invoice.invoice_discount ?? invoice.invoiceDiscount ?? 0,
    ),
    invoice_discount_type:
      invoice.invoice_discount_type ?? invoice.invoiceDiscountType ?? "%",
  };
};

export const toInvoiceApiPayload = (invoice = {}) => {
  const {
    invoice_number,
    vendor_id,
    vendor_name,
    line_items,
    invoice_date,
    due_date,
    source,
    source_email,
    file_id,
    file_hash,
    original_file_name,
    current_file_name,
    file_category,
    work_item_id,
    branch_name,
    po_number,
    po_id,
    grn_number,
    grn_id,
    receipt_file_url,
    invoice_file_url,
    payment_date,
    created_by_name,
    created_at,
    matching_status,
    matching_id,
    approval_records,
    gross_amount,
    gst_amount,
    tds_amount,
    net_amount,
    approval_workflow_name,
    approval_workflow_id,
    workflow_id,
    workflow_name,
    department_id,
    department_name,
    category,
    category_id,
    category_name,
    amount,
    currency,
    memo,
  } = invoice;

  const normalizedSource = source || "Upload";
  const categoryPayload = resolveInvoiceCategoryPayload(invoice);

  return {
    invoiceNumber: invoice.invoice_number ?? invoice.invoiceNumber ?? invoice_number,
    vendorId: invoice.vendor_id ?? invoice.vendorId ?? vendor_id,
    vendorName: invoice.vendor_name ?? invoice.vendorName ?? vendor_name,
    lineItems: (invoice.line_items ?? invoice.lineItems ?? line_items)?.map?.(
      toInvoiceLineItemApiPayload,
    ) ?? [],
    invoiceDate: toLocalDateTimeString(invoice.invoice_date ?? invoice.invoiceDate ?? invoice_date),
    dueDate: toLocalDateTimeString(invoice.due_date ?? invoice.dueDate ?? due_date),
    amount: amount != null ? Number(amount) : undefined,
    gstAmount: gst_amount != null ? Number(gst_amount) : invoice.gstAmount,
    tdsAmount: tds_amount != null ? Number(tds_amount) : invoice.tdsAmount,
    currency: currency || "INR",
    memo: memo ?? invoice.description,
    source: normalizedSource,
    sourceEmail:
      normalizedSource === "Email"
        ? invoice.source_email ?? invoice.sourceEmail ?? source_email
        : null,
    fileId: invoice.file_id ?? invoice.fileId ?? file_id,
    fileHash: invoice.file_hash ?? invoice.fileHash ?? file_hash,
    originalFileName:
      invoice.original_file_name ??
      invoice.original_filename ??
      invoice.originalFileName ??
      original_file_name,
    currentFileName:
      invoice.current_file_name ?? invoice.currentFileName ?? current_file_name,
    fileCategory: invoice.file_category ?? invoice.fileCategory ?? file_category,
    workItemId: invoice.work_item_id ?? invoice.workItemId ?? work_item_id,
    branchName: invoice.branch_name ?? invoice.branchName ?? branch_name,
    poNumber: invoice.po_number ?? invoice.poNumber ?? po_number,
    poId: invoice.po_id ?? invoice.poId ?? po_id,
    grnNumber: invoice.grn_number ?? invoice.grnNumber ?? grn_number,
    grnId: invoice.grn_id ?? invoice.grnId ?? grn_id,
    receiptFileUrl: invoice.receipt_file_url ?? invoice.receiptFileUrl ?? receipt_file_url,
    invoiceFileUrl: invoice.invoice_file_url ?? invoice.invoiceFileUrl ?? invoice_file_url,
    paymentDate: toLocalDateTimeString(invoice.payment_date ?? invoice.paymentDate ?? payment_date),
    createdByName: invoice.created_by_name ?? invoice.createdByName ?? created_by_name,
    createdAt: invoice.created_at ?? invoice.createdAt ?? created_at,
    matchingStatus: invoice.matching_status ?? invoice.matchingStatus ?? matching_status,
    matchingId: invoice.matching_id ?? invoice.matchingId ?? matching_id,
    approvalRecords: invoice.approval_records ?? invoice.approvalRecords ?? approval_records,
    grossAmount: invoice.gross_amount ?? invoice.grossAmount ?? gross_amount,
    netAmount: invoice.net_amount ?? invoice.netAmount ?? net_amount,
    workflowId:
      invoice.workflow_id ??
      invoice.workflowId ??
      workflow_id ??
      approval_workflow_id ??
      invoice.approvalWorkflowId,
    workflowName:
      invoice.workflow_name ??
      invoice.workflowName ??
      workflow_name ??
      approval_workflow_name ??
      invoice.approvalWorkflowName,
    departmentId: normalizeDepartmentId(
      invoice.department_id ?? invoice.departmentId ?? department_id,
    ),
    departmentName: invoice.department_name ?? invoice.departmentName ?? department_name,
    category: categoryPayload ?? category,
    gstTreatment: invoice.gst_treatment ?? invoice.gstTreatment,
    gstin: invoice.gstin ?? invoice.vendor_gstin ?? invoice.vendorGstin,
    sourceOfSupply: invoice.source_of_supply ?? invoice.sourceOfSupply,
    destinationOfSupply: invoice.destination_of_supply ?? invoice.destinationOfSupply,
    billingAddress: invoice.billing_address ?? invoice.billingAddress,
    shippingAddress: invoice.shipping_address ?? invoice.shippingAddress,
    discountsLevel: invoice.discounts_level ?? invoice.discountsLevel,
    invoiceDiscount: invoice.invoice_discount ?? invoice.invoiceDiscount,
    invoiceDiscountType: invoice.invoice_discount_type ?? invoice.invoiceDiscountType,
  };
};

export const toInvoiceUiPayload = (invoice = {}) => ({
  ...invoice,
  currency: normalizeCurrencyCode(invoice.currency ?? invoice.currencyCode ?? DEFAULT_CURRENCY),
  invoice_number: invoice.invoice_number ?? invoice.invoiceNumber,
  vendor_id: invoice.vendor_id ?? invoice.vendorId,
  vendor_name: invoice.vendor_name ?? invoice.vendorName,
  line_items: (invoice.line_items ?? invoice.lineItems)?.map?.(toInvoiceLineItemUiPayload) ?? [],
  invoice_date: invoice.invoice_date ?? invoice.invoiceDate,
  due_date: invoice.due_date ?? invoice.dueDate,
  amount: invoice.amount ?? invoice.net_amount ?? invoice.netAmount,
  memo: invoice.memo ?? invoice.description,
  billing_address:
    invoice.billing_address ??
    invoice.billingAddress ??
    invoice.vendor_address ??
    invoice.vendorAddress,
  vendor_address: invoice.vendor_address ?? invoice.vendorAddress,
  gst_treatment: invoice.gst_treatment ?? invoice.gstTreatment,
  gstin: invoice.gstin ?? invoice.vendor_gstin ?? invoice.vendorGstin,
  source_of_supply:
    invoice.source_of_supply ??
    invoice.sourceOfSupply ??
    invoice.place_of_supply ??
    invoice.placeOfSupply,
  destination_of_supply:
    invoice.destination_of_supply ??
    invoice.destinationOfSupply ??
    invoice.place_of_supply ??
    invoice.placeOfSupply,
  location: invoice.location ?? invoice.place_of_supply ?? invoice.placeOfSupply,
  place_of_supply: invoice.place_of_supply ?? invoice.placeOfSupply,
  reverse_charges: invoice.reverse_charges ?? invoice.reverseCharges,
  discounts_level: invoice.discounts_level ?? invoice.discountsLevel,
  source: invoice.source,
  source_email: invoice.source_email ?? invoice.sourceEmail,
  file_id: invoice.file_id ?? invoice.fileId,
  file_hash: invoice.file_hash ?? invoice.fileHash,
  original_file_name: invoice.original_file_name ?? invoice.originalFileName,
  file_category: invoice.file_category ?? invoice.fileCategory,
  work_item_id: invoice.work_item_id ?? invoice.workItemId,
  branch_name: invoice.branch_name ?? invoice.branchName,
  po_number: invoice.po_number ?? invoice.poNumber,
  po_id: invoice.po_id ?? invoice.poId,
  grn_number: invoice.grn_number ?? invoice.grnNumber,
  grn_id: invoice.grn_id ?? invoice.grnId,
  receipt_file_url: invoice.receipt_file_url ?? invoice.receiptFileUrl,
  invoice_file_url: invoice.invoice_file_url ?? invoice.invoiceFileUrl,
  payment_date: invoice.payment_date ?? invoice.paymentDate,
  created_by_name: invoice.created_by_name ?? invoice.createdByName,
  created_by_email: invoice.created_by_email ?? invoice.createdByEmail,
  created_by_id: invoice.created_by_id ?? invoice.createdById,
  created_by: invoice.created_by ?? invoice.createdBy,
  created_at: invoice.created_at ?? invoice.createdAt,
  matching_status: invoice.matching_status ?? invoice.matchingStatus,
  approval_records: invoice.approval_records ?? invoice.approvalRecords,
  gross_amount: invoice.gross_amount ?? invoice.grossAmount,
  gst_amount: invoice.gst_amount ?? invoice.gstAmount,
  tds_amount: invoice.tds_amount ?? invoice.tdsAmount,
  net_amount: invoice.net_amount ?? invoice.netAmount,
  approval_workflow_name: invoice.approval_workflow_name ?? invoice.approvalWorkflowName,
  approval_workflow_id: invoice.approval_workflow_id ?? invoice.approvalWorkflowId,
  department_id: invoice.department_id ?? invoice.departmentId,
  department_name: invoice.department_name ?? invoice.departmentName,
  category: invoice.category,
  category_id: invoice.category_id ?? invoice.categoryId ?? invoice.category?.id,
  category_name: invoice.category_name ?? invoice.categoryName ?? invoice.category?.name,
  current_file_name: invoice.current_file_name ?? invoice.currentFileName,
  matching_id: invoice.matching_id ?? invoice.matchingId,
  workflow_id:
    invoice.workflow_id ??
    invoice.workflowId ??
    invoice.approval_workflow_id ??
    invoice.approvalWorkflowId,
  workflow_name:
    invoice.workflow_name ??
    invoice.workflowName ??
    invoice.approval_workflow_name ??
    invoice.approvalWorkflowName,
  required_approval_levels:
    invoice.required_approval_levels ?? invoice.requiredApprovalLevels,
  current_approval_level:
    invoice.current_approval_level ?? invoice.currentApprovalLevel,
  is_sequential_approval:
    invoice.is_sequential_approval ?? invoice.isSequentialApproval,
});
