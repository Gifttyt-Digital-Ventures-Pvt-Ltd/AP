import { DEFAULT_CURRENCY, normalizeCurrencyCode } from "../../../utils/currency";
import { parseNumericInput } from "./numericInput";

export const DEFAULT_INR_TAX = "CGST + SGST 18%";
export const LINE_ITEM_LEVEL = "At Line Item Level";
export const INVOICE_LEVEL = "At Invoice Level";

export const isInrInvoiceCurrency = (currency) =>
  normalizeCurrencyCode(currency) === DEFAULT_CURRENCY;

export const formatForeignTaxLabel = (taxName, taxRate) => {
  const name = String(taxName || "Tax").trim() || "Tax";
  const rate = Number(taxRate);
  if (!Number.isFinite(rate)) return "Exempt";
  if (rate <= 0) return `${name} 0%`;
  return `${name} ${rate}%`;
};

export const parseTaxRateFromLabel = (taxLabel = "") => {
  if (/exempt/i.test(String(taxLabel))) return 0;
  const percentMatch = String(taxLabel).match(/(\d+(?:\.\d+)?)\s*%/);
  if (!percentMatch) return 0;
  const numeric = Number(percentMatch[1]);
  return Number.isFinite(numeric) ? numeric : 0;
};

export const parseTaxNameFromLabel = (taxLabel = "") => {
  const label = String(taxLabel).trim();
  if (!label || /exempt/i.test(label)) return "";
  const withoutPercent = label.replace(/\s*\d+(?:\.\d+)?\s*%?\s*$/, "").trim();
  return withoutPercent || "Tax";
};

export const applyForeignLineItemTax = (item, taxName, taxRate) => {
  const rate = Number(taxRate);
  const normalizedRate = Number.isFinite(rate) ? rate : "";
  const normalizedName = String(taxName || "").trim();
  return {
    ...item,
    taxName: normalizedName,
    taxRate: normalizedRate,
    tax: formatForeignTaxLabel(normalizedName, normalizedRate),
  };
};

export const applyInrLineItemTax = (item, tax = DEFAULT_INR_TAX) => ({
  ...item,
  tax,
  taxName: "",
  taxRate: "",
});

export const createDefaultLineItem = (currency = DEFAULT_CURRENCY) => {
  const base = {
    description: "",
    ledger: "Cloud Services",
    quantity: 1,
    unitRate: 0,
    discount: 0,
    discountType: "%",
    hsnSac: "",
    eligibleForItc: true,
  };

  if (isInrInvoiceCurrency(currency)) {
    return { ...base, tax: DEFAULT_INR_TAX, lineTotal: 0 };
  }

  return { ...base, taxName: "", taxRate: "", tax: "", lineTotal: 0 };
};

export const resolveInrTaxLabel = (item, taxesRaw = []) => {
  if (item?.tax) return item.tax;

  const rate = Number(item?.taxRate ?? item?.tax_rate ?? 0);
  const hasLineRate = rate > 0;
  const lineTaxAmount = Number(item?.taxAmount ?? item?.tax_amount ?? 0) || 0;
  const totalTaxAmount = taxesRaw.reduce(
    (sum, entry) => sum + (Number(entry?.amount ?? 0) || 0),
    0,
  );

  if (!hasLineRate && totalTaxAmount <= 0) return "Exempt";

  const normalizedTaxes = taxesRaw.map((entry) => ({
    name: String(entry?.name ?? entry?.tax_name ?? "").trim(),
    rate: Number(entry?.taxRate ?? entry?.tax_rate ?? 0) || 0,
    amount: Number(entry?.amount ?? 0) || 0,
  }));
  const approxEquals = (left, right) => Math.abs(Number(left || 0) - Number(right || 0)) < 0.01;

  const exactMatch =
    hasLineRate && lineTaxAmount > 0
      ? normalizedTaxes.find(
          (entry) => approxEquals(entry.rate, rate) && approxEquals(entry.amount, lineTaxAmount),
        )
      : null;

  if (exactMatch) {
    if (/IGST/i.test(exactMatch.name)) return `IGST ${rate}%`;
    if (/CGST|SGST/i.test(exactMatch.name)) return `CGST + SGST ${rate * 2}%`;
  }

  const sameRateTaxes = normalizedTaxes.filter((entry) => approxEquals(entry.rate, rate));
  const hasIgstAtRate = sameRateTaxes.some((entry) => /IGST/i.test(entry.name));
  const hasCgstAtRate = sameRateTaxes.some((entry) => /CGST/i.test(entry.name));
  const hasSgstAtRate = sameRateTaxes.some((entry) => /SGST/i.test(entry.name));

  if (hasIgstAtRate && !(hasCgstAtRate || hasSgstAtRate)) {
    return rate > 0 ? `IGST ${rate}%` : DEFAULT_INR_TAX;
  }

  if (hasCgstAtRate || hasSgstAtRate) {
    const combinedRate = rate > 0 ? rate * 2 : 18;
    return `CGST + SGST ${combinedRate}%`;
  }

  const igstAmount = normalizedTaxes
    .filter((entry) => /IGST/i.test(entry.name))
    .reduce((sum, entry) => sum + entry.amount, 0);
  const cgstSgstAmount = normalizedTaxes
    .filter((entry) => /CGST|SGST/i.test(entry.name))
    .reduce((sum, entry) => sum + entry.amount, 0);

  if (igstAmount > 0 && cgstSgstAmount === 0) {
    return rate > 0 ? `IGST ${rate}%` : DEFAULT_INR_TAX;
  }

  if (cgstSgstAmount > 0 || hasLineRate) {
    const combinedRate = rate > 0 ? rate * 2 : 18;
    return `CGST + SGST ${combinedRate}%`;
  }

  if (!rate) return DEFAULT_INR_TAX;
  return `IGST ${rate}%`;
};

