import { isValidVendorPan, parseMsmeValue } from '../../../utils/vendorValidation';

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
  };
};

const buildGstRegistrationFromBulkRow = (row = {}) => {
  const gstin = String(row.gstin || '').trim().toUpperCase();
  if (!gstin) return null;

  return {
    gstin,
    state: row.state || '',
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

const collectGstRegistrationsFromRows = (rows = []) => {
  const registrations = [];
  const seenGstins = new Set();

  rows.forEach((row) => {
    const registration = buildGstRegistrationFromBulkRow(row);
    if (!registration || seenGstins.has(registration.gstin)) return;
    seenGstins.add(registration.gstin);
    registrations.push(registration);
  });

  return registrations;
};

/**
 * Rows with the same valid PAN in one upload file are merged into one vendor.
 * Identity fields come from the first row; each row may contribute a GST registration.
 * Rows without a valid PAN are kept as separate vendors (one row each).
 */
export const mergeBulkVendorRowsByPan = (rows = []) => {
  if (!Array.isArray(rows) || rows.length === 0) return [];

  const panGroups = new Map();
  const standalone = [];

  rows.forEach((row) => {
    const payload = toBulkVendorPayload(row);
    const pan = String(payload.pan || '').trim().toUpperCase();

    if (isValidVendorPan(pan)) {
      const group = panGroups.get(pan);
      if (group) {
        group.push(payload);
      } else {
        panGroups.set(pan, [payload]);
      }
      return;
    }

    standalone.push(payload);
  });

  const merged = [];

  panGroups.forEach((groupRows) => {
    if (groupRows.length === 1) {
      merged.push(groupRows[0]);
      return;
    }

    const [base] = groupRows;
    const gstRegistrations = collectGstRegistrationsFromRows(groupRows);

    merged.push({
      ...base,
      gstin: gstRegistrations[0]?.gstin || base.gstin || '',
      ...(gstRegistrations.length > 0 ? { gstRegistrations } : {}),
    });
  });

  standalone.forEach((row) => merged.push(row));
  return merged;
};
