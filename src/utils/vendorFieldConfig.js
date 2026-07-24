export const VENDOR_FIELD_SECTIONS = {
  COMPANY_NAME: 'COMPANY_NAME',
  TRADE_NAME: 'TRADE_NAME',
  VENDOR_TYPE: 'VENDOR_TYPE',
  EMAIL_ID: 'EMAIL_ID',
  MOBILE_NO: 'MOBILE_NO',
  PHONE_NO: 'PHONE_NO',
  CONTACT_PERSON: 'CONTACT_PERSON',
  CATEGORY: 'CATEGORY',
  WEBSITE: 'WEBSITE',
  CURRENCY: 'CURRENCY',
  ADDRESS_LINE_1: 'ADDRESS_LINE_1',
  ADDRESS_LINE_2: 'ADDRESS_LINE_2',
  CITY: 'CITY',
  STATE: 'STATE',
  PINCODE: 'PINCODE',
  COUNTRY: 'COUNTRY',
  PAN_NO: 'PAN_NO',
  GST_NO: 'GST_NO',
  MSME: 'MSME',
  ACCOUNT_NAME: 'ACCOUNT_NAME',
  ACCOUNT_NUMBER: 'ACCOUNT_NUMBER',
  IFSC_CODE: 'IFSC_CODE',
  BANK_NAME: 'BANK_NAME',
  BRANCH: 'BRANCH',
  REMARKS: 'REMARKS',
};

export const VENDOR_VERIFICATION_SECTION_IDS = new Set([
  'VENDOR_VERIFY_PORTAL',
]);

/** Section ID → snake_case form / bulk-upload field key */
export const VENDOR_SECTION_TO_FORM_KEY = {
  [VENDOR_FIELD_SECTIONS.COMPANY_NAME]: 'name',
  [VENDOR_FIELD_SECTIONS.TRADE_NAME]: 'trade_name',
  [VENDOR_FIELD_SECTIONS.VENDOR_TYPE]: 'vendor_type',
  [VENDOR_FIELD_SECTIONS.EMAIL_ID]: 'email',
  [VENDOR_FIELD_SECTIONS.MOBILE_NO]: 'mobile',
  [VENDOR_FIELD_SECTIONS.PHONE_NO]: 'phone',
  [VENDOR_FIELD_SECTIONS.CONTACT_PERSON]: 'contact_person',
  [VENDOR_FIELD_SECTIONS.CATEGORY]: 'category',
  [VENDOR_FIELD_SECTIONS.WEBSITE]: 'website',
  [VENDOR_FIELD_SECTIONS.CURRENCY]: 'currency',
  [VENDOR_FIELD_SECTIONS.ADDRESS_LINE_1]: 'address_line1',
  [VENDOR_FIELD_SECTIONS.ADDRESS_LINE_2]: 'address_line2',
  [VENDOR_FIELD_SECTIONS.CITY]: 'city',
  [VENDOR_FIELD_SECTIONS.STATE]: 'state',
  [VENDOR_FIELD_SECTIONS.PINCODE]: 'pincode',
  [VENDOR_FIELD_SECTIONS.COUNTRY]: 'country',
  [VENDOR_FIELD_SECTIONS.PAN_NO]: 'pan',
  [VENDOR_FIELD_SECTIONS.GST_NO]: 'gstin',
  [VENDOR_FIELD_SECTIONS.MSME]: 'msme',
  [VENDOR_FIELD_SECTIONS.ACCOUNT_NAME]: 'account_holder_name',
  [VENDOR_FIELD_SECTIONS.ACCOUNT_NUMBER]: 'account_number',
  [VENDOR_FIELD_SECTIONS.IFSC_CODE]: 'ifsc_code',
  [VENDOR_FIELD_SECTIONS.BANK_NAME]: 'bank_name',
  [VENDOR_FIELD_SECTIONS.BRANCH]: 'branch',
  [VENDOR_FIELD_SECTIONS.REMARKS]: 'notes',
};

export const VENDOR_FORM_KEY_TO_SECTION = Object.fromEntries(
  Object.entries(VENDOR_SECTION_TO_FORM_KEY).map(([section, key]) => [key, section]),
);

