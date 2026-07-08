export const DEFAULT_GRN_TEMPLATE_CODE = 'GRN_T1';

export const DEFAULT_GRN_FORMAT_CONFIG = {
  id: 'default-grn-format',
  name: 'Standard GRN Format',
  companyName: 'Optifii AP',
  grnNumberPrefix: 'GRN-',
  templateCode: DEFAULT_GRN_TEMPLATE_CODE,
  qc_enabled: true,
  valuation_enabled: false,
  bill_to_enabled: false,
  approval_enabled: true,
  sections: [
    {
      section: 'HEADER',
      label: 'Header',
      isEnabled: true,
      fields: [
        { fieldKey: 'grn_number', label: 'GRN Number', isEnabled: true, isSystemField: true },
        { fieldKey: 'grn_date', label: 'GRN Date', isEnabled: true, isSystemField: true },
        { fieldKey: 'po_reference', label: 'PO Reference', isEnabled: true, isSystemField: false },
        { fieldKey: 'vendor_name', label: 'Vendor', isEnabled: true, isSystemField: true },
        { fieldKey: 'location', label: 'Received-at Location', isEnabled: true, isSystemField: false },
        { fieldKey: 'source_badge', label: 'Source Badge', isEnabled: true, isSystemField: false },
      ],
    },
    {
      section: 'DELIVERY',
      label: 'Delivery Details',
      isEnabled: true,
      fields: [
        { fieldKey: 'challan', label: 'Delivery Challan No.', isEnabled: true, isSystemField: false },
        { fieldKey: 'challan_date', label: 'Challan Date', isEnabled: false, isSystemField: false },
        { fieldKey: 'eway_bill', label: 'E-Way Bill No.', isEnabled: true, isSystemField: false },
        { fieldKey: 'vehicle', label: 'Vehicle No.', isEnabled: true, isSystemField: false },
        { fieldKey: 'transporter', label: 'Transporter Name', isEnabled: true, isSystemField: false },
        { fieldKey: 'lr_number', label: 'LR / Consignment No.', isEnabled: false, isSystemField: false },
      ],
    },
    {
      section: 'LINE_ITEM',
      label: 'Line Columns',
      isEnabled: true,
      fields: [
        { fieldKey: 'item_code', label: 'Item Code', isEnabled: true, isSystemField: false },
        { fieldKey: 'hsn_sac', label: 'HSN / SAC', isEnabled: true, isSystemField: false },
        { fieldKey: 'uom', label: 'UOM', isEnabled: true, isSystemField: false },
        { fieldKey: 'ordered_qty', label: 'Ordered Qty (ref)', isEnabled: true, isSystemField: false },
        { fieldKey: 'already_received', label: 'Already Received', isEnabled: true, isSystemField: false },
        { fieldKey: 'received_qty', label: 'Received Qty', isEnabled: true, isSystemField: true },
        { fieldKey: 'accepted_qty', label: 'Accepted Qty (QC)', isEnabled: true, isSystemField: false },
        { fieldKey: 'rejected_qty', label: 'Rejected Qty (QC)', isEnabled: true, isSystemField: false },
        { fieldKey: 'rejection_reason', label: 'Rejection Reason', isEnabled: true, isSystemField: false },
        { fieldKey: 'rate', label: 'Rate', isEnabled: false, isSystemField: false },
        { fieldKey: 'amount', label: 'Amount', isEnabled: false, isSystemField: false },
        { fieldKey: 'gst_rate', label: 'GST %', isEnabled: false, isSystemField: false },
        { fieldKey: 'batch_no', label: 'Batch / Lot No.', isEnabled: false, isSystemField: false },
        { fieldKey: 'line_remarks', label: 'Line Remarks', isEnabled: false, isSystemField: false },
      ],
    },
    {
      section: 'INSPECTION',
      label: 'Inspection (QC)',
      isEnabled: true,
      fields: [
        { fieldKey: 'inspected_by', label: 'Inspected By', isEnabled: true, isSystemField: false },
      ],
    },
    {
      section: 'FOOTER',
      label: 'Footer',
      isEnabled: true,
      fields: [
        { fieldKey: 'received_by', label: 'Received By', isEnabled: true, isSystemField: false },
        { fieldKey: 'remarks', label: 'Remarks', isEnabled: true, isSystemField: false },
        { fieldKey: 'signatures', label: 'Signatures Block', isEnabled: false, isSystemField: false },
      ],
    },
  ],
};

export const cloneGrnFormatConfig = (config = DEFAULT_GRN_FORMAT_CONFIG) =>
  JSON.parse(JSON.stringify(config));

export const normalizeGrnTemplateCode = () => DEFAULT_GRN_TEMPLATE_CODE;

const GRN_TEMPLATE_ONLY_NAME = /^(?:GRN_)?T[1-5]$/i;

