import { format } from 'date-fns';
import { TAX_RATES } from '../../invoices/constants';
import { parseTaxRateFromLabel } from '../../invoices/utils/invoiceTax';
import { findVendorByInvoiceName } from '../../invoices/utils/vendorMatching';
import { DEFAULT_CURRENCY, normalizeCurrencyCode } from '../../../utils/currency';
import { sanitizeLineItemForCurrency } from './index';
import { extractScannedPoTotals, readScanNumber } from './poTotals';

const toDateOnly = (value) => {
  if (!value) return '';
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? '' : format(parsed, 'yyyy-MM-dd');
};

const normalizeGstin = (value = '') => String(value || '').trim().toUpperCase();

const getRegistrationValue = (registration, ...keys) => {
  for (const key of keys) {
    const value = registration?.[key];
    if (value !== undefined && value !== null && value !== '') return value;
  }
  return '';
};

const getVendorGstRegistrationsForScan = (vendor = {}) => {
  const safeVendor = vendor || {};
  const registrations =
    safeVendor.gstRegistrations ??
    safeVendor.gst_regs ??
    safeVendor.gstRegs ??
    safeVendor.gst_registrations;
  const mapped = Array.isArray(registrations)
    ? registrations
      .map((registration) => {
        const gstin = normalizeGstin(getRegistrationValue(registration, 'gstin', 'gstIn', 'gst'));
        if (!gstin) return null;
        return {
          id: getRegistrationValue(registration, 'id', 'registrationId', 'registration_id') || gstin,
          gstin,
          pan: getRegistrationValue(registration, 'pan', 'vendorPan', 'vendor_pan') || safeVendor.pan || '',
        };
      })
      .filter(Boolean)
    : [];

  const vendorLevelGstin = normalizeGstin(safeVendor.gstin);
  if (vendorLevelGstin && !mapped.some((registration) => registration.gstin === vendorLevelGstin)) {
    mapped.unshift({
      id: vendorLevelGstin,
      gstin: vendorLevelGstin,
      pan: safeVendor.pan || '',
    });
  }

  return mapped;
};

const UOM_MAP = {
  PCS: 'PCS',
  NOS: 'NOS',
  NO: 'NOS',
  NUMBERS: 'NOS',
  KG: 'KG',
  KGS: 'KG',
  MTR: 'MTR',
  METER: 'MTR',
  METERS: 'MTR',
  HRS: 'HRS',
  HR: 'HRS',
  HOUR: 'HRS',
  HOURS: 'HRS',
};

const normalizeUom = (value = '') => {
  const normalized = String(value || '').trim().toUpperCase();
  return UOM_MAP[normalized] || normalized.slice(0, 3) || 'NOS';
};

const readTaxComponent = (item, camelKey, snakeKey) =>
  Number(item?.[camelKey] ?? item?.[snakeKey] ?? 0) || 0;

const resolvePoGstTaxLabel = (item = {}) => {
  const rate = readTaxComponent(item, 'gstRate', 'gst_rate');
  const igstPercent = readTaxComponent(item, 'igstPercent', 'igst_percent');
  const igstAmount = readTaxComponent(item, 'igstAmount', 'igst_amount');
  const cgstPercent = readTaxComponent(item, 'cgstPercent', 'cgst_percent');
  const cgstAmount = readTaxComponent(item, 'cgstAmount', 'cgst_amount');
  const sgstPercent = readTaxComponent(item, 'sgstPercent', 'sgst_percent');
  const sgstAmount = readTaxComponent(item, 'sgstAmount', 'sgst_amount');

  if (!rate) return 'Exempt';

  const hasIgst = igstPercent > 0 || igstAmount > 0;
  const hasCgstSgst =
    cgstPercent > 0 ||
    cgstAmount > 0 ||
    sgstPercent > 0 ||
    sgstAmount > 0;
  const isIgst = hasIgst && !hasCgstSgst;

  const match = TAX_RATES.find((option) => {
    const optionRate = parseTaxRateFromLabel(option.value);
    if (isIgst) return option.value.startsWith('IGST') && optionRate === rate;
    return option.value.startsWith('CGST') && optionRate === rate;
  });

  if (match) return match.value;
  return isIgst ? `IGST ${rate}%` : `CGST + SGST ${rate}%`;
};

const normalizeScannedLineItem = (item = {}, currency = DEFAULT_CURRENCY) => {
  const gstRate = Number(item.gstRate ?? item.gst_rate ?? 0);
  const gstTaxLabel = resolvePoGstTaxLabel(item);

  return sanitizeLineItemForCurrency(
    {
      item_description: String(item.description ?? item.itemDescription ?? item.itemCode ?? '').trim(),
      hsn_sac_code: String(item.hsnSac ?? item.hsn_sac ?? item.hsnSacCode ?? '').trim(),
      quantity: Number(item.quantity) || 1,
      unit_of_measure: normalizeUom(item.uom ?? item.unitOfMeasure),
      unit_price: Number(item.unitPrice ?? item.unit_price ?? item.unitRate ?? 0) || 0,
      discount_percent: Number(item.discountPercent ?? item.discount_percent ?? 0) || 0,
      gst_rate: gstRate,
      gst_tax_label: gstTaxLabel,
      remarks: String(item.remarks ?? '').trim(),
      taxable_value:
        readScanNumber(item, 'taxableValue', 'taxable_value') ??
        readScanNumber(item, 'amount', 'amount'),
      tax_amount: readScanNumber(item, 'taxAmount', 'tax_amount'),
      total_amount:
        readScanNumber(item, 'totalAmount', 'total_amount') ??
        readScanNumber(item, 'lineTotal', 'line_total') ??
        readScanNumber(item, 'amount', 'amount'),
      cgst_amount: readScanNumber(item, 'cgstAmount', 'cgst_amount'),
      sgst_amount: readScanNumber(item, 'sgstAmount', 'sgst_amount'),
      igst_amount: readScanNumber(item, 'igstAmount', 'igst_amount'),
      cess_amount: readScanNumber(item, 'cessAmount', 'cess_amount'),
    },
    currency,
  );
};