export const VENDOR_FIELD_DEFAULT_LABELS = {
  [VENDOR_FIELD_SECTIONS.COMPANY_NAME]: 'Company Name',
  [VENDOR_FIELD_SECTIONS.TRADE_NAME]: 'Trade Name',
  [VENDOR_FIELD_SECTIONS.VENDOR_TYPE]: 'Vendor Type',
  [VENDOR_FIELD_SECTIONS.EMAIL_ID]: 'Email ID',
  [VENDOR_FIELD_SECTIONS.MOBILE_NO]: 'Mobile No',
  [VENDOR_FIELD_SECTIONS.PHONE_NO]: 'Phone No',
  [VENDOR_FIELD_SECTIONS.CONTACT_PERSON]: 'Contact Person',
  [VENDOR_FIELD_SECTIONS.CATEGORY]: 'Category',
  [VENDOR_FIELD_SECTIONS.WEBSITE]: 'Website',
  [VENDOR_FIELD_SECTIONS.CURRENCY]: 'Currency',
  [VENDOR_FIELD_SECTIONS.ADDRESS_LINE_1]: 'Address Line 1',
  [VENDOR_FIELD_SECTIONS.ADDRESS_LINE_2]: 'Address Line 2',
  [VENDOR_FIELD_SECTIONS.CITY]: 'City',
  [VENDOR_FIELD_SECTIONS.STATE]: 'State',
  [VENDOR_FIELD_SECTIONS.PINCODE]: 'Pincode',
  [VENDOR_FIELD_SECTIONS.COUNTRY]: 'Country',
  [VENDOR_FIELD_SECTIONS.PAN_NO]: 'PAN No',
  [VENDOR_FIELD_SECTIONS.GST_NO]: 'GST No',
  [VENDOR_FIELD_SECTIONS.MSME]: 'MSME',
  [VENDOR_FIELD_SECTIONS.ACCOUNT_NAME]: 'Account Name',
  [VENDOR_FIELD_SECTIONS.ACCOUNT_NUMBER]: 'Account Number',
  [VENDOR_FIELD_SECTIONS.IFSC_CODE]: 'IFSC Code',
  [VENDOR_FIELD_SECTIONS.BANK_NAME]: 'Bank Name',
  [VENDOR_FIELD_SECTIONS.BRANCH]: 'Branch',
  [VENDOR_FIELD_SECTIONS.REMARKS]: 'Remarks',
};

export const DEFAULT_VENDOR_FIELD_CATALOG = Object.values(VENDOR_FIELD_SECTIONS).map(
  (section) => ({
    displayName: VENDOR_FIELD_DEFAULT_LABELS[section],
    screen: 'VENDOR',
    section,
  }),
);

export const normalizeVendorFieldSection = (section = '') =>
  String(section || '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');

export const normalizeVendorFieldCatalog = (catalog = []) => {
  if (!Array.isArray(catalog)) return [];
  return catalog
    .map((item) => {
      const section = normalizeVendorFieldSection(item?.section);
      if (!section) return null;
      return {
        displayName: String(item?.displayName || VENDOR_FIELD_DEFAULT_LABELS[section] || section).trim(),
        screen: String(item?.screen || 'VENDOR').trim(),
        section,
      };
    })
    .filter(Boolean);
};

export const normalizeActiveVendorFields = (activeVendorFields = []) => {
  if (!Array.isArray(activeVendorFields)) return [];
  return activeVendorFields
    .map(normalizeVendorFieldSection)
    .filter(Boolean)
    .filter((section) => !VENDOR_VERIFICATION_SECTION_IDS.has(section));
};

export const isVendorFieldRequired = (sectionId, activeVendorFields = []) => {
  const normalizedFields = normalizeActiveVendorFields(activeVendorFields);
  if (normalizedFields.length === 0) return false;
  return normalizedFields.includes(normalizeVendorFieldSection(sectionId));
};

export const getVendorFieldDisplayName = (sectionId, catalog = []) => {
  const section = normalizeVendorFieldSection(sectionId);
  const catalogItem = normalizeVendorFieldCatalog(catalog).find((item) => item.section === section);
  return catalogItem?.displayName || VENDOR_FIELD_DEFAULT_LABELS[section] || section;
};

export const getVendorUploadMandatoryFieldKeys = (activeVendorFields = []) =>
  normalizeActiveVendorFields(activeVendorFields)
    .map((section) => VENDOR_SECTION_TO_FORM_KEY[section])
    .filter(Boolean);

export const hasVendorFieldValue = (sectionId, vendor = {}) => {
  const section = normalizeVendorFieldSection(sectionId);
  const value = vendor[VENDOR_SECTION_TO_FORM_KEY[section]];
  if (section === VENDOR_FIELD_SECTIONS.MSME) {
    if (value === true || value === false) return true;
    const raw = String(value ?? '').trim();
    if (!raw) return false;
    return parseMsmeValueForConfig(value) !== null;
  }
  if (section === VENDOR_FIELD_SECTIONS.VENDOR_TYPE) {
    return Boolean(String(vendor.vendor_type || vendor.vendorType || '').trim());
  }
  if (typeof value === 'boolean') return true;
  return Boolean(String(value ?? '').trim());
};

const MSME_TRUE_VALUES = new Set(['yes', 'y', 'true', '1']);
const MSME_FALSE_VALUES = new Set(['no', 'n', 'false', '0']);

const parseMsmeValueForConfig = (value) => {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value === 'boolean') return value;
  const normalized = String(value).trim().toLowerCase();
  if (!normalized) return null;
  if (MSME_TRUE_VALUES.has(normalized)) return true;
  if (MSME_FALSE_VALUES.has(normalized)) return false;
  return null;
};

export const isVendorFieldRequiredByFormKey = (formKey, activeVendorFields = []) => {
  const section = VENDOR_FORM_KEY_TO_SECTION[formKey];
  if (!section) return false;
  return isVendorFieldRequired(section, activeVendorFields);
};