export const sanitizeGrnFormatName = (name = '', fallback = 'Standard GRN Format') => {
  let trimmed = String(name || '').trim();
  if (!trimmed) return fallback;

  trimmed = trimmed
    .replace(/\s*\((?:GRN_)?T[1-5]\)\s*$/i, '')
    .replace(/\s*[-–]\s*(?:GRN_)?T[1-5]\s*$/i, '')
    .trim();

  if (!trimmed || GRN_TEMPLATE_ONLY_NAME.test(trimmed)) return fallback;
  return trimmed;
};

export const getDuplicateGrnFormatNameError = (
  name,
  formats = [],
  excludeFormatId = '',
) => {
  const normalizedName = sanitizeGrnFormatName(name, '').trim().toLowerCase();
  if (!normalizedName) return 'Please name this GRN format';

  const hasDuplicate = formats.some((format) => {
    if (!format?.id || format.id === excludeFormatId) return false;
    return sanitizeGrnFormatName(format.name, '').trim().toLowerCase() === normalizedName;
  });

  return hasDuplicate ? 'A GRN format with this name already exists' : null;
};

export const getNextGrnFormatName = (formats = []) => {
  let index = Math.max(formats.length + 1, 1);
  while (getDuplicateGrnFormatNameError(`Format ${index}`, formats)) {
    index += 1;
  }
  return `Format ${index}`;
};

const getSection = (config, sectionKey) =>
  (config?.sections || []).find((section) => section.section === sectionKey);

const getField = (config, sectionKey, fieldKey) =>
  getSection(config, sectionKey)?.fields?.find((field) => field.fieldKey === fieldKey);

export const sectionEnabled = (config, sectionKey) =>
  Boolean(getSection(config, sectionKey)?.isEnabled);

export const fieldEnabled = (config, sectionKey, fieldKey) => {
  const section = getSection(config, sectionKey);
  if (!section?.isEnabled) return false;
  const field = getField(config, sectionKey, fieldKey);
  if (!field) return false;
  if (sectionKey === 'LINE_ITEM' && ['accepted_qty', 'rejected_qty', 'rejection_reason'].includes(fieldKey)) {
    return Boolean(config?.qc_enabled) && field.isEnabled;
  }
  if (sectionKey === 'LINE_ITEM' && ['rate', 'amount', 'gst_rate'].includes(fieldKey)) {
    return Boolean(config?.valuation_enabled) && field.isEnabled;
  }
  return Boolean(field.isEnabled);
};

/** Merge API / legacy flat config into PO-style sections config */
export const normalizeGrnFormatConfig = (raw = {}) => {
  const base = cloneGrnFormatConfig(DEFAULT_GRN_FORMAT_CONFIG);

  if (Array.isArray(raw.sections) && raw.sections.length > 0) {
    return {
      ...base,
      ...raw,
      name: sanitizeGrnFormatName(raw.name ?? base.name, base.name),
      templateCode: normalizeGrnTemplateCode(raw.templateCode ?? raw.template_code),
      qc_enabled: raw.qc_enabled ?? raw.qcEnabled ?? base.qc_enabled,
      valuation_enabled: raw.valuation_enabled ?? raw.valuationEnabled ?? base.valuation_enabled,
      bill_to_enabled: raw.bill_to_enabled ?? raw.billToEnabled ?? base.bill_to_enabled,
      approval_enabled: raw.approval_enabled ?? raw.approvalEnabled ?? base.approval_enabled,
      sections: raw.sections.map((section) => ({
        ...section,
        fields: (section.fields || []).map((field) => ({ ...field })),
      })),
    };
  }

  const legacySections = raw.sections || {};
  const legacyColumns = raw.line_columns || {};

  const patchField = (sectionKey, fieldKey, enabled) => {
    const section = base.sections.find((item) => item.section === sectionKey);
    const field = section?.fields?.find((item) => item.fieldKey === fieldKey);
    if (field && enabled !== undefined) field.isEnabled = Boolean(enabled);
  };

  if (legacySections.header) {
    patchField('HEADER', 'po_reference', legacySections.header.po_reference);
    patchField('HEADER', 'location', legacySections.header.location);
  }
  if (legacySections.delivery) {
    const delivery = base.sections.find((item) => item.section === 'DELIVERY');
    if (delivery) delivery.isEnabled = legacySections.delivery.enabled !== false;
    patchField('DELIVERY', 'challan', legacySections.delivery.challan);
    patchField('DELIVERY', 'challan_date', legacySections.delivery.challan_date);
    patchField('DELIVERY', 'eway_bill', legacySections.delivery.eway_bill);
    patchField('DELIVERY', 'vehicle', legacySections.delivery.vehicle);
    patchField('DELIVERY', 'transporter', legacySections.delivery.transporter);
    patchField('DELIVERY', 'lr_number', legacySections.delivery.lr_number);
  }
  if (legacySections.footer) {
    const footer = base.sections.find((item) => item.section === 'FOOTER');
    if (footer) footer.isEnabled = legacySections.footer.enabled !== false;
    patchField('FOOTER', 'received_by', legacySections.footer.received_by);
    patchField('FOOTER', 'remarks', legacySections.footer.remarks);
    patchField('FOOTER', 'signatures', legacySections.footer.signatures);
  }

  Object.entries(legacyColumns).forEach(([key, value]) => patchField('LINE_ITEM', key, value));

  return {
    ...base,
    ...raw,
    qc_enabled: raw.qc_enabled ?? base.qc_enabled,
    valuation_enabled: raw.valuation_enabled ?? raw.valuationEnabled ?? base.valuation_enabled,
    bill_to_enabled: raw.bill_to_enabled ?? raw.billToEnabled ?? base.bill_to_enabled,
    approval_enabled: raw.approval_enabled ?? base.approval_enabled,
    templateCode: normalizeGrnTemplateCode(raw.templateCode ?? raw.template_code),
    grnNumberPrefix: raw.grnNumberPrefix ?? raw.grn_number_prefix ?? base.grnNumberPrefix,
    companyName: raw.companyName ?? raw.company_name ?? base.companyName,
    name: sanitizeGrnFormatName(raw.name ?? base.name, base.name),
    id: raw.id ?? base.id,
  };
};

