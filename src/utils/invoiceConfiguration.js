export const INVOICE_CONFIG_SECTIONS = {
  CHECKER: 'CHECKER',
};

export const CHECKER_EDIT_DISABLED_MESSAGE =
  'Invoice editing during checker review is not enabled for this corporate';

export const DEFAULT_INVOICE_CONFIGURATION = [
  {
    displayName: 'Edit Invoice',
    screen: 'APPROVAL',
    section: INVOICE_CONFIG_SECTIONS.CHECKER,
  },
];

export const normalizeInvoiceConfigSection = (section = '') =>
  String(section || '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');

export const normalizeInvoiceConfigurationCatalog = (catalog = []) => {
  if (!Array.isArray(catalog)) return [];
  return catalog
    .map((item) => {
      const section = normalizeInvoiceConfigSection(item?.section);
      if (!section) return null;
      return {
        displayName: String(item?.displayName || section).trim(),
        screen: String(item?.screen || 'APPROVAL').trim(),
        section,
      };
    })
    .filter(Boolean);
};

export const normalizeActiveInvoiceConfiguration = (activeConfiguration = []) => {
  if (!Array.isArray(activeConfiguration)) return [];
  return activeConfiguration.map(normalizeInvoiceConfigSection).filter(Boolean);
};

export const isInvoiceConfigurationEnabled = (
  sectionId,
  activeInvoiceConfiguration = [],
) => {
  const normalized = normalizeActiveInvoiceConfiguration(activeInvoiceConfiguration);
  if (normalized.length === 0) return false;
  return normalized.includes(normalizeInvoiceConfigSection(sectionId));
};

export const isCheckerEditEnabled = (activeInvoiceConfiguration = []) =>
  isInvoiceConfigurationEnabled(
    INVOICE_CONFIG_SECTIONS.CHECKER,
    activeInvoiceConfiguration,
  );

export const isCheckerEditForbiddenError = (error) => {
  const detail = String(error?.data?.detail ?? error?.data?.message ?? '').trim();
  if (!detail) return false;
  return (
    detail === CHECKER_EDIT_DISABLED_MESSAGE ||
    detail.toLowerCase().includes('checker review is not enabled')
  );
};
