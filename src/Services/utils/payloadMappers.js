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

const mapInvoiceLineItemForCreate = (item = {}) => {
  const quantity = Number(item.quantity ?? item.qty ?? 1) || 1;
  const unitPrice =
    Number(item.unit_price ?? item.unit_rate ?? item.unitPrice ?? item.price ?? 0) || 0;
  const amount =
    Number(item.amount ?? item.lineTotal ?? quantity * unitPrice) || quantity * unitPrice;

  return {
    description: item.description ?? item.name ?? "",
    quantity,
    unit_price: unitPrice,
    amount,
    hsn_sac: item.hsn_sac ?? item.hsnSac ?? "",
    tax: item.tax ?? "",
    ledger: item.ledger ?? "",
    discount: Number(item.discount ?? 0) || 0,
    discount_type: item.discount_type ?? item.discountType ?? "%",
    eligible_for_itc: item.eligible_for_itc ?? item.eligibleForItc ?? true,
  };
};

const toInvoiceLineItemApiPayload = (item = {}) => {
  const mapped = mapInvoiceLineItemForCreate(item);
  const {
    unit_price,
    unit_rate,
    eligible_for_itc,
    hsn_sac,
    discount_type,
    ...rest
  } = { ...item, ...mapped };

  return {
    description: rest.description ?? mapped.description,
    quantity: rest.quantity ?? mapped.quantity,
    amount: rest.amount ?? mapped.amount,
    tax: rest.tax ?? mapped.tax,
    ledger: rest.ledger ?? mapped.ledger,
    discount: rest.discount ?? mapped.discount,
    discountType: rest.discountType ?? discount_type ?? mapped.discount_type,
    unitPrice: rest.unitPrice ?? unit_price ?? unit_rate ?? mapped.unit_price,
    eligibleForItc: rest.eligibleForItc ?? eligible_for_itc ?? mapped.eligible_for_itc,
    hsnSac: rest.hsnSac ?? hsn_sac ?? mapped.hsn_sac,
  };
};

const toInvoiceLineItemUiPayload = (item = {}) => ({
  ...item,
  unit_price: item.unit_price ?? item.unitPrice,
  eligible_for_itc: item.eligible_for_itc ?? item.eligibleForItc,
  hsn_sac: item.hsn_sac ?? item.hsnSac,
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
  };
};

export const toInvoiceUiPayload = (invoice = {}) => ({
  ...invoice,
  invoice_number: invoice.invoice_number ?? invoice.invoiceNumber,
  vendor_id: invoice.vendor_id ?? invoice.vendorId,
  vendor_name: invoice.vendor_name ?? invoice.vendorName,
  line_items: (invoice.line_items ?? invoice.lineItems)?.map?.(toInvoiceLineItemUiPayload) ?? [],
  invoice_date: invoice.invoice_date ?? invoice.invoiceDate,
  due_date: invoice.due_date ?? invoice.dueDate,
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
});