const findVendorForPoScan = (vendors = [], { vendorName = '', vendorGstin = '' } = {}) => {
  const list = Array.isArray(vendors) ? vendors : [];
  const normalizedGstin = normalizeGstin(vendorGstin);

  if (normalizedGstin) {
    const byGstin = list.find((vendor) =>
      getVendorGstRegistrationsForScan(vendor).some((registration) => registration.gstin === normalizedGstin),
    );
    if (byGstin) return byGstin;
  }

  return findVendorByInvoiceName(list, vendorName);
};

const normalizeScannedPurchaseOrder = (scanResponse = {}) => {
  const lineItemsRaw = Array.isArray(scanResponse?.lineItems)
    ? scanResponse.lineItems
    : Array.isArray(scanResponse?.line_items)
      ? scanResponse.line_items
      : [];

  const currency = normalizeCurrencyCode(scanResponse?.currency) || DEFAULT_CURRENCY;
  const lineItems = lineItemsRaw
    .map((item) => normalizeScannedLineItem(item, currency))
    .filter((item) => item.item_description || item.unit_price || item.quantity);
  const totals = extractScannedPoTotals(scanResponse);

  return {
    po_number: scanResponse?.poNumber ?? scanResponse?.po_number ?? '',
    po_date: toDateOnly(scanResponse?.poDate ?? scanResponse?.po_date),
    valid_till: toDateOnly(scanResponse?.validTill ?? scanResponse?.valid_till),
    expected_delivery_date: toDateOnly(
      scanResponse?.deliveryDate ??
      scanResponse?.delivery_date ??
      scanResponse?.expectedDeliveryDate ??
      scanResponse?.expected_delivery_date,
    ),
    vendor_name: scanResponse?.vendorName ?? scanResponse?.vendor_name ?? '',
    vendor_gstin: normalizeGstin(scanResponse?.vendorGstin ?? scanResponse?.vendor_gstin),
    billing_address: scanResponse?.billingAddress ?? scanResponse?.billing_address ?? '',
    shipping_address: scanResponse?.shippingAddress ?? scanResponse?.shipping_address ?? '',
    place_of_supply: String(scanResponse?.placeOfSupply ?? scanResponse?.place_of_supply ?? '').trim(),
    currency,
    payment_terms: scanResponse?.paymentTerms ?? scanResponse?.payment_terms ?? scanResponse?.terms ?? '',
    delivery_terms: scanResponse?.deliveryTerms ?? scanResponse?.delivery_terms ?? '',
    freight_terms: scanResponse?.freightTerms ?? scanResponse?.freight_terms ?? '',
    remarks: scanResponse?.notes ?? scanResponse?.remarks ?? '',
    line_items: lineItems.length ? lineItems : [sanitizeLineItemForCurrency({}, currency)],
    ...totals,
  };
};

export const initializePoFormFromScan = (
  scanResponse = {},
  {
    vendors = [],
    defaultCurrency = DEFAULT_CURRENCY,
  } = {},
) => {
  const scanned = normalizeScannedPurchaseOrder(scanResponse);
  const matchedVendor = findVendorForPoScan(vendors, {
    vendorName: scanned.vendor_name,
    vendorGstin: scanned.vendor_gstin,
  });
  const matchedRegistrations = getVendorGstRegistrationsForScan(matchedVendor);
  const matchedRegistration =
    matchedRegistrations.find((registration) => registration.gstin === scanned.vendor_gstin) ||
    (matchedRegistrations.length === 1 ? matchedRegistrations[0] : null);
  const currency = scanned.currency || defaultCurrency;
  const scannedTotals = {
    subtotal: scanned.subtotal,
    total_discount: scanned.total_discount,
    total_taxable_value: scanned.total_taxable_value,
    total_cgst: scanned.total_cgst,
    total_sgst: scanned.total_sgst,
    total_igst: scanned.total_igst,
    total_cess: scanned.total_cess,
    tax_amount: scanned.tax_amount,
    total_amount: scanned.total_amount,
  };
  const totalsOnForm = Object.fromEntries(
    Object.entries(scannedTotals).filter(([, value]) => value !== null),
  );

  return {
    po_number: scanned.po_number || '',
    po_format_id: '',
    vendor_id: matchedVendor?.id ? String(matchedVendor.id) : '',
    vendor_gst_registration_id: matchedRegistration?.id || '',
    vendor_gstin: matchedRegistration?.gstin || '',
    vendor_pan: matchedRegistration?.pan || '',
    po_date: scanned.po_date || new Date().toISOString().split('T')[0],
    valid_till: scanned.valid_till || '',
    expected_delivery_date: scanned.expected_delivery_date || '',
    currency,
    exchange_rate: '',
    place_of_supply: scanned.place_of_supply,
    shipping_address: scanned.shipping_address,
    billing_address: scanned.billing_address,
    delivery_terms: scanned.delivery_terms,
    freight_terms: scanned.freight_terms,
    payment_terms: scanned.payment_terms,
    tds_applicable: false,
    tds_section: '',
    tds_percent: '',
    remarks: scanned.remarks,
    scanned_vendor_name: scanned.vendor_name,
    scanned_vendor_gstin: scanned.vendor_gstin,
    line_items: scanned.line_items,
    ...totalsOnForm,
  };
};
