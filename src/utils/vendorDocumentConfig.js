import { VENDOR_DOCUMENT_TYPES } from '../pages/vendors/utils/vendorDocuments';

export const VENDOR_DOCUMENT_SECTIONS = {
  PAN: 'VENDOR_DOC_PAN',
  GST: 'VENDOR_DOC_GST',
  COI: 'VENDOR_DOC_COI',
  CANCEL_CHEQUE: 'VENDOR_DOC_CANCEL_CHEQUE',
  MSME_CERTIFICATE: 'VENDOR_DOC_MSME_CERTIFICATE',
  MOA: 'VENDOR_DOC_MOA',
  AOA: 'VENDOR_DOC_AOA',
};

export const VENDOR_DOCUMENT_KEY_TO_SECTION = {
  pan: VENDOR_DOCUMENT_SECTIONS.PAN,
  gst: VENDOR_DOCUMENT_SECTIONS.GST,
  coi: VENDOR_DOCUMENT_SECTIONS.COI,
  cancelCheque: VENDOR_DOCUMENT_SECTIONS.CANCEL_CHEQUE,
  msmeCertificate: VENDOR_DOCUMENT_SECTIONS.MSME_CERTIFICATE,
  moa: VENDOR_DOCUMENT_SECTIONS.MOA,
  aoa: VENDOR_DOCUMENT_SECTIONS.AOA,
};

export const VENDOR_DOCUMENT_SECTION_TO_KEY = Object.fromEntries(
  Object.entries(VENDOR_DOCUMENT_KEY_TO_SECTION).map(([key, section]) => [section, key]),
);

export const VENDOR_DOCUMENT_DEFAULT_LABELS = Object.fromEntries(
  VENDOR_DOCUMENT_TYPES.map(({ key, label }) => [
    VENDOR_DOCUMENT_KEY_TO_SECTION[key],
    label,
  ]).filter(([section]) => Boolean(section)),
);

export const DEFAULT_VENDOR_DOCUMENT_CATALOG = VENDOR_DOCUMENT_TYPES.map(({ key, label }) => ({
  displayName: label,
  screen: 'VENDOR',
  section: VENDOR_DOCUMENT_KEY_TO_SECTION[key],
})).filter((entry) => entry.section);

export const normalizeVendorDocumentSection = (section = '') =>
  String(section || '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');

export const normalizeVendorDocumentCatalog = (catalog = []) => {
  if (!Array.isArray(catalog)) return [];
  return catalog
    .map((item) => {
      const section = normalizeVendorDocumentSection(item?.section);
      if (!section) return null;
      return {
        displayName: String(
          item?.displayName || VENDOR_DOCUMENT_DEFAULT_LABELS[section] || section,
        ).trim(),
        screen: String(item?.screen || 'VENDOR').trim(),
        section,
      };
    })
    .filter(Boolean);
};

export const normalizeActiveVendorDocuments = (activeVendorDocuments = []) => {
  if (!Array.isArray(activeVendorDocuments)) return [];
  return activeVendorDocuments.map(normalizeVendorDocumentSection).filter(Boolean);
};

export const getVendorDocumentDisplayName = (sectionId, catalog = []) => {
  const section = normalizeVendorDocumentSection(sectionId);
  const catalogItem = normalizeVendorDocumentCatalog(catalog).find(
    (item) => item.section === section,
  );
  return catalogItem?.displayName || VENDOR_DOCUMENT_DEFAULT_LABELS[section] || section;
};

export const getVisibleVendorDocumentTypes = (
  activeVendorDocuments,
  catalog = DEFAULT_VENDOR_DOCUMENT_CATALOG,
) => {
  if (activeVendorDocuments === undefined || activeVendorDocuments === null) {
    return VENDOR_DOCUMENT_TYPES;
  }

  const normalized = normalizeActiveVendorDocuments(activeVendorDocuments);
  if (normalized.length === 0) {
    return [];
  }

  const allowedKeys = new Set(
    normalized
      .map((section) => VENDOR_DOCUMENT_SECTION_TO_KEY[section])
      .filter(Boolean),
  );

  return VENDOR_DOCUMENT_TYPES.filter(({ key }) => allowedKeys.has(key));
};

export const hasVisibleVendorDocuments = (
  activeVendorDocuments = [],
  catalog = DEFAULT_VENDOR_DOCUMENT_CATALOG,
) => getVisibleVendorDocumentTypes(activeVendorDocuments, catalog).length > 0;
