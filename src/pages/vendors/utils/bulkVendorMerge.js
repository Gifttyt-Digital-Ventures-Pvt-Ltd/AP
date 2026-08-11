import { isValidVendorPan, parseMsmeValue } from '../../../utils/vendorValidation';

const normalizeRowType = (value) => {
  const normalized = String(value || '').trim().toLowerCase();
  if (normalized.startsWith('bank')) return 'bank';
  if (normalized.startsWith('branch')) return 'branch';
  return 'gstin';
};

const parseYesNo = (value) => parseMsmeValue(value) === true;

const generateClientId = (prefix) =>
  `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

export const toBulkVendorPayload = (row) => {
  const name = String(row.name || '').trim();
  const vendorTypeRaw = String(row.vendor_type || '').trim().toLowerCase();
  const vendorType = vendorTypeRaw === 'individual' ? 'Individual' : 'Company';
  return {
    name,
    trade_name: String(row.trade_name || '').trim(),
    vendor_type: vendorType,
    email: String(row.email || '').trim(),
    phone: String(row.phone || '').trim(),
    mobile: String(row.mobile || '').trim(),
    pan: String(row.pan || '').trim().toUpperCase(),
    gstin: String(row.gstin || '').trim().toUpperCase(),
    address_line1: String(row.address_line1 || '').trim(),
    address_line2: String(row.address_line2 || '').trim(),
    city: String(row.city || '').trim(),
    state: String(row.state || '').trim(),
    pincode: String(row.pincode || '').trim(),
    country: String(row.country || '').trim() || 'India',
    bank_name: String(row.bank_name || '').trim(),
    account_number: String(row.account_number || '').trim(),
    ifsc_code: String(row.ifsc_code || '').trim().toUpperCase(),
    branch: String(row.branch || '').trim(),
    account_holder_name: String(row.account_holder_name || '').trim(),
    category: String(row.category || '').trim(),
    currency: String(row.currency || '').trim() || 'INR',
    payment_terms: String(row.payment_terms || '').trim() || '30',
    contact_person: String(row.contact_person || '').trim(),
    website: String(row.website || '').trim(),
    notes: String(row.notes || '').trim(),
    msme: parseMsmeValue(row.msme) === true,

    // New top-level scalar fields, same shape as the full-screen Create/Edit form.
    paymentTerms: String(row.paymentTerms || '').trim(),
    modeOfDelivery: String(row.modeOfDelivery || '').trim(),
    deliveryTerms: String(row.deliveryTerms || '').trim(),
    vendorStatus: String(row.vendorStatus || '').trim(),
    oneTimeVendor: parseYesNo(row.oneTimeVendor),
    foreignVendor: parseYesNo(row.foreignVendor),
    udyamRegistrationNo: String(row.udyamRegistrationNo || '').trim(),
    msmeCategory: String(row.msmeCategory || '').trim(),
    iecNumber: String(row.iecNumber || '').trim().toUpperCase(),
    tan: String(row.tan || '').trim().toUpperCase(),
    tin: String(row.tin || '').trim(),
    stc: String(row.stc || '').trim(),
    stRegistrationNumber: String(row.stRegistrationNumber || '').trim(),
    panStatus: String(row.panStatus || '').trim(),
    panReferenceNo: String(row.panReferenceNo || '').trim(),
    natureOfAssessee: String(row.natureOfAssessee || '').trim(),
    tcsGroup: String(row.tcsGroup || '').trim(),
    specifiedPerson206AB: parseYesNo(row.specifiedPerson206AB),
    tdsApplicable: parseYesNo(row.tdsApplicable),
    tdsGroup: String(row.tdsGroup || '').trim(),
    lowNilDeductionCertificateNo: String(row.lowNilDeductionCertificateNo || '').trim(),
    certificateValidity: String(row.certificateValidity || '').trim(),
  };
};

const buildGstRegistrationFromBulkRow = (row = {}) => {
  const gstin = String(row.gstin || '').trim().toUpperCase();
  if (!gstin) return null;

  return {
    gstin,
    state: row.state || '',
    registrationType: String(row.registrationType || '').trim(),
    hsnSacDefaultCode: String(row.hsnSacDefaultCode || '').trim(),
    reverseChargeApplicable: parseYesNo(row.reverseChargeApplicable),
    eInvoicingApplicable: parseYesNo(row.eInvoicingApplicable),
    location: {
      addressLine1: row.address_line1 || '',
      addressLine2: row.address_line2 || '',
      city: row.city || '',
      state: row.state || '',
      pincode: row.pincode || '',
      country: row.country || 'India',
    },
    bankDetails: {
      accountHolderName: row.account_holder_name || row.name || '',
      accountNumber: row.account_number || '',
      ifscCode: row.ifsc_code || '',
      bankName: row.bank_name || '',
      branch: row.branch || '',
    },
  };
};

const buildBankAccountFromBulkRow = (row = {}) => {
  const bankName = String(row.bank_name || '').trim();
  const accountNumber = String(row.account_number || '').trim();
  if (!bankName && !accountNumber) return null;

  return {
    id: generateClientId('bulk-bank'),
    bankName,
    accountName: String(row.account_holder_name || '').trim(),
    accountNumber,
    accountType: String(row.bankAccountType || '').trim(),
    ifscCode: String(row.ifsc_code || '').trim().toUpperCase(),
    swiftCode: String(row.swiftCode || '').trim().toUpperCase(),
    bankCurrency: String(row.bankCurrency || '').trim().toUpperCase(),
    isActive: String(row.bankActiveStatus || '').trim().toLowerCase() !== 'inactive',
    bankContactDetails: String(row.bankContactDetails || '').trim(),
    bankAddress: String(row.bankAddress || '').trim(),
  };
};

const buildBranchFromBulkRow = (row = {}) => {
  const branchName = String(row.branchName || '').trim();
  const branchCode = String(row.branchCode || '').trim();
  const branchGstin = String(row.branchGstin || '').trim().toUpperCase();
  if (!branchName && !branchCode && !branchGstin) return null;

  return {
    id: generateClientId('bulk-branch'),
    branchName,
    branchCode: branchCode.toUpperCase(),
    gstin: branchGstin,
    addressLine1: String(row.branchAddressLine1 || '').trim(),
    addressLine2: String(row.branchAddressLine2 || '').trim(),
    city: String(row.branchCity || '').trim(),
    district: String(row.branchDistrict || '').trim(),
    state: String(row.branchState || '').trim(),
    pincode: String(row.branchPincode || '').trim(),
    country: String(row.branchCountry || '').trim() || 'India',
  };
};

const collectGstRegistrationsFromRows = (rows = []) => {
  const registrations = [];
  const seenGstins = new Set();

  rows
    .filter(({ rowType }) => rowType === 'gstin')
    .forEach(({ raw }) => {
      const registration = buildGstRegistrationFromBulkRow(raw);
      if (!registration || seenGstins.has(registration.gstin)) return;
      seenGstins.add(registration.gstin);
      registrations.push(registration);
    });

  return registrations;
};

const collectBankAccountsFromRows = (rows = []) =>
  rows
    .filter(({ rowType }) => rowType === 'bank')
    .map(({ raw }) => buildBankAccountFromBulkRow(raw))
    .filter(Boolean);

const collectBranchesFromRows = (rows = []) =>
  rows
    .filter(({ rowType }) => rowType === 'branch')
    .map(({ raw }) => buildBranchFromBulkRow(raw))
    .filter(Boolean);

const mergeGroupRows = (groupRows) => {
  const base = groupRows[0].payload;
  const gstRegistrations = collectGstRegistrationsFromRows(groupRows);
  const bankAccounts = collectBankAccountsFromRows(groupRows);
  const vendorBranches = collectBranchesFromRows(groupRows);

  return {
    ...base,
    gstin: gstRegistrations[0]?.gstin || base.gstin || '',
    ...(gstRegistrations.length > 0 ? { gstRegistrations } : {}),
    ...(bankAccounts.length > 0 ? { bankAccounts } : {}),
    ...(vendorBranches.length > 0 ? { vendorBranches } : {}),
  };
};

/**
 * Rows with the same valid PAN in one upload file are merged into one vendor.
 * Identity fields come from the first row. Each row's "Row Type" column decides what
 * it contributes: a GSTIN registration (default when blank), a bank account, or a branch.
 * Rows without a valid PAN are kept as separate vendors (one row each) — bank/branch row
 * types are meaningless without a PAN group to attach them to, and are naturally dropped
 * downstream since a standalone bank/branch row has no vendor name to anchor to.
 */
export const mergeBulkVendorRowsByPan = (rows = []) => {
  if (!Array.isArray(rows) || rows.length === 0) return [];

  const panGroups = new Map();
  const standalone = [];

  rows.forEach((row) => {
    const payload = toBulkVendorPayload(row);
    const rowType = normalizeRowType(row.row_type);
    const pan = String(payload.pan || '').trim().toUpperCase();
    const entry = { payload, rowType, raw: row };

    if (isValidVendorPan(pan)) {
      const group = panGroups.get(pan);
      if (group) {
        group.push(entry);
      } else {
        panGroups.set(pan, [entry]);
      }
      return;
    }

    standalone.push(entry);
  });

  const merged = [];

  panGroups.forEach((groupRows) => {
    merged.push(mergeGroupRows(groupRows));
  });

  standalone.forEach(({ payload }) => merged.push(payload));
  return merged;
};
