export const VENDOR_VERIFY_PORTAL_SECTION = 'VENDOR_VERIFY_PORTAL';

export const DEFAULT_VENDOR_VERIFICATION_CATALOG = [
  {
    displayName: 'GST Portal Verification',
    screen: 'VENDOR',
    section: VENDOR_VERIFY_PORTAL_SECTION,
  },
];

export const normalizeVendorVerificationSection = (section = '') =>
  String(section || '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');

export const normalizeVendorVerificationCatalog = (catalog = []) => {
  if (!Array.isArray(catalog)) return [];
  return catalog
    .map((item) => {
      const section = normalizeVendorVerificationSection(item?.section);
      if (!section) return null;
      const defaultEntry = DEFAULT_VENDOR_VERIFICATION_CATALOG.find(
        (entry) => entry.section === section,
      );
      return {
        displayName: String(item?.displayName || defaultEntry?.displayName || section).trim(),
        screen: String(item?.screen || 'VENDOR').trim(),
        section,
      };
    })
    .filter(Boolean);
};

export const normalizeActiveVendorVerification = (activeVendorVerification = []) => {
  if (!Array.isArray(activeVendorVerification)) return [];
  return activeVendorVerification.map(normalizeVendorVerificationSection).filter(Boolean);
};

export const isVendorPortalFetchEnabled = (activeVendorVerification) =>
  normalizeActiveVendorVerification(activeVendorVerification).includes(
    VENDOR_VERIFY_PORTAL_SECTION,
  );

export const resolveActiveVendorVerification = ({
  activeVendorVerification,
  hasExplicitActiveVendorVerification = false,
} = {}) => {
  if (hasExplicitActiveVendorVerification) {
    return normalizeActiveVendorVerification(activeVendorVerification);
  }

  return [];
};
