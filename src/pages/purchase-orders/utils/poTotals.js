import { isInrCurrency } from './index';

export const toPoAmount = (value) => {
  if (value === undefined || value === null || value === '') return null;
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
};

export const readScanNumber = (source, camelKey, snakeKey) =>
  toPoAmount(source?.[camelKey] ?? source?.[snakeKey]);

export const extractScannedPoTotals = (scanResponse = {}) => ({
  subtotal: readScanNumber(scanResponse, 'subtotal', 'subtotal'),
  total_discount: readScanNumber(scanResponse, 'totalDiscount', 'total_discount'),
  total_taxable_value: readScanNumber(scanResponse, 'totalTaxableValue', 'total_taxable_value'),
  total_cgst: readScanNumber(scanResponse, 'totalCgst', 'total_cgst'),
  total_sgst: readScanNumber(scanResponse, 'totalSgst', 'total_sgst'),
  total_igst: readScanNumber(scanResponse, 'totalIgst', 'total_igst'),
  total_cess: readScanNumber(scanResponse, 'totalCess', 'total_cess'),
  tax_amount: readScanNumber(scanResponse, 'taxAmount', 'tax_amount'),
  total_amount: readScanNumber(scanResponse, 'totalAmount', 'total_amount'),
});

export const computeLineSubtotal = (item = {}) => {
  const amount = (Number(item.quantity) || 0) * (Number(item.unit_price) || 0);
  const discount = amount * (Number(item.discount_percent) || 0) / 100;
  return Math.max(amount - discount, 0);
};

export const computeLineTaxAmount = (item = {}, currency = 'INR') => {
  const scannedTax = toPoAmount(item.tax_amount);
  if (scannedTax !== null && item.tax_amount !== undefined && item.tax_amount !== '') {
    return scannedTax;
  }

  if (!isInrCurrency(currency)) return 0;

  const cgst = toPoAmount(item.cgst_amount) ?? 0;
  const sgst = toPoAmount(item.sgst_amount) ?? 0;
  const igst = toPoAmount(item.igst_amount) ?? 0;
  const cess = toPoAmount(item.cess_amount) ?? 0;
  const componentTax = cgst + sgst + igst + cess;
  if (componentTax > 0) return componentTax;

  const taxable = toPoAmount(item.taxable_value) ?? computeLineSubtotal(item);
  return taxable * (Number(item.gst_rate) || 0) / 100;
};

export const computeLineTotal = (item = {}, currency = 'INR') => {
  const scannedTotal = toPoAmount(item.total_amount);
  if (scannedTotal !== null && item.total_amount !== undefined && item.total_amount !== '') {
    return scannedTotal;
  }

  const taxable = toPoAmount(item.taxable_value) ?? computeLineSubtotal(item);
  return taxable + computeLineTaxAmount(item, currency);
};

export const computePoTotalsFromLines = (form = {}) => {
  const currency = form.currency || 'INR';
  const lineItems = form.line_items || [];

  let subtotal = 0;
  let totalDiscount = 0;
  let totalTaxableValue = 0;
  let totalCgst = 0;
  let totalSgst = 0;
  let totalIgst = 0;
  let totalCess = 0;
  let taxAmount = 0;
  let totalAmount = 0;

  lineItems.forEach((item) => {
    const gross = (Number(item.quantity) || 0) * (Number(item.unit_price) || 0);
    const lineSubtotal = computeLineSubtotal(item);
    const taxable = toPoAmount(item.taxable_value) ?? lineSubtotal;

    subtotal += gross;
    totalDiscount += Math.max(gross - lineSubtotal, 0);
    totalTaxableValue += taxable;

    if (isInrCurrency(currency)) {
      totalCgst += toPoAmount(item.cgst_amount) ?? 0;
      totalSgst += toPoAmount(item.sgst_amount) ?? 0;
      totalIgst += toPoAmount(item.igst_amount) ?? 0;
      totalCess += toPoAmount(item.cess_amount) ?? 0;
    }

    taxAmount += computeLineTaxAmount(item, currency);
    totalAmount += computeLineTotal(item, currency);
  });

  if (
    isInrCurrency(currency) &&
    taxAmount > 0 &&
    totalCgst === 0 &&
    totalSgst === 0 &&
    totalIgst === 0
  ) {
    // Keep aggregate tax when line split amounts were not returned.
  }

  return {
    subtotal,
    total_discount: totalDiscount,
    total_taxable_value: totalTaxableValue || subtotal - totalDiscount,
    total_cgst: totalCgst,
    total_sgst: totalSgst,
    total_igst: totalIgst,
    total_cess: totalCess,
    tax_amount: taxAmount,
    total_amount: totalAmount,
  };
};

export const resolvePoTotals = (form = {}) => {
  const calculated = computePoTotalsFromLines(form);
  const headerFields = {
    subtotal: toPoAmount(form.subtotal),
    total_discount: toPoAmount(form.total_discount),
    total_taxable_value: toPoAmount(form.total_taxable_value),
    total_cgst: toPoAmount(form.total_cgst),
    total_sgst: toPoAmount(form.total_sgst),
    total_igst: toPoAmount(form.total_igst),
    total_cess: toPoAmount(form.total_cess),
    tax_amount: toPoAmount(form.tax_amount),
    total_amount: toPoAmount(form.total_amount),
  };

  const hasHeaderTotals = Object.values(headerFields).some((value) => value !== null);

  if (!hasHeaderTotals) {
    return { ...calculated, usesScannedTotals: false };
  }

  return {
    subtotal: headerFields.subtotal ?? calculated.subtotal,
    total_discount: headerFields.total_discount ?? calculated.total_discount,
    total_taxable_value: headerFields.total_taxable_value ?? calculated.total_taxable_value,
    total_cgst: headerFields.total_cgst ?? calculated.total_cgst,
    total_sgst: headerFields.total_sgst ?? calculated.total_sgst,
    total_igst: headerFields.total_igst ?? calculated.total_igst,
    total_cess: headerFields.total_cess ?? calculated.total_cess,
    tax_amount: headerFields.tax_amount ?? calculated.tax_amount,
    total_amount: headerFields.total_amount ?? calculated.total_amount,
    usesScannedTotals: true,
  };
};

const LINE_PRICING_FIELDS = new Set([
  'quantity',
  'unit_price',
  'discount_percent',
  'gst_rate',
  'gst_tax_label',
]);

export const applyUploadLineItemUpdate = (form, index, field, value) => {
  const lineItems = form.line_items.map((item, itemIndex) => {
    if (itemIndex !== index) return item;

    const updated = { ...item, [field]: value };
    if (LINE_PRICING_FIELDS.has(field)) {
      delete updated.taxable_value;
      delete updated.tax_amount;
      delete updated.total_amount;
      delete updated.cgst_amount;
      delete updated.sgst_amount;
      delete updated.igst_amount;
      delete updated.cess_amount;
    }
    return updated;
  });

  return {
    ...form,
    line_items: lineItems,
    ...computePoTotalsFromLines({ ...form, line_items: lineItems }),
  };
};

export const applyUploadLineItemsChange = (form, lineItems) => ({
  ...form,
  line_items: lineItems,
  ...computePoTotalsFromLines({ ...form, line_items: lineItems }),
});
