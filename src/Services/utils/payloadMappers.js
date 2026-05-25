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

const toInvoiceLineItemApiPayload = (item = {}) => {
  const {
    unit_price,
    eligible_for_itc,
    hsn_sac,
    ...rest
  } = item;

  return {
    ...rest,
    unitPrice: rest.unitPrice ?? unit_price,
    eligibleForItc: rest.eligibleForItc ?? eligible_for_itc,
    hsnSac: rest.hsnSac ?? hsn_sac,
  };
};

const toInvoiceLineItemUiPayload = (item = {}) => ({
  ...item,
  unit_price: item.unit_price ?? item.unitPrice,
  eligible_for_itc: item.eligible_for_itc ?? item.eligibleForItc,
  hsn_sac: item.hsn_sac ?? item.hsnSac,
});

export const toInvoiceApiPayload = (invoice = {}) => {
  const {
    invoice_number,
    vendor_id,
    vendor_name,
    line_items,
    invoice_date,
    due_date,
    source_email,
    file_id,
    file_hash,
    original_file_name,
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
    approval_records,
    gross_amount,
    gst_amount,
    tds_amount,
    net_amount,
    approval_workflow_name,
    approval_workflow_id,
    department_id,
    department_name,
    ...rest
  } = invoice;

  return {
    ...rest,
    invoiceNumber: rest.invoiceNumber ?? invoice_number,
    vendorId: rest.vendorId ?? vendor_id,
    vendorName: rest.vendorName ?? vendor_name,
    lineItems: (rest.lineItems ?? line_items)?.map?.(toInvoiceLineItemApiPayload) ?? [],
    invoiceDate: toLocalDateTimeString(rest.invoiceDate ?? invoice_date),
    dueDate: toLocalDateTimeString(rest.dueDate ?? due_date),
    sourceEmail: rest.sourceEmail ?? source_email,
    fileId: rest.fileId ?? file_id,
    fileHash: rest.fileHash ?? file_hash,
    originalFileName: rest.originalFileName ?? original_file_name,
    fileCategory: rest.fileCategory ?? file_category,
    workItemId: rest.workItemId ?? work_item_id,
    branchName: rest.branchName ?? branch_name,
    poNumber: rest.poNumber ?? po_number,
    poId: rest.poId ?? po_id,
    grnNumber: rest.grnNumber ?? grn_number,
    grnId: rest.grnId ?? grn_id,
    receiptFileUrl: rest.receiptFileUrl ?? receipt_file_url,
    invoiceFileUrl: rest.invoiceFileUrl ?? invoice_file_url,
    paymentDate: toLocalDateTimeString(rest.paymentDate ?? payment_date),
    createdByName: rest.createdByName ?? created_by_name,
    createdAt: rest.createdAt ?? created_at,
    matchingStatus: rest.matchingStatus ?? matching_status,
    approvalRecords: rest.approvalRecords ?? approval_records,
    grossAmount: rest.grossAmount ?? gross_amount,
    gstAmount: rest.gstAmount ?? gst_amount,
    tdsAmount: rest.tdsAmount ?? tds_amount,
    netAmount: rest.netAmount ?? net_amount,
    approvalWorkflowName: rest.approvalWorkflowName ?? approval_workflow_name,
    approvalWorkflowId: rest.approvalWorkflowId ?? approval_workflow_id,
    departmentId: rest.departmentId ?? department_id,
    departmentName: rest.departmentName ?? department_name,
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
});
