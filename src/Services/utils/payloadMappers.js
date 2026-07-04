import { parseMsmeValue } from '../../utils/vendorValidation';
import { sanitizeVendorTdsForSave } from '../../pages/vendors/utils/vendorTds';

export const toVendorApiPayload = (vendor = {}) => {
  const {
    name,
    trade_name,
    tradeName,
    vendor_type,
    vendorType,
    msme,
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
    contact_person,
    contactPerson,
    website,
    notes,
    status,
    action,
    documents,
    vendorDocuments,
    vendor_documents,
    tdsMapping,
    tds_mapping,
    tdsMappings,
    tds_mappings,
    gstRegistrations,
    gst_regs,
    gstRegs,
    gst_registrations,
    vendorBranches,
    vendor_branches,
    branchDetails,
    branch_details,
  } = vendor;

  const resolvedMsme = parseMsmeValue(msme);
  const msmeBoolean = resolvedMsme === null ? false : resolvedMsme;
  const resolvedTdsMapping = sanitizeVendorTdsForSave(
    tdsMapping ??
      tds_mapping ??
      (Array.isArray(tdsMappings ?? tds_mappings) ? (tdsMappings ?? tds_mappings)[0] : null),
  );
  const resolvedGstRegistrations =
    gstRegistrations ?? gst_regs ?? gstRegs ?? gst_registrations ?? undefined;
  const resolvedVendorBranches =
    vendorBranches ?? vendor_branches ?? branchDetails ?? branch_details ?? undefined;
  const resolvedDocuments = documents ?? vendorDocuments ?? vendor_documents ?? undefined;

  return {
    name,
    tradeName: tradeName ?? trade_name,
    vendorType: vendorType ?? vendor_type,
    msme: msmeBoolean,
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
    contactPerson: contactPerson ?? contact_person,
    website,
    notes,
    ...(resolvedDocuments !== undefined ? { documents: resolvedDocuments } : {}),
    ...(resolvedGstRegistrations !== undefined
      ? { gstRegistrations: resolvedGstRegistrations }
      : {}),
    ...(resolvedVendorBranches !== undefined
      ? { vendorBranches: resolvedVendorBranches }
      : {}),
    ...(resolvedTdsMapping ? { tdsMapping: resolvedTdsMapping } : {}),
    ...(status ? { status } : {}),
    ...(action ? { action } : {}),
  };
};

const addStringIfPresent = (payload, key, value) => {
  const nextValue = String(value ?? '').trim();
  if (nextValue) payload[key] = nextValue;
};

/** Vendor addition request payload — only company name and vendor type are mandatory. */
export const toVendorRequestApiPayload = (vendor = {}) => {
  const payload = {
    name: String(vendor.name ?? '').trim(),
    vendorType: vendor.vendorType ?? vendor.vendor_type,
  };

  addStringIfPresent(payload, 'tradeName', vendor.tradeName ?? vendor.trade_name);
  addStringIfPresent(payload, 'email', vendor.email);
  addStringIfPresent(payload, 'phone', vendor.phone);
  addStringIfPresent(payload, 'mobile', vendor.mobile);
  addStringIfPresent(payload, 'pan', vendor.pan);
  addStringIfPresent(payload, 'gstin', vendor.gstin);
  addStringIfPresent(payload, 'addressLine1', vendor.addressLine1 ?? vendor.address_line1);
  addStringIfPresent(payload, 'addressLine2', vendor.addressLine2 ?? vendor.address_line2);
  addStringIfPresent(payload, 'city', vendor.city);
  addStringIfPresent(payload, 'state', vendor.state);
  addStringIfPresent(payload, 'pincode', vendor.pincode);
  addStringIfPresent(payload, 'country', vendor.country);
  addStringIfPresent(payload, 'bankName', vendor.bankName ?? vendor.bank_name);
  addStringIfPresent(payload, 'accountNumber', vendor.accountNumber ?? vendor.account_number);
  addStringIfPresent(payload, 'ifscCode', vendor.ifscCode ?? vendor.ifsc_code);
  addStringIfPresent(payload, 'branch', vendor.branch);
  addStringIfPresent(payload, 'accountHolderName', vendor.accountHolderName ?? vendor.account_holder_name);
  addStringIfPresent(payload, 'category', vendor.category);
  addStringIfPresent(payload, 'currency', vendor.currency);
  addStringIfPresent(payload, 'contactPerson', vendor.contactPerson ?? vendor.contact_person);
  addStringIfPresent(payload, 'website', vendor.website);
  addStringIfPresent(payload, 'notes', vendor.notes);

  const resolvedDocuments = vendor.documents ?? vendor.vendorDocuments ?? vendor.vendor_documents;
  if (resolvedDocuments && Object.keys(resolvedDocuments).length > 0) {
    payload.documents = resolvedDocuments;
  }

  const resolvedGstRegistrations =
    vendor.gstRegistrations ?? vendor.gst_regs ?? vendor.gstRegs ?? vendor.gst_registrations;
  if (Array.isArray(resolvedGstRegistrations)) {
    const filledRegistrations = resolvedGstRegistrations.filter((registration) =>
      String(registration?.gstin ?? '').trim());
    if (filledRegistrations.length > 0) payload.gstRegistrations = filledRegistrations;
  }

  return payload;
};