export const resolveScannedLineItemPricing = (item = {}) => {
  const quantity = Number(item?.quantity ?? item?.qty ?? 1) || 1;
  const listUnitPrice =
    Number(item?.unitPrice ?? item?.unitPrice ?? item?.price ?? 0) || 0;
  const lineTotal = Number(
    item?.lineTotal ?? item?.lineTotal ?? item?.amount ?? 0,
  );
  const amount = lineTotal > 0 ? lineTotal : quantity * listUnitPrice;
  const effectiveUnitPrice = quantity > 0 ? amount / quantity : listUnitPrice;

  return {
    quantity,
    unitPrice: effectiveUnitPrice,
    amount,
    lineTotal: amount,
    listUnitPrice: listUnitPrice,
    listAmount: quantity * listUnitPrice,
  };
};

export const resolveScannedInvoiceTaxSummary = (scanResponse = {}, taxesRaw = []) => {
  const totalTaxAmount = Number(
    scanResponse?.totalTaxAmount ??
      scanResponse?.total_tax_amount ??
      scanResponse?.gstAmount ??
      scanResponse?.gst_amount ??
      taxesRaw.reduce((sum, entry) => sum + (Number(entry?.amount ?? 0) || 0), 0),
  );

  const primaryTax = taxesRaw[0] ?? {};
  return {
    invoiceSubtotal: Number(scanResponse?.subtotal ?? 0) || 0,
    invoiceTaxAmount: Number.isFinite(totalTaxAmount) ? totalTaxAmount : 0,
    invoiceTaxName:
      scanResponse?.invoiceTaxName ??
      scanResponse?.invoice_tax_name ??
      primaryTax?.name ??
      primaryTax?.tax_name ??
      "",
    invoiceTaxRate:
      scanResponse?.invoiceTaxRate ??
      scanResponse?.invoice_tax_rate ??
      (Number(primaryTax?.taxRate ?? primaryTax?.tax_rate ?? 0) || 0),
    invoiceTotal: Number(scanResponse?.total ?? 0) || 0,
  };
};

const parseTaxRateFromScanLabel = (label = "") => {
  const text = String(label);
  const splitCgstSgstMatch = text.match(
    /CGST\s*@?\s*(\d+(?:\.\d+)?)\s*%\s*\+\s*SGST\s*@?\s*(\d+(?:\.\d+)?)\s*%/i,
  );
  if (splitCgstSgstMatch) {
    return (
      (Number(splitCgstSgstMatch[1]) || 0) +
      (Number(splitCgstSgstMatch[2]) || 0)
    );
  }

  const match = text.match(/(\d+(?:\.\d+)?)\s*%/);
  return match ? Number(match[1]) || 0 : 0;
};

