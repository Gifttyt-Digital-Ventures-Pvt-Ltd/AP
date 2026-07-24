export const normalizeVendorMatchName = (value) =>
  String(value ?? '').toLowerCase().trim();

/** Company name and trade name values used for invoice vendor matching. */
export const getVendorIdentityNames = (vendor = {}) => {
  const names = [vendor.name, vendor.tradeName, vendor.trade_name]
    .map(normalizeVendorMatchName)
    .filter(Boolean);

  return [...new Set(names)];
};

export const vendorMatchesInvoiceName = (vendor, invoiceVendorName) => {
  const normalized = normalizeVendorMatchName(invoiceVendorName);
  if (!normalized) return false;
  return getVendorIdentityNames(vendor).includes(normalized);
};

export const findVendorByInvoiceName = (vendors = [], invoiceVendorName) => {
  if (!invoiceVendorName) return null;
  const list = Array.isArray(vendors) ? vendors : [];
  return list.find((vendor) => vendorMatchesInvoiceName(vendor, invoiceVendorName)) || null;
};

export const vendorMatchesInvoiceNameQuery = (vendor, query) => {
  const normalizedQuery = normalizeVendorMatchName(query);
  if (!normalizedQuery) return true;
  return getVendorIdentityNames(vendor).some((name) => name.includes(normalizedQuery));
};
