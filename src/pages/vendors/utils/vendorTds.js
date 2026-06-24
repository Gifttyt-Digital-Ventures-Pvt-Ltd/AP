import {
  buildTdsValue,
  CUSTOM_TDS_SECTION_ID,
  CUSTOM_TDS_VALUE,
  formatTdsLabel,
  isValidCustomTdsRate,
  NO_TDS_VALUE,
  parseTdsSelection,
} from '../../invoices/utils/tds';

export const createEmptyVendorTds = () => ({
  tdsSectionId: null,
  sectionCode: '',
  rate: '',
});

const normalizeRate = (value) => {
  if (value === null || value === undefined || value === '') return null;
  const numeric = Number(String(value).replace(/%/g, '').trim());
  if (!Number.isFinite(numeric) || numeric <= 0 || numeric > 100) return null;
  return Number.isInteger(numeric) ? numeric : Number(numeric.toFixed(4));
};

const normalizeSectionCode = (value) =>
  String(value || '')
    .trim()
    .toUpperCase();

const resolveVendorTdsSource = (vendorOrTds = {}) => {
  if (!vendorOrTds || typeof vendorOrTds !== 'object') return null;

  if (
    vendorOrTds.sectionCode !== undefined ||
    vendorOrTds.rate !== undefined ||
    vendorOrTds.tdsSectionId !== undefined
  ) {
    return vendorOrTds;
  }

  if (vendorOrTds.tdsMapping) return vendorOrTds.tdsMapping;
  if (vendorOrTds.tds_mapping) return vendorOrTds.tds_mapping;

  const mappings = vendorOrTds.tdsMappings ?? vendorOrTds.tds_mappings;
  if (Array.isArray(mappings) && mappings.length > 0) {
    return mappings[0];
  }

  if (vendorOrTds.tdsSectionCode || vendorOrTds.tdsRate || vendorOrTds.tds_rate) {
    return {
      tdsSectionId: vendorOrTds.tdsSectionId ?? vendorOrTds.tds_section_id,
      sectionCode: vendorOrTds.tdsSectionCode ?? vendorOrTds.tds_section_code,
      rate: vendorOrTds.tdsRate ?? vendorOrTds.tds_rate,
    };
  }

  return null;
};

export const normalizeVendorTds = (vendorOrTds = null) => {
  const source = resolveVendorTdsSource(vendorOrTds);
  if (!source) return createEmptyVendorTds();

  const rate = normalizeRate(source.rate ?? source.tdsRate ?? source.tds_rate);
  const sectionCode = normalizeSectionCode(
    source.sectionCode ?? source.section_code ?? source.tdsSectionCode,
  );
  const tdsSectionId = source.tdsSectionId ?? source.tds_section_id ?? null;

  if (rate === null) {
    return {
      tdsSectionId,
      sectionCode,
      rate: source.rate ?? source.tdsRate ?? source.tds_rate ?? '',
    };
  }

  return { tdsSectionId, sectionCode, rate };
};

export const isVendorCustomTdsPending = (vendorOrTds = null) => {
  const normalized = normalizeVendorTds(vendorOrTds);
  const sectionId = String(normalized.tdsSectionId || '').trim();
  const hasRate = normalizeRate(normalized.rate) !== null;

  return sectionId === CUSTOM_TDS_SECTION_ID && !hasRate;
};

export const hasConfiguredVendorTds = (vendorOrTds = null) =>
  !isVendorCustomTdsPending(vendorOrTds) &&
  normalizeRate(normalizeVendorTds(vendorOrTds).rate) !== null;

export const sanitizeVendorTdsForSave = (vendorOrTds = null) => {
  const normalized = normalizeVendorTds(vendorOrTds);
  const rate = normalizeRate(normalized.rate);
  if (rate === null) return null;

  return {
    tdsSectionId: normalized.tdsSectionId || null,
    sectionCode: normalized.sectionCode || null,
    rate,
  };
};

export const formatVendorTdsLabel = ({ sectionCode, rate } = {}) => {
  const normalizedRate = normalizeRate(rate);
  if (normalizedRate === null) return '';

  if (sectionCode) {
    return formatTdsLabel(sectionCode, normalizedRate) || `${sectionCode} · ${normalizedRate}%`;
  }

  return `${normalizedRate}%`;
};

export const vendorTdsToSelectionValue = (vendorOrTds = null) => {
  if (isVendorCustomTdsPending(vendorOrTds)) {
    return CUSTOM_TDS_VALUE;
  }

  const sanitized = sanitizeVendorTdsForSave(vendorOrTds);
  if (!sanitized) return '';

  return buildTdsValue({
    tdsSectionId:
      sanitized.tdsSectionId ||
      `vendor-tds-${sanitized.sectionCode || 'custom'}-${sanitized.rate}`,
    tdsSectionCode: sanitized.sectionCode,
    tdsRate: sanitized.rate,
  });
};

export const vendorTdsFromSelection = ({
  tds = '',
  tdsSectionId = null,
  tdsSectionCode = null,
  tdsRate = null,
} = {}) => {
  if (!tds || tds === NO_TDS_VALUE) {
    return createEmptyVendorTds();
  }

  if (tds === CUSTOM_TDS_VALUE) {
    return {
      tdsSectionId: CUSTOM_TDS_SECTION_ID,
      sectionCode: '',
      rate: '',
    };
  }

  const parsed = parseTdsSelection(tds);
  const rate = parsed.tdsRate ?? tdsRate;
  const normalizedRate = normalizeRate(rate);

  if (normalizedRate === null) {
    return createEmptyVendorTds();
  }

  return {
    tdsSectionId: parsed.tdsSectionId ?? tdsSectionId,
    sectionCode: normalizeSectionCode(parsed.tdsSectionCode ?? tdsSectionCode),
    rate: normalizedRate,
  };
};

export const getVendorTdsValidationErrors = (vendorOrTds = null, { prefix = '' } = {}) => {
  if (isVendorCustomTdsPending(vendorOrTds)) {
    return [`${prefix}Enter a custom TDS rate between 0 and 100`];
  }

  const normalized = normalizeVendorTds(vendorOrTds);
  const rawRate = normalized.rate;
  const hasRate = rawRate !== null && rawRate !== undefined && String(rawRate).trim() !== '';

  if (!hasRate) return [];

  const rate = normalizeRate(rawRate);
  if (rate === null) {
    return [`${prefix}Select a valid TDS option or enter a custom rate between 0 and 100`];
  }

  if (!isValidCustomTdsRate(rate)) {
    return [`${prefix}Enter a custom TDS rate between 0 and 100 with up to 2 decimals`];
  }

  return [];
};

export const buildInvoiceTdsStateFromVendor = (vendor = null) => {
  const tdsValue = vendorTdsToSelectionValue(vendor);
  if (!tdsValue) {
    return {
      tds: '',
      tdsSectionId: null,
      tdsSectionCode: null,
      tdsRate: null,
    };
  }

  return {
    tds: tdsValue,
    ...parseTdsSelection(tdsValue),
  };
};
