export const isIndiaCountry = (country) => {
  const normalized = String(country || '')
    .trim()
    .toLowerCase();
  return normalized === 'india' || normalized === 'in';
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

  if (!value) {
    return required ? `${prefix}Pincode is required` : null;
  }

  if (isIndiaCountry(country) && !/^\d{6}$/.test(value)) {
    return `${prefix}Pincode must be a 6-digit number for vendors in India`;
  }

  return null;
};

export const getVendorValidationErrors = (
  vendor = {},
  {
    rowIndex = null,
    requireEmail = false,
    requireName = true,
    requireVendorType = false,
    requirePincode = false,
  } = {},
) => {
  const prefix = rowIndex !== null && rowIndex !== undefined ? `Row ${rowIndex + 2}: ` : '';
  const errors = [];

  const name = String(vendor.name || '').trim();
  const vendorType = String(vendor.vendor_type || vendor.vendorType || '').trim();
  const email = String(vendor.email || '').trim();
  const mobile = String(vendor.mobile || '').trim();
  const country = String(vendor.country || '').trim();
  const pincode = String(vendor.pincode || '').trim();
  const pan = String(vendor.pan || '').trim().toUpperCase();
  const gstin = String(vendor.gstin || '').trim().toUpperCase();

  if (requireName && !name) {
    errors.push(`${prefix}Vendor name is required`);
  }

  if (requireVendorType && !vendorType) {
    errors.push(`${prefix}Vendor type is required`);
  } else if (
    vendorType &&
    !['company', 'individual'].includes(vendorType.toLowerCase())
  ) {
    errors.push(`${prefix}Vendor type must be Company or Individual`);
  }

  if (requireEmail && !email) {
    errors.push(`${prefix}Email is required`);
  } else if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.push(`${prefix}Email is invalid`);
  }

  if (!mobile) {
    errors.push(`${prefix}Mobile number is required`);
  }

  const pincodeError = getPincodeValidationError(pincode, country, {
    required: requirePincode,
    prefix,
  });
  if (pincodeError) {
    errors.push(pincodeError);
  }

  if (isIndiaCountry(country)) {
    if (!pan) {
      errors.push(`${prefix}PAN is required for vendors in India`);
    } else if (pan.length !== 10) {
      errors.push(`${prefix}PAN must be 10 characters`);
    }

    if (!gstin) {
      errors.push(`${prefix}GSTIN is required for vendors in India`);
    } else if (gstin.length !== 15) {
      errors.push(`${prefix}GSTIN must be 15 characters`);
    }
  } else {
    if (pan && pan.length !== 10) {
      errors.push(`${prefix}PAN must be 10 characters`);
    }
    if (gstin && gstin.length !== 15) {
      errors.push(`${prefix}GSTIN must be 15 characters`);
    }
  }

  return errors;
};

/**
 * Lighter validation for Request Vendor from invoice upload (single + bulk).
 * Keeps the original invoice-flow rules (name, type, GSTIN) plus mandatory mobile.
 * Full PAN / India rules apply on the Vendors screen and bulk vendor upload only.
 */
export const getInvoiceVendorRequestValidationErrors = (vendor = {}) => {
  const errors = [];

  const name = String(vendor.name || "").trim();
  const vendorType = String(vendor.vendor_type || vendor.vendorType || "").trim();
  const mobile = String(vendor.mobile || "").trim();
  const gstin = String(vendor.gstin || "").trim().toUpperCase();

  if (!name) {
    errors.push("Vendor name is required");
  }

  if (!vendorType) {
    errors.push("Vendor type is required");
  } else if (!["company", "individual"].includes(vendorType.toLowerCase())) {
    errors.push("Vendor type must be Company or Individual");
  }

  if (!mobile) {
    errors.push("Mobile number is required");
  }

  if (!gstin) {
    errors.push("GSTIN is required");
  } else if (gstin.length !== 15) {
    errors.push("GSTIN must be 15 characters");
  }

  return errors;
};