const buildUiVendorGstRegistrations = (vendor = {}) => {
  const registrations =
    vendor.gstRegistrations ??
    vendor.gst_regs ??
    vendor.gstRegs ??
    vendor.gst_registrations;

  if (Array.isArray(registrations) && registrations.length > 0) {
    return registrations;
  }

  const gstin = String(vendor.gstin || '').trim().toUpperCase();
  if (!gstin) return [];

  return [{
    gstin,
    state: vendor.state || '',
    isPrimary: true,
  }];
};

export const toVendorUiPayload = (vendor = {}) => ({
  ...vendor,
  vendor_type: vendor.vendor_type ?? vendor.vendorType,
  gstin: String(vendor.gstin || '').trim().toUpperCase() || vendor.gstin || '',
  gstRegistrations: buildUiVendorGstRegistrations(vendor),
  vendorBranches:
    vendor.vendorBranches ??
    vendor.vendor_branches ??
    vendor.branchDetails ??
    vendor.branch_details ??
    [],
  documents: vendor.documents ?? vendor.vendorDocuments ?? vendor.vendor_documents ?? {},
  tdsMapping:
    vendor.tdsMapping ??
    vendor.tds_mapping ??
    (Array.isArray(vendor.tdsMappings ?? vendor.tds_mappings)
      ? (vendor.tdsMappings ?? vendor.tds_mappings)[0]
      : null) ??
    vendor.vendorTdsMapping ??
    vendor.vendor_tds_mapping ??
    null,
  msme: parseMsmeValue(vendor.msme ?? vendor.is_msme) === true,
  trade_name: vendor.trade_name ?? vendor.tradeName ?? '',
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
  createdAt: vendor.createdAt ?? vendor.created_at ?? null,
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

export const toPaymentCreateApiPayload = (payment = {}) => {
  const payload = {};
  const invoiceId = payment.invoice_id ?? payment.invoiceId;
  addStringIfPresent(payload, "invoice_id", invoiceId);
  addStringIfPresent(
    payload,
    "payment_date",
    payment.payment_date ?? payment.paymentDate,
  );
  addStringIfPresent(
    payload,
    "payment_method",
    payment.payment_method ?? payment.paymentMethod,
  );
  addStringIfPresent(
    payload,
    "bank_account_id",
    payment.bank_account_id ?? payment.bankAccountId,
  );
  addStringIfPresent(
    payload,
    "reference_number",
    payment.reference_number ?? payment.referenceNumber,
  );
  addStringIfPresent(payload, "notes", payment.notes);
  return payload;
};

export const toRecordPaymentsApiPayload = (payment = {}) => {
  const invoiceNumbers = payment.invoice_numbers ?? payment.invoiceNumbers;
  const payload = {
    invoice_numbers: Array.isArray(invoiceNumbers)
      ? invoiceNumbers.filter(Boolean)
      : [],
  };
  addStringIfPresent(
    payload,
    "payment_date",
    payment.payment_date ?? payment.paymentDate,
  );
  addStringIfPresent(
    payload,
    "payment_method",
    payment.payment_method ?? payment.paymentMethod,
  );
  addStringIfPresent(
    payload,
    "reference_number",
    payment.reference_number ?? payment.referenceNumber,
  );
  return payload;
};

export {
  buildCreateInvoiceRequestBody,
  buildInvoiceApiPayload,
  EMPTY_INVOICE_LIST_RESPONSE,
  EMPTY_INVOICE_FILTER_OPTIONS,
  getInvoiceListItems,
  mergeInvoiceVendorOptions,
  normalizeInvoiceFilterOptions,
  normalizeInvoiceLineItem,
  normalizeInvoiceListResponse,
  normalizeInvoiceResponse,
  pickInvoiceField,
  resolveGstRateFromLineItem,
  toInvoiceApiPayload,
  toInvoiceUiPayload,
} from "./invoiceMappers";
