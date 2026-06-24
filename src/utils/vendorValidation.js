import {
  getVendorFieldDisplayName,
  hasVendorFieldValue,
  normalizeActiveVendorFields,
} from './vendorFieldConfig';

const MSME_TRUE_VALUES = new Set(['yes', 'y', 'true', '1']);
const MSME_FALSE_VALUES = new Set(['no', 'n', 'false', '0']);

/** Parses MSME from checkbox (boolean) or bulk upload Yes/No. Returns null if invalid text. */
export const parseMsmeValue = (value) => {
  if (value === undefined || value === null || value === '') return false;
  if (typeof value === 'boolean') return value;
  const normalized = String(value).trim().toLowerCase();
  if (!normalized) return false;
  if (MSME_TRUE_VALUES.has(normalized)) return true;
  if (MSME_FALSE_VALUES.has(normalized)) return false;
  return null;
};

export const formatMsmeLabel = (value) => (parseMsmeValue(value) === true ? 'Yes' : 'No');

export const getMsmeValidationError = (value, { prefix = '' } = {}) => {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value === 'boolean') return null;
  const raw = String(value).trim();
  if (!raw) return null;
  return parseMsmeValue(value) === null ? `${prefix}MSME must be Yes or No` : null;
};

export const isIndiaCountry = (country) => {
  const normalized = String(country || '')
    .trim()
    .toLowerCase();
  return normalized === 'india' || normalized === 'in';
};

export const GSTIN_PATTERN = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
export const PAN_PATTERN = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;

export const isValidVendorGstin = (gstin) =>
  GSTIN_PATTERN.test(String(gstin || '').trim().toUpperCase());

export const isValidVendorPan = (pan) =>
  PAN_PATTERN.test(String(pan || '').trim().toUpperCase());

export const getVendorPanFormatError = (pan, { prefix = '', required = true } = {}) => {
  const value = String(pan || '').trim().toUpperCase();
  if (!value) {
    return required ? `${prefix}PAN is required` : null;
  }
  if (value.length !== 10) {
    return `${prefix}PAN must be exactly 10 characters`;
  }
  if (!isValidVendorPan(value)) {
    return `${prefix}Enter a valid PAN (e.g. ABCDE1234F)`;
  }
  return null;
};

export const getVendorGstinFormatError = (gstin, { prefix = '', required = true } = {}) => {
  const value = String(gstin || '').trim().toUpperCase();
  if (!value) {
    return required ? `${prefix}GSTIN is required` : null;
  }
  if (value.length !== 15) {
    return `${prefix}GSTIN must be exactly 15 characters`;
  }
  if (!isValidVendorGstin(value)) {
    return `${prefix}Enter a valid GSTIN (e.g. 27ABCDE1234F1Z5)`;
  }
  return null;
};

/** PAN takes priority; GSTIN is used only when PAN is absent. */
export const resolveVendorFetchSource = ({ pan, gstin } = {}) => {
  const normalizedPan = String(pan || '').trim().toUpperCase();
  if (normalizedPan) {
    return { mode: 'pan', value: normalizedPan };
  }

  const normalizedGstin = String(gstin || '').trim().toUpperCase();
  if (normalizedGstin) {
    return { mode: 'gstin', value: normalizedGstin };
  }

  return null;
};

export const getVendorFetchValidationError = ({ pan, gstin } = {}) => {
  const source = resolveVendorFetchSource({ pan, gstin });
  if (!source) {
    return 'Enter PAN in vendor identity or a GSTIN below to fetch details';
  }

  if (source.mode === 'pan') {
    return getVendorPanFormatError(source.value);
  }

  return getVendorGstinFormatError(source.value);
};

export const isVendorFetchReady = ({ pan, gstin } = {}) =>
  !getVendorFetchValidationError({ pan, gstin });

export const getVendorGstRegistrationsFromForm = (vendor = {}) => {
  const registrations =
    vendor.gstRegistrations ??
    vendor.gst_regs ??
    vendor.gstRegs ??
    vendor.gst_registrations;

  if (Array.isArray(registrations) && registrations.length > 0) {
    return registrations.filter((registration) =>
      isValidVendorGstin(registration?.gstin ?? registration?.gstIn ?? registration?.gst),
    );
  }

  const gstin = String(vendor.gstin || '').trim().toUpperCase();
  return isValidVendorGstin(gstin) ? [{ gstin }] : [];
};

export const hasVendorGstRegistrations = (vendor = {}) =>
  getVendorGstRegistrationsFromForm(vendor).length > 0;

export const isVendorGstVerificationSatisfied = (vendor, gstVerification, { invoiceVendorRequest = false } = {}) => {
  if (invoiceVendorRequest) return true;
  if (!isIndiaCountry(vendor?.country)) return true;

  if (hasVendorGstRegistrations(vendor)) return true;

  const gstin = String(vendor?.gstin || '').trim().toUpperCase();
  const requiresGstin = !invoiceVendorRequest;

  if (requiresGstin && !gstin) return false;
  if (!gstin) return true;
  if (!isValidVendorGstin(gstin)) return false;
  const verifiedGstin = String(gstVerification?.gstin || '').trim().toUpperCase();
  if (!gstVerification?.verified || verifiedGstin !== gstin) return false;
  if (gstVerification.validGstin === false) return false;
  return true;
};

