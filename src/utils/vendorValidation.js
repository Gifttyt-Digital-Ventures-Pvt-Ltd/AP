export const isIndiaCountry = (country) => {
  const normalized = String(country || '')
    .trim()
    .toLowerCase();
  return normalized === 'india' || normalized === 'in';
};

export const getVendorValidationErrors = (
  vendor = {},
  { rowIndex = null, requireEmail = false, requireName = true, requireVendorType = false } = {},
) => {
  const prefix = rowIndex !== null && rowIndex !== undefined ? `Row ${rowIndex + 2}: ` : '';
  const errors = [];

  const name = String(vendor.name || '').trim();
  const vendorType = String(vendor.vendor_type || vendor.vendorType || '').trim();
  const email = String(vendor.email || '').trim();
  const mobile = String(vendor.mobile || '').trim();
  const country = String(vendor.country || '').trim();
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
