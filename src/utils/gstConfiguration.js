export const GST_CONFIG_SECTIONS = {
  RECONCILIATION: 'GST_RECONCILIATION',
  RETURNS: 'GST_RETURNS',
  DOCUMENTS: 'GST_DOCUMENTS',
  LEDGERS: 'GST_LEDGERS',
};

export const GST_TAB_VALUES = {
  OVERVIEW: 'overview',
  RECONCILIATION: 'reconciliation',
  RETURNS: 'returns',
  DOCUMENTS: 'documents',
  LEDGERS: 'ledgers',
};

export const GST_TAB_TO_SECTION = {
  [GST_TAB_VALUES.RECONCILIATION]: GST_CONFIG_SECTIONS.RECONCILIATION,
  [GST_TAB_VALUES.RETURNS]: GST_CONFIG_SECTIONS.RETURNS,
  [GST_TAB_VALUES.DOCUMENTS]: GST_CONFIG_SECTIONS.DOCUMENTS,
  [GST_TAB_VALUES.LEDGERS]: GST_CONFIG_SECTIONS.LEDGERS,
};

export const DEFAULT_GST_CONFIGURATION = [
  {
    displayName: 'Reconciliation',
    screen: 'TAX_MANAGEMENT',
    section: GST_CONFIG_SECTIONS.RECONCILIATION,
  },
  {
    displayName: 'Returns',
    screen: 'TAX_MANAGEMENT',
    section: GST_CONFIG_SECTIONS.RETURNS,
  },
  {
    displayName: 'Documents',
    screen: 'TAX_MANAGEMENT',
    section: GST_CONFIG_SECTIONS.DOCUMENTS,
  },
  {
    displayName: 'Ledgers',
    screen: 'TAX_MANAGEMENT',
    section: GST_CONFIG_SECTIONS.LEDGERS,
  },
];

export const ALL_GST_TAB_SECTION_IDS = DEFAULT_GST_CONFIGURATION.map(
  (entry) => entry.section,
);

export const normalizeGstConfigSection = (section = '') =>
  String(section || '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');

export const normalizeGstConfigurationCatalog = (catalog = []) => {
  if (!Array.isArray(catalog)) return [];
  return catalog
    .map((item) => {
      const section = normalizeGstConfigSection(item?.section);
      if (!section) return null;
      const defaultEntry = DEFAULT_GST_CONFIGURATION.find(
        (entry) => entry.section === section,
      );
      return {
        displayName: String(item?.displayName || defaultEntry?.displayName || section).trim(),
        screen: String(item?.screen || 'TAX_MANAGEMENT').trim(),
        section,
      };
    })
    .filter(Boolean);
};

export const normalizeActiveGstConfiguration = (activeGstConfiguration = []) => {
  if (!Array.isArray(activeGstConfiguration)) return [];
  return activeGstConfiguration.map(normalizeGstConfigSection).filter(Boolean);
};

export const resolveActiveGstConfiguration = ({
  activeGstConfiguration,
  hasExplicitActiveGstConfiguration = false,
} = {}) => {
  if (hasExplicitActiveGstConfiguration) {
    return normalizeActiveGstConfiguration(activeGstConfiguration);
  }

  return [...ALL_GST_TAB_SECTION_IDS];
};

export const isGstConfigurationEnabled = (sectionId, activeGstConfiguration = []) => {
  const normalized = normalizeActiveGstConfiguration(activeGstConfiguration);
  return normalized.includes(normalizeGstConfigSection(sectionId));
};

export const isGstTabEnabled = (tabValue, activeGstConfiguration = []) => {
  if (tabValue === GST_TAB_VALUES.OVERVIEW) return true;

  const sectionId = GST_TAB_TO_SECTION[tabValue];
  if (!sectionId) return false;

  return isGstConfigurationEnabled(sectionId, activeGstConfiguration);
};
