import { DEFAULT_CURRENCY, normalizeCurrencyCode } from "../../../utils/currency";
import { parseNumericInput } from "./numericInput";

export const DEFAULT_INR_TAX = "CGST + SGST 18%";

export const isInrInvoiceCurrency = (currency) =>
  normalizeCurrencyCode(currency) === DEFAULT_CURRENCY;

export const formatForeignTaxLabel = (taxName, taxRate) => {
  const name = String(taxName || "Tax").trim() || "Tax";
  const rate = Number(taxRate);
  if (!Number.isFinite(rate) || rate <= 0) return "Exempt";
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
    tax_name: normalizedName,
    tax_rate: normalizedRate,
    tax: formatForeignTaxLabel(normalizedName, normalizedRate),
  };
};

export const applyInrLineItemTax = (item, tax = DEFAULT_INR_TAX) => ({
  ...item,
  tax,
  tax_name: "",
  tax_rate: "",
});

export const createDefaultLineItem = (currency = DEFAULT_CURRENCY) => {
  const base = {
    description: "",
    ledger: "Cloud Services",
    quantity: 1,
    unit_rate: 0,
    discount: 0,
    discount_type: "%",
    hsn_sac: "",
    eligible_for_itc: true,
  };

  if (isInrInvoiceCurrency(currency)) {
    return { ...base, tax: DEFAULT_INR_TAX, line_total: 0 };
  }

  return { ...base, tax_name: "", tax_rate: "", tax: "", line_total: 0 };
};

export const resolveInrTaxLabel = (item, taxesRaw = []) => {
  if (item?.tax) return item.tax;

  const rate = Number(item?.taxRate ?? item?.tax_rate ?? 0);
  const hasLineRate = rate > 0;
  const totalTaxAmount = taxesRaw.reduce(
    (sum, entry) => sum + (Number(entry?.amount ?? 0) || 0),
    0,
  );

  if (!hasLineRate && totalTaxAmount <= 0) return "Exempt";

  const igstAmount = taxesRaw
    .filter((entry) => /IGST/i.test(String(entry?.name ?? "")))
    .reduce((sum, entry) => sum + (Number(entry?.amount ?? 0) || 0), 0);
  const cgstSgstAmount = taxesRaw
    .filter((entry) => /CGST|SGST/i.test(String(entry?.name ?? "")))
    .reduce((sum, entry) => sum + (Number(entry?.amount ?? 0) || 0), 0);

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
    Number(item?.unit_price ?? item?.unitPrice ?? item?.price ?? 0) || 0;
  const lineTotal = Number(
    item?.lineTotal ?? item?.line_total ?? item?.amount ?? 0,
  );
  const amount = lineTotal > 0 ? lineTotal : quantity * listUnitPrice;
  const effectiveUnitPrice = quantity > 0 ? amount / quantity : listUnitPrice;

  return {
    quantity,
    unit_price: effectiveUnitPrice,
    amount,
    line_total: amount,
    list_unit_price: listUnitPrice,
    list_amount: quantity * listUnitPrice,
  };
};

export const resolveScannedInvoiceTaxSummary = (scanResponse = {}, taxesRaw = []) => {
  const totalTaxAmount = Number(
    scanResponse?.totalTaxAmount ??
      scanResponse?.total_tax_amount ??
      taxesRaw.reduce((sum, entry) => sum + (Number(entry?.amount ?? 0) || 0), 0),
  );

  const primaryTax = taxesRaw[0] ?? {};
  return {
    invoice_subtotal: Number(scanResponse?.subtotal ?? 0) || 0,
    invoice_tax_amount: Number.isFinite(totalTaxAmount) ? totalTaxAmount : 0,
    invoice_tax_name: primaryTax?.name ?? "",
    invoice_tax_rate: Number(primaryTax?.taxRate ?? primaryTax?.tax_rate ?? 0) || 0,
    invoice_total: Number(scanResponse?.total ?? 0) || 0,
  };
};