const resolveInrTaxLabelFromStructuredTaxes = (taxesRaw = []) => {
  const normalizedTaxes = taxesRaw.map((entry) => ({
    name: String(entry?.name ?? entry?.tax_name ?? "").trim(),
    rate: Number(entry?.taxRate ?? entry?.tax_rate ?? 0) || 0,
    amount: Number(entry?.amount ?? 0) || 0,
  }));

  const igstEntries = normalizedTaxes.filter((entry) => /IGST/i.test(entry.name));
  const cgstEntries = normalizedTaxes.filter((entry) => /CGST/i.test(entry.name));
  const sgstEntries = normalizedTaxes.filter((entry) => /SGST/i.test(entry.name));

  const igstRate = igstEntries.reduce((sum, entry) => sum + entry.rate, 0);
  const cgstRate = cgstEntries.reduce((sum, entry) => sum + entry.rate, 0);
  const sgstRate = sgstEntries.reduce((sum, entry) => sum + entry.rate, 0);

  if (igstRate > 0 && cgstRate === 0 && sgstRate === 0) {
    return `IGST ${igstRate}%`;
  }

  if (cgstRate > 0 || sgstRate > 0) {
    return `CGST + SGST ${cgstRate + sgstRate}%`;
  }

  return "";
};

export const resolveInrInvoiceTaxLabelFromScan = (
  scanResponse = {},
  taxesRaw = [],
) => {
  const explicitLabel = scanResponse?.invoiceTax ?? scanResponse?.invoice_tax;
  const structuredTaxLabel = resolveInrTaxLabelFromStructuredTaxes(taxesRaw);
  const taxRate =
    Number(
      scanResponse?.invoiceTaxRate ??
        scanResponse?.invoice_tax_rate ??
        scanResponse?.taxRate ??
        scanResponse?.tax_rate ??
        taxesRaw?.[0]?.taxRate ??
        taxesRaw?.[0]?.tax_rate,
    ) || 0;
  const explicitTaxRate = parseTaxRateFromScanLabel(explicitLabel);
  const resolvedTaxRate = explicitTaxRate || taxRate;

  if (structuredTaxLabel) return structuredTaxLabel;

  if (explicitLabel) {
    const normalizedLabel = String(explicitLabel).trim();
    if (/^IGST\s+\d+(?:\.\d+)?%$/i.test(normalizedLabel) && resolvedTaxRate > 0) {
      return `IGST ${resolvedTaxRate}%`;
    }
    if (/^CGST\s*\+\s*SGST\s+\d+(?:\.\d+)?%$/i.test(normalizedLabel)) {
      return resolvedTaxRate > 0
        ? `CGST + SGST ${resolvedTaxRate}%`
        : normalizedLabel.replace(/\s*\+\s*/g, " + ");
    }
    if (/^CGST\s*@?\s*\d+(?:\.\d+)?%\s*\+\s*SGST\s*@?\s*\d+(?:\.\d+)?%$/i.test(normalizedLabel)) {
      return `CGST + SGST ${resolvedTaxRate}%`;
    }
    if (/igst|integrated tax/i.test(normalizedLabel) && resolvedTaxRate > 0) {
      return `IGST ${resolvedTaxRate}%`;
    }
    if (/cgst|sgst|central tax|state tax/i.test(normalizedLabel) && resolvedTaxRate > 0) {
      return `CGST + SGST ${resolvedTaxRate}%`;
    }
    return normalizedLabel;
  }

  if (resolvedTaxRate <= 0) return "";

  const taxNames = taxesRaw
    .map((entry) => String(entry?.name ?? entry?.tax_name ?? ""))
    .join(" ");

  if (/igst/i.test(taxNames) && !/cgst|sgst/i.test(taxNames)) {
    return `IGST ${resolvedTaxRate}%`;
  }

  return `CGST + SGST ${resolvedTaxRate}%`;
};

export const resolveScannedLineItemTax = (
  item,
  taxesRaw = [],
  currency = DEFAULT_CURRENCY,
  fallback = {},
) => {
  if (isInrInvoiceCurrency(currency)) {
    return { tax: resolveInrTaxLabel(item, taxesRaw) };
  }

  const fallbackLabel = fallback?.defaultTaxLabel ?? "";
  const fallbackRateCandidate =
    item?.taxRate ??
    item?.tax_rate ??
    fallback?.defaultTaxRate ??
    parseTaxRateFromLabel(item?.tax) ??
    parseTaxRateFromLabel(fallbackLabel) ??
    taxesRaw?.[0]?.taxRate ??
    taxesRaw?.[0]?.tax_rate;
  const parsedRate = Number(fallbackRateCandidate);
  const rate = Number.isFinite(parsedRate) ? parsedRate : 0;

  let taxName =
    item?.taxName ??
    item?.tax_name ??
    parseTaxNameFromLabel(item?.tax) ??
    fallback?.defaultTaxName ??
    parseTaxNameFromLabel(fallbackLabel) ??
    "";

  if (!taxName && taxesRaw.length) {
    const match =
      taxesRaw.find(
        (entry) => Number(entry?.taxRate ?? entry?.tax_rate ?? 0) === rate,
      ) || taxesRaw[0];
    taxName = match?.name ?? "";
  }

  if (!taxName) taxName = "Tax";

  return {
    taxName,
    taxRate: rate,
    tax: item?.tax || formatForeignTaxLabel(taxName, rate),
  };
};