export const isGrnDeliveryEnabled = (config) => sectionEnabled(config, 'DELIVERY');
export const isGrnFooterEnabled = (config) => sectionEnabled(config, 'FOOTER');
export const isGrnValuationEnabled = (config) => Boolean(config?.valuation_enabled);
export const isGrnBillToEnabled = (config) => Boolean(config?.bill_to_enabled);
export const isGrnLineColumnEnabled = (config, key) => fieldEnabled(config, 'LINE_ITEM', key);
export const isGrnDeliveryFieldEnabled = (config, key) => fieldEnabled(config, 'DELIVERY', key);
export const isGrnFooterFieldEnabled = (config, key) => fieldEnabled(config, 'FOOTER', key);
export const isGrnHeaderFieldEnabled = (config, key) => fieldEnabled(config, 'HEADER', key);

export const isUnsavedGrnFormat = (formatId = '') => String(formatId).startsWith('new-format-');

export const getCreatedGrnFormatFromResponse = (response = {}) =>
  response?.data ?? response?.formatConfig ?? response?.grnFormatConfig ?? response;

export const makeGrnFormatConfig = (
  config = {},
  fallbackId = 'default-grn-format',
  fallbackName = 'Standard GRN Format',
  tenantBranding = {},
) => {
  const normalized = normalizeGrnFormatConfig(config);
  return {
    ...normalized,
    id: config.id || fallbackId,
    name: sanitizeGrnFormatName(config.name || fallbackName, fallbackName),
    companyName:
      config.companyName ||
      config.company_name ||
      tenantBranding.companyName ||
      normalized.companyName ||
      'Company Name',
    isDefault: Boolean(config.isDefault ?? config.is_default),
    configVersion: Number(config.configVersion ?? config.config_version ?? 0),
  };
};

export const buildGrnFormatConfigPayload = (config = {}) => ({
  name: sanitizeGrnFormatName(config.name, ''),
  companyName: config.companyName,
  grnNumberPrefix: config.grnNumberPrefix,
  templateCode: normalizeGrnTemplateCode(config.templateCode),
  qcEnabled: Boolean(config.qc_enabled),
  valuationEnabled: Boolean(config.valuation_enabled),
  billToEnabled: Boolean(config.bill_to_enabled),
  approvalEnabled: Boolean(config.approval_enabled),
  isDefault: Boolean(config.isDefault),
  configVersion: config.configVersion || 0,
  sections: (config.sections || []).map((section, sectionIndex) => ({
    section: section.section,
    label: section.label,
    isEnabled: Boolean(section.isEnabled),
    displayOrder: section.displayOrder ?? sectionIndex + 1,
    fields: (section.fields || []).map((field, fieldIndex) => ({
      fieldKey: field.fieldKey,
      label: field.label,
      isEnabled: Boolean(field.isEnabled),
      isMandatory: Boolean(field.isMandatory),
      labelOverride: field.labelOverride || null,
      displayOrder: field.displayOrder ?? fieldIndex + 1,
      isSystemField: Boolean(field.isSystemField),
    })),
  })),
});

export const buildGrnConfigSnapshot = (config = {}) => ({
  qc_enabled: Boolean(config.qc_enabled),
  valuation_enabled: Boolean(config.valuation_enabled),
  bill_to_enabled: Boolean(config.bill_to_enabled),
  approval_enabled: Boolean(config.approval_enabled),
  template_code: normalizeGrnTemplateCode(config.templateCode),
  grn_number_prefix: config.grnNumberPrefix || '',
  company_name: config.companyName || '',
  sections: cloneGrnFormatConfig(config).sections,
});

export const areGrnFormatListsEquivalent = (left = [], right = []) => {
  if (left.length !== right.length) return false;
  for (let index = 0; index < left.length; index += 1) {
    const leftItem = left[index];
    const rightItem = right[index];
    if (!leftItem || !rightItem) return false;
    if (leftItem.id !== rightItem.id) return false;
    if (leftItem.name !== rightItem.name) return false;
  }
  return true;
};