export const resolveScannedLineItemTax = (item, taxesRaw = [], currency = DEFAULT_CURRENCY) => {
  if (isInrInvoiceCurrency(currency)) {
    return { tax: resolveInrTaxLabel(item, taxesRaw) };
  }

  const rate = Number(item?.taxRate ?? item?.tax_rate ?? 0) || 0;
  if (rate <= 0) {
    return {
      tax_name: "",
      tax_rate: 0,
      tax: "Exempt",
    };
  }

  let taxName = item?.taxName ?? item?.tax_name ?? "";

  if (!taxName && taxesRaw.length) {
    const match =
      taxesRaw.find(
        (entry) => Number(entry?.taxRate ?? entry?.tax_rate ?? 0) === rate,
      ) || taxesRaw[0];
    taxName = match?.name ?? "";
  }

  if (!taxName) taxName = "Tax";

  return {
    tax_name: taxName,
    tax_rate: rate,
    tax: formatForeignTaxLabel(taxName, rate),
  };
};

export const mapExtractedLineItemToForm = (item = {}, { useInrTax = true } = {}) => {
  const quantity = Number(item.quantity || 1);
  const lineTotal = Number(item.line_total ?? item.amount ?? item.lineTotal ?? 0);
  const unitPrice = Number(item.unit_price ?? item.unit_rate ?? item.unitPrice ?? 0);
  const unitRate =
    quantity > 0 && lineTotal > 0 ? lineTotal / quantity : unitPrice;
  const resolvedLineTotal = lineTotal > 0 ? lineTotal : quantity * unitRate;

  return {
    description: item.description || "",
    ledger: item.ledger || "Cloud Services",
    tax: item.tax || (useInrTax ? DEFAULT_INR_TAX : ""),
    tax_name: item.tax_name || "",
    tax_rate: item.tax_rate ?? "",
    quantity,
    unit_rate: unitRate,
    line_total: resolvedLineTotal,
    discount: item.discount || 0,
    discount_type: item.discount_type || "%",
    hsn_sac: item.hsn_sac || "",
    eligible_for_itc: item.eligible_for_itc ?? true,
  };
};

export const resolveLineItemSubtotal = (item = {}) => {
  const lineTotal = parseNumericInput(item.line_total ?? item.amount, 0);
  const base =
    lineTotal > 0
      ? lineTotal
      : parseNumericInput(item.quantity, 0) * parseNumericInput(item.unit_rate, 0);

  if (item.discount_type === "%") {
    return base - (base * parseNumericInput(item.discount, 0)) / 100;
  }
  return base - parseNumericInput(item.discount, 0);
};

export const syncLineItemLineTotal = (item = {}) => {
  const quantity = parseNumericInput(item.quantity, 0);
  const unitRate = parseNumericInput(item.unit_rate, 0);
  return {
    ...item,
    line_total: quantity * unitRate,
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
  discountsLevel = "At Line Item Level",
  invoiceDiscount = 0,
  invoiceDiscountType = "%",
}) => {
  let subTotal = 0;
  let cgst = 0;
  let sgst = 0;
  let igst = 0;
  const foreignTaxMap = new Map();

  lineItems.forEach((item) => {
    const itemSubtotal = calculateLineItemSubtotal
      ? calculateLineItemSubtotal(item)
      : resolveLineItemSubtotal(item);
    subTotal += itemSubtotal;

    if (isInrInvoiceCurrency(currency)) {
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
  const invoiceLevelDiscountEnabled = discountsLevel === "At Invoice Level";
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

  let foreignTaxes = [];
  let foreignTax = 0;

  if (!isInrInvoiceCurrency(currency)) {
    const parsedInvoiceTaxAmount = Number(invoiceTaxAmount);
    if (Number.isFinite(parsedInvoiceTaxAmount) && parsedInvoiceTaxAmount > 0) {
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
        const rate = Number(item?.tax_rate ?? parseTaxRateFromLabel(item?.tax)) || 0;
        if (rate <= 0) return;

        const taxName = String(
          item?.tax_name || parseTaxNameFromLabel(item?.tax) || "Tax",
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

    if (invoiceLevelDiscountEnabled) {
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
      item.tax_name || parseTaxNameFromLabel(item.tax),
      item.tax_rate ?? parseTaxRateFromLabel(item.tax),
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