export const mapExtractedLineItemToForm = (item = {}, { useInrTax = true } = {}) => {
  const quantity = Number(item.quantity || 1);
  const lineTotal = Number(item.lineTotal ?? item.amount ?? item.lineTotal ?? 0);
  const unitPrice = Number(item.unitPrice ?? item.unitRate ?? item.unitPrice ?? 0);
  const unitRate =
    quantity > 0 && lineTotal > 0 ? lineTotal / quantity : unitPrice;
  const resolvedLineTotal = lineTotal > 0 ? lineTotal : quantity * unitRate;

  return {
    description: item.description || "",
    ledger: item.ledger || "Cloud Services",
    tax: item.tax || (useInrTax ? DEFAULT_INR_TAX : ""),
    taxName: item.taxName || "",
    taxRate: item.taxRate ?? "",
    quantity,
    unitRate: unitRate,
    lineTotal: resolvedLineTotal,
    discount: item.discount || 0,
    discountType: item.discountType || "%",
    hsnSac: item.hsnSac || "",
    eligibleForItc: item.eligibleForItc ?? true,
  };
};

export const resolveLineItemSubtotal = (item = {}) => {
  const lineTotal = parseNumericInput(item.lineTotal ?? item.amount, 0);
  const base =
    lineTotal > 0
      ? lineTotal
      : parseNumericInput(item.quantity, 0) * parseNumericInput(item.unitRate, 0);

  if (item.discountType === "%") {
    return base - (base * parseNumericInput(item.discount, 0)) / 100;
  }
  return base - parseNumericInput(item.discount, 0);
};

export const syncLineItemLineTotal = (item = {}) => {
  const quantity = parseNumericInput(item.quantity, 0);
  const unitRate = parseNumericInput(item.unitRate, 0);
  return {
    ...item,
    lineTotal: quantity * unitRate,
  };
};

