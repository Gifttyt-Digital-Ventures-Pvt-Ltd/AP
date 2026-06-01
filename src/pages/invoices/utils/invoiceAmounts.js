import {
  DEFAULT_CURRENCY,
  formatCurrency,
  normalizeCurrencyCode,
} from "../../../utils/currency";

const toNumber = (value) => {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : 0;
};

export const getInvoiceCurrency = (invoice) =>
  normalizeCurrencyCode(invoice?.currency ?? invoice?.currencyCode ?? DEFAULT_CURRENCY);

export const formatInvoiceAmount = (invoice, amount) =>
  formatCurrency(amount, getInvoiceCurrency(invoice));

export const sumInvoiceAmountsByCurrency = (
  invoices = [],
  getAmount = (invoice) => invoice?.amount ?? 0,
) => {
  const totals = new Map();

  invoices.forEach((invoice) => {
    const currency = getInvoiceCurrency(invoice);
    const amount = Number(getAmount(invoice)) || 0;
    totals.set(currency, (totals.get(currency) || 0) + amount);
  });

  return Array.from(totals.entries())
    .map(([currency, total]) => ({ currency, total }))
    .sort((left, right) => left.currency.localeCompare(right.currency));
};

export const getInvoiceGrossAmount = (invoice) => {
  const explicitGross = toNumber(
    invoice?.gross_amount ??
      invoice?.grossAmount ??
      invoice?.subtotal ??
      invoice?.subTotal ??
      invoice?.taxable_amount ??
      invoice?.taxableAmount,
  );

  if (explicitGross > 0) return explicitGross;

  const totalAmount = toNumber(invoice?.amount);
  const taxAmount = getInvoiceTaxAmount(invoice);
  if (totalAmount > 0 && taxAmount > 0) {
    return Math.max(totalAmount - taxAmount, 0);
  }

  return totalAmount;
};

export const getInvoiceTaxAmount = (invoice) =>
  toNumber(
    invoice?.gst_amount ??
      invoice?.gstAmount ??
      invoice?.tax_amount ??
      invoice?.taxAmount ??
      toNumber(invoice?.cgst_amount ?? invoice?.cgstAmount) +
        toNumber(invoice?.sgst_amount ?? invoice?.sgstAmount) +
        toNumber(invoice?.igst_amount ?? invoice?.igstAmount),
  );

export const getInvoiceTdsAmount = (invoice) =>
  toNumber(invoice?.tds_amount ?? invoice?.tdsAmount ?? invoice?.tds);

export const getInvoiceNetAmount = (invoice) => {
  const explicitNetAmount =
    invoice?.net_amount ?? invoice?.netAmount ?? invoice?.net_payable ?? invoice?.netPayable;

  if (explicitNetAmount !== undefined && explicitNetAmount !== null && explicitNetAmount !== "") {
    return toNumber(explicitNetAmount);
  }

  const totalAmount = toNumber(invoice?.amount);
  const tdsAmount = getInvoiceTdsAmount(invoice);
  if (totalAmount > 0) {
    return Math.max(totalAmount - tdsAmount, 0);
  }

  const grossAmount = getInvoiceGrossAmount(invoice);
  const taxAmount = getInvoiceTaxAmount(invoice);
  return Math.max(grossAmount + taxAmount - tdsAmount, 0);
};
