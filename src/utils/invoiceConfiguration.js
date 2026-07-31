export const INVOICE_CONFIG_SECTIONS = {
  CHECKER: 'CHECKER',
  REF_NO: 'REF_NO',
  BRANCH: 'BRANCH',
  SQ_FT: 'SQ_FT',
  NET_PAYABLE_EDIT: 'NET_PAYABLE_EDIT',
  ALLOW_INVOICE_LINE_ITEM_REMOVAL: 'ALLOW_INVOICE_LINE_ITEM_REMOVAL',
};

const INVOICE_LINE_ITEM_REMOVAL_SECTION_ALIASES = [
  INVOICE_CONFIG_SECTIONS.ALLOW_INVOICE_LINE_ITEM_REMOVAL,
  'ALLOWINVOICELINEITEMREMOVAL',
];

export const CHECKER_EDIT_DISABLED_MESSAGE =
  'Invoice editing during checker review is not enabled for this corporate';

export const DEFAULT_INVOICE_CONFIGURATION = [
  {
    displayName: 'Edit Invoice',
    screen: 'APPROVAL',
    section: INVOICE_CONFIG_SECTIONS.CHECKER,
  },
  {
    displayName: 'Ref No',
    screen: 'INVOICE',
    section: INVOICE_CONFIG_SECTIONS.REF_NO,
  },
  {
    displayName: 'Edit Net Payable',
    screen: 'INVOICE',
    section: INVOICE_CONFIG_SECTIONS.NET_PAYABLE_EDIT,
  },
  {
    displayName: 'Allow Summary Only invoices',
    screen: 'INVOICE',
    section: INVOICE_CONFIG_SECTIONS.ALLOW_INVOICE_LINE_ITEM_REMOVAL,
  },
];

export const BRANCH_MODULE_SECTION_IDS = [
  INVOICE_CONFIG_SECTIONS.BRANCH,
  INVOICE_CONFIG_SECTIONS.SQ_FT,
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

export const isBranchModuleEnabled = (
  sectionId,
  { activeInvoiceConfiguration = [], enabledSections = [] } = {},
) => {
  if (isInvoiceConfigurationEnabled(sectionId, activeInvoiceConfiguration)) {
    return true;
  }

  const normalizedSection = normalizeInvoiceConfigSection(sectionId);
  return (enabledSections || [])
    .map(normalizeInvoiceConfigSection)
    .includes(normalizedSection);
};

export const isCheckerEditEnabled = (activeInvoiceConfiguration = []) =>
  isInvoiceConfigurationEnabled(
    INVOICE_CONFIG_SECTIONS.CHECKER,
    activeInvoiceConfiguration,
  );

export const isRefNoEnabled = (activeInvoiceConfiguration = []) =>
  isInvoiceConfigurationEnabled(
    INVOICE_CONFIG_SECTIONS.REF_NO,
    activeInvoiceConfiguration,
  );

export const isNetPayableEditEnabled = (activeInvoiceConfiguration = []) =>
  isInvoiceConfigurationEnabled(
    INVOICE_CONFIG_SECTIONS.NET_PAYABLE_EDIT,
    activeInvoiceConfiguration,
  );

export const isInvoiceLineItemRemovalEnabled = (activeInvoiceConfiguration = []) =>
  INVOICE_LINE_ITEM_REMOVAL_SECTION_ALIASES.some((sectionId) =>
    isInvoiceConfigurationEnabled(sectionId, activeInvoiceConfiguration),
  );

export const isBranchEnabled = (
  activeInvoiceConfiguration = [],
  enabledSections = [],
) =>
  isBranchModuleEnabled(INVOICE_CONFIG_SECTIONS.BRANCH, {
    activeInvoiceConfiguration,
    enabledSections,
  });

export const isBranchSqFtEnabled = (
  activeInvoiceConfiguration = [],
  enabledSections = [],
) =>
  isBranchModuleEnabled(INVOICE_CONFIG_SECTIONS.SQ_FT, {
    activeInvoiceConfiguration,
    enabledSections,
  });

export const isBranchCostAnalysisEnabled = (
  activeInvoiceConfiguration = [],
  enabledSections = [],
) =>
  isBranchEnabled(activeInvoiceConfiguration, enabledSections) &&
  isBranchSqFtEnabled(activeInvoiceConfiguration, enabledSections);

export const getCorporateBranchEntitlements = (corporateScreens = {}) => ({
  activeInvoiceConfiguration: corporateScreens?.activeInvoiceConfiguration ?? [],
  enabledSections: corporateScreens?.enabledSections ?? [],
});

export const isBranchEnabledForCorporate = (corporateScreens = {}) => {
  const { activeInvoiceConfiguration, enabledSections } =
    getCorporateBranchEntitlements(corporateScreens);
  return isBranchEnabled(activeInvoiceConfiguration, enabledSections);
};

export const isBranchSqFtEnabledForCorporate = (corporateScreens = {}) => {
  const { activeInvoiceConfiguration, enabledSections } =
    getCorporateBranchEntitlements(corporateScreens);
  return isBranchSqFtEnabled(activeInvoiceConfiguration, enabledSections);
};

export const isBranchCostAnalysisEnabledForCorporate = (corporateScreens = {}) => {
  const { activeInvoiceConfiguration, enabledSections } =
    getCorporateBranchEntitlements(corporateScreens);
  return isBranchCostAnalysisEnabled(activeInvoiceConfiguration, enabledSections);
};

/** Paid when Payments is subscribed; Approved otherwise (final workflow status). */
export const getBranchCostStatuses = (isPaymentsEnabled = false) =>
  isPaymentsEnabled ? ['PAID'] : ['APPROVED'];

export const isCheckerEditForbiddenError = (error) => {
  const detail = String(error?.data?.detail ?? error?.data?.message ?? '').trim();
  if (!detail) return false;
  return (
    detail === CHECKER_EDIT_DISABLED_MESSAGE ||
    detail.toLowerCase().includes('checker review is not enabled')
  );
};