export const getVendorGstVerificationErrors = (
  vendor = {},
  gstVerification = null,
  { invoiceVendorRequest = false, prefix = '' } = {},
) => {
  if (invoiceVendorRequest) return [];
  if (!isIndiaCountry(vendor.country)) return [];

  if (hasVendorGstRegistrations(vendor)) return [];

  const gstin = String(vendor.gstin || '').trim().toUpperCase();
  const requiresGstin = !invoiceVendorRequest;

  if (requiresGstin && !gstin) {
    return [`${prefix}Add at least one GST registration or enter a GSTIN`];
  }
  if (!gstin) return [];
  if (!isValidVendorGstin(gstin)) {
    return [`${prefix}Enter a valid 15-character GSTIN`];
  }
  const verifiedGstin = String(gstVerification?.gstin || '').trim().toUpperCase();
  if (!gstVerification?.verified || verifiedGstin !== gstin) {
    return [`${prefix}Verify GSTIN from the GST portal before saving`];
  }
  if (gstVerification.validGstin === false) {
    return [`${prefix}GSTIN is not valid on the GST portal`];
  }
  return [];
};

export const normalizePincodeInput = (value, country) => {
  const raw = String(value ?? '');
  if (isIndiaCountry(country)) {
    return raw.replace(/\D/g, '').slice(0, 6);
  }
  return raw;
};

export const getPincodeValidationError = (
  pincode,
  country,
  { required = false, prefix = '' } = {},
) => {
  const value = String(pincode || '').trim();
  const effectiveCountry = String(country || '').trim() || 'India';

  if (!value) {
    return required ? `${prefix}Pincode is required` : null;
  }

  if (isIndiaCountry(effectiveCountry) && !/^\d{6}$/.test(value)) {
    return `${prefix}Pincode must be a 6-digit number for vendors in India`;
  }

  return null;
};

const getDigitsOnly = (value) => String(value || '').replace(/\D/g, '');

const getVendorFormatValidationErrors = (vendor = {}, { prefix = '' } = {}) => {
  const errors = [];
  const email = String(vendor.email || '').trim();
  const mobile = String(vendor.mobile || '').trim();
  const phone = String(vendor.phone || '').trim();
  const country = String(vendor.country || '').trim() || 'India';
  const pincode = String(vendor.pincode || '').trim();
  const pan = String(vendor.pan || '').trim().toUpperCase();
  const gstin = String(vendor.gstin || '').trim().toUpperCase();
  const vendorType = String(vendor.vendor_type || vendor.vendorType || '').trim();

  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.push(`${prefix}Email is invalid`);
  }

  if (mobile) {
    const mobileDigits = getDigitsOnly(mobile);
    if (mobileDigits.length !== 10) {
      errors.push(`${prefix}Mobile must be 10 digits`);
    }
  }

  if (phone) {
    const phoneDigits = getDigitsOnly(phone);
    if (phoneDigits.length < 6 || phoneDigits.length > 15) {
      errors.push(`${prefix}Phone must be 6–15 digits`);
    }
  }

  const pincodeError = getPincodeValidationError(pincode, country, { prefix });
  if (pincodeError) {
    errors.push(pincodeError);
  }

  if (
    vendorType &&
    !['company', 'individual'].includes(vendorType.toLowerCase())
  ) {
    errors.push(`${prefix}Vendor type must be Company or Individual`);
  }

  if (pan) {
    if (isIndiaCountry(country)) {
      if (!isValidVendorPan(pan)) {
        errors.push(`${prefix}PAN format is invalid`);
      }
    } else if (pan.length !== 10) {
      errors.push(`${prefix}PAN must be 10 characters`);
    }
  }

  if (gstin && isIndiaCountry(country) && !isValidVendorGstin(gstin)) {
    errors.push(`${prefix}GSTIN format is invalid`);
  }

  const msmeError = getMsmeValidationError(vendor.msme, { prefix });
  if (msmeError) {
    errors.push(msmeError);
  }

  return errors;
};

/**
 * Validation for bulk vendor spreadsheet upload.
 * Vendors are created in Saved status, so only name is mandatory at import time.
 * Format rules still apply when values are present.
 */
export const getBulkVendorUploadValidationErrors = (vendor = {}, { rowIndex = null } = {}) => {
  const prefix = rowIndex !== null && rowIndex !== undefined ? `Row ${rowIndex + 2}: ` : '';
  const errors = [];
  const name = String(vendor.name || '').trim();

  if (!name) {
    errors.push(`${prefix}Company Name is required`);
  }

  return [...errors, ...getVendorFormatValidationErrors(vendor, { prefix })];
};

export const getVendorValidationErrors = (
  vendor = {},
  {
    rowIndex = null,
    activeVendorFields = [],
    vendorFieldConfiguration = [],
    invoiceVendorRequest = false,
  } = {},
) => {
  if (invoiceVendorRequest) {
    return getInvoiceVendorRequestValidationErrors(vendor);
  }

  const prefix = rowIndex !== null && rowIndex !== undefined ? `Row ${rowIndex + 2}: ` : '';
  const errors = [];
  const requiredSections = normalizeActiveVendorFields(activeVendorFields);

  requiredSections.forEach((section) => {
    if (!hasVendorFieldValue(section, vendor)) {
      const label = getVendorFieldDisplayName(section, vendorFieldConfiguration);
      errors.push(`${prefix}${label} is required`);
    }
  });

  return [...errors, ...getVendorFormatValidationErrors(vendor, { prefix })];
};

/**
 * Validation for Request Vendor from invoice upload (single + bulk).
 * Only vendor name and vendor type are mandatory.
 */
export const getInvoiceVendorRequestValidationErrors = (vendor = {}) => {
  const errors = [];

  const name = String(vendor.name || "").trim();
  const vendorType = String(vendor.vendor_type || vendor.vendorType || "").trim();

  if (!name) {
    errors.push("Vendor name is required");
  }

  if (!vendorType) {
    errors.push("Vendor type is required");
  } else if (!["company", "individual"].includes(vendorType.toLowerCase())) {
    errors.push("Vendor type must be Company or Individual");
  }

  return errors;
};