export const calculateInvoiceTotals = ({
  lineItems = [],
  currency = DEFAULT_CURRENCY,
  calculateLineItemSubtotal,
  taxRates = [],
  invoiceTaxAmount,
  invoiceTaxName = "Tax",
  invoiceTaxRate,
  invoiceTax,
  taxesLevel = LINE_ITEM_LEVEL,
  discountsLevel = LINE_ITEM_LEVEL,
  invoiceDiscount = 0,
  invoiceDiscountType = "%",
}) => {
  let subTotal = 0;
  let cgst = 0;
  let sgst = 0;
  let igst = 0;
  const foreignTaxMap = new Map();

  const invoiceLevelTaxEnabled = taxesLevel === INVOICE_LEVEL;

  lineItems.forEach((item) => {
    const itemSubtotal = calculateLineItemSubtotal
      ? calculateLineItemSubtotal(item)
      : resolveLineItemSubtotal(item);
    subTotal += itemSubtotal;

    if (isInrInvoiceCurrency(currency) && !invoiceLevelTaxEnabled) {
      const taxRate = taxRates.find((entry) => entry.value === item.tax);
      if (taxRate) {
        if (taxRate.cgst) cgst += (itemSubtotal * taxRate.cgst) / 100;
        if (taxRate.sgst) sgst += (itemSubtotal * taxRate.sgst) / 100;
        if (taxRate.igst) igst += (itemSubtotal * taxRate.igst) / 100;
      }
    }
  });

  const subTotalBeforeDiscount = subTotal;
  const discountValue = parseNumericInput(invoiceDiscount, 0);
  const invoiceLevelDiscountEnabled = discountsLevel === INVOICE_LEVEL;
  const invoiceDiscountAmount = invoiceLevelDiscountEnabled
    ? invoiceDiscountType === "%"
      ? (subTotal * discountValue) / 100
      : discountValue
    : 0;
  const boundedInvoiceDiscountAmount = Math.max(
    0,
    Math.min(invoiceDiscountAmount, subTotalBeforeDiscount),
  );
  const discountFactor =
    subTotalBeforeDiscount > 0
      ? (subTotalBeforeDiscount - boundedInvoiceDiscountAmount) / subTotalBeforeDiscount
      : 1;

  if (invoiceLevelDiscountEnabled) {
    subTotal -= boundedInvoiceDiscountAmount;
    cgst *= discountFactor;
    sgst *= discountFactor;
    igst *= discountFactor;
  }

  if (isInrInvoiceCurrency(currency) && invoiceLevelTaxEnabled) {
    const taxRate = taxRates.find((entry) => entry.value === invoiceTax);
    if (taxRate) {
      if (taxRate.cgst) cgst = (subTotal * taxRate.cgst) / 100;
      if (taxRate.sgst) sgst = (subTotal * taxRate.sgst) / 100;
      if (taxRate.igst) igst = (subTotal * taxRate.igst) / 100;
    }
  }

  let foreignTaxes = [];
  let foreignTax = 0;

  if (!isInrInvoiceCurrency(currency)) {
    const parsedInvoiceTaxAmount = Number(invoiceTaxAmount);
    if (invoiceLevelTaxEnabled) {
      const rate = Number(invoiceTaxRate) || 0;
      const name = invoiceTaxName || "Tax";
      foreignTax = rate > 0 ? (subTotal * rate) / 100 : 0;
      foreignTaxes =
        foreignTax > 0
          ? [{ name, rate, amount: foreignTax }]
          : [];
    } else if (Number.isFinite(parsedInvoiceTaxAmount) && parsedInvoiceTaxAmount > 0) {
      foreignTax = parsedInvoiceTaxAmount;
      foreignTaxes = [
        {
          name: invoiceTaxName || "Tax",
          rate: Number(invoiceTaxRate) || 0,
          amount: parsedInvoiceTaxAmount,
        },
      ];
    } else {
      lineItems.forEach((item) => {
        const itemSubtotal = calculateLineItemSubtotal
          ? calculateLineItemSubtotal(item)
          : resolveLineItemSubtotal(item);
        const rate = Number(item?.taxRate ?? parseTaxRateFromLabel(item?.tax)) || 0;
        if (rate <= 0) return;

        const taxName = String(
          item?.taxName || parseTaxNameFromLabel(item?.tax) || "Tax",
        ).trim();
        const taxAmount = (itemSubtotal * rate) / 100;
        const key = `${taxName}::${rate}`;
        const existing = foreignTaxMap.get(key) || { name: taxName, rate, amount: 0 };
        existing.amount += taxAmount;
        foreignTaxMap.set(key, existing);
      });

      foreignTaxes = Array.from(foreignTaxMap.values());
      foreignTax = foreignTaxes.reduce((sum, entry) => sum + entry.amount, 0);
    }
    if (invoiceLevelDiscountEnabled && !invoiceLevelTaxEnabled) {
      foreignTaxes = foreignTaxes.map((entry) => ({
        ...entry,
        amount: entry.amount * discountFactor,
      }));
      foreignTax *= discountFactor;
    }
  }

  const total = isInrInvoiceCurrency(currency)
    ? subTotal + cgst + sgst + igst
    : subTotal + foreignTax;

  return {
    subTotal,
    subTotalBeforeDiscount,
    cgst,
    sgst,
    igst,
    foreignTax,
    foreignTaxes,
    invoiceDiscountAmount: boundedInvoiceDiscountAmount,
    total,
    isInr: isInrInvoiceCurrency(currency),
  };
};

export const remapLineItemsForCurrencyChange = (lineItems, nextCurrency) => {
  const useInrTax = isInrInvoiceCurrency(nextCurrency);

  return lineItems.map((item) => {
    if (useInrTax) {
      const inrTax = item.tax && taxRatesIncludesValue(item.tax) ? item.tax : DEFAULT_INR_TAX;
      return applyInrLineItemTax(item, inrTax);
    }

    return applyForeignLineItemTax(
      item,
      item.taxName || parseTaxNameFromLabel(item.tax),
      item.taxRate ?? parseTaxRateFromLabel(item.tax),
    );
  });
};

const taxRatesIncludesValue = (value) =>
  typeof value === "string" &&
  [
    "CGST + SGST 5%",
    "CGST + SGST 12%",
    "CGST + SGST 18%",
    "CGST + SGST 28%",
    "IGST 5%",
    "IGST 12%",
    "IGST 18%",
    "IGST 28%",
    "Exempt",
  ].includes(value);
