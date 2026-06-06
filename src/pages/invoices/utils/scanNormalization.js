import { format } from "date-fns";
import { DEFAULT_CURRENCY, normalizeCurrencyCode } from "../../../utils/currency";
import {
  DEFAULT_INR_TAX,
  LINE_ITEM_LEVEL,
  resolveInrInvoiceTaxLabelFromScan,
  resolveScannedInvoiceTaxSummary,
  resolveScannedLineItemPricing,
  resolveScannedLineItemTax,
} from "./invoiceTax";

const toDateOnly = (value) => {
  if (!value) return "";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "" : format(d, "yyyy-MM-dd");
};

export const normalizeScannedInvoice = (scanResponse = {}) => {
  const lineItemsRaw = Array.isArray(scanResponse?.lineItems)
    ? scanResponse.lineItems
    : Array.isArray(scanResponse?.line_items)
      ? scanResponse.line_items
      : Array.isArray(scanResponse?.items)
        ? scanResponse.items
        : [];
  const taxesRaw = Array.isArray(scanResponse?.taxes) ? scanResponse.taxes : [];
  const invoiceCurrency = normalizeCurrencyCode(scanResponse?.currency) || DEFAULT_CURRENCY;
  const taxSummary = resolveScannedInvoiceTaxSummary(scanResponse, taxesRaw);
  const scannedForeignTaxDefaults = {
    defaultTaxLabel: scanResponse?.invoiceTax ?? scanResponse?.invoice_tax ?? "",
    defaultTaxName:
      scanResponse?.invoiceTaxName ??
      scanResponse?.invoice_tax_name ??
      taxSummary.invoiceTaxName ??
      "",
    defaultTaxRate:
      scanResponse?.invoiceTaxRate ??
      scanResponse?.invoice_tax_rate ??
      taxSummary.invoiceTaxRate ??
      0,
  };

  const lineItems = lineItemsRaw.map((item) => {
    const pricing = resolveScannedLineItemPricing(item);
    const taxFields = resolveScannedLineItemTax(
      item,
      taxesRaw,
      invoiceCurrency,
      scannedForeignTaxDefaults,
    );

    return {
      description: item?.description ?? item?.name ?? "",
      quantity: pricing.quantity,
      unitPrice: pricing.unitPrice,
      amount: pricing.amount,
      lineTotal: pricing.lineTotal,
      hsnSac: item?.hsnSac ?? item?.hsnSac ?? "",
      ...taxFields,
    };
  });

  const computedAmount = lineItems.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);

  const vendorAddress =
    scanResponse?.vendorAddress ??
    scanResponse?.vendorAddress ??
    scanResponse?.address ??
    "";

  const vendorGstin =
    scanResponse?.vendorGstin ??
    scanResponse?.vendorGstin ??
    scanResponse?.gstin ??
    "";
  const placeOfSupply =
    scanResponse?.placeOfSupply ??
    scanResponse?.placeOfSupply ??
    scanResponse?.sourceOfSupply ??
    scanResponse?.sourceOfSupply ??
    "";

  return {
    vendorName: scanResponse?.vendorName ?? scanResponse?.vendorName ?? scanResponse?.merchant ?? "",
    vendorGstin: vendorGstin,
    billingGstin: scanResponse?.billingGstin ?? scanResponse?.billingGstin ?? "",
    gstin: vendorGstin,
    vendorAddress: vendorAddress,
    billingAddress:
      scanResponse?.billingAddress ??
      scanResponse?.billingAddress ??
      vendorAddress,
    shippingAddress:
      scanResponse?.shippingAddress ??
      scanResponse?.shippingAddress ??
      "",
    gstTreatment: scanResponse?.gstTreatment ?? scanResponse?.gstTreatment ?? "",
    sourceOfSupply:
      scanResponse?.sourceOfSupply ??
      scanResponse?.sourceOfSupply ??
      placeOfSupply,
    destinationOfSupply:
      scanResponse?.destinationOfSupply ??
      scanResponse?.destinationOfSupply ??
      placeOfSupply,
    placeOfSupply: placeOfSupply,
    discountsLevel:
      scanResponse?.discountsLevel ??
      scanResponse?.discountsLevel ??
      LINE_ITEM_LEVEL,
    invoiceDiscount:
      Number(scanResponse?.invoiceDiscount ?? scanResponse?.invoiceDiscount ?? 0) || 0,
    invoiceDiscountType:
      scanResponse?.invoiceDiscountType ??
      scanResponse?.invoiceDiscountType ??
      "%",
    taxesLevel:
      scanResponse?.taxesLevel ??
      scanResponse?.taxes_level ??
      scanResponse?.tax_level ??
      scanResponse?.taxLevel ??
      LINE_ITEM_LEVEL,
    invoiceTax:
      resolveInrInvoiceTaxLabelFromScan(scanResponse, taxesRaw) || DEFAULT_INR_TAX,
    invoiceTaxName:
      scanResponse?.invoiceTaxName ??
      scanResponse?.invoice_tax_name ??
      taxSummary.invoiceTaxName ??
      "Tax",
    invoiceTaxRate:
      scanResponse?.invoiceTaxRate ??
      scanResponse?.invoice_tax_rate ??
      taxSummary.invoiceTaxRate ??
      "",
    source: scanResponse?.source ?? "Upload",
    invoiceNumber: scanResponse?.invoiceNumber ?? scanResponse?.invoiceNumber ?? "",
    invoiceDate:
      toDateOnly(scanResponse?.invoiceDate ?? scanResponse?.invoiceDate ?? scanResponse?.datetime) ||
      format(new Date(), "yyyy-MM-dd"),
    dueDate:
      toDateOnly(scanResponse?.dueDate ?? scanResponse?.due_date),
    lineItems: lineItems,
    amount: Number(scanResponse?.total ?? scanResponse?.amount ?? computedAmount) || 0,
    currency: normalizeCurrencyCode(scanResponse?.currency) || DEFAULT_CURRENCY,
    ...taxSummary,
    fileId: scanResponse?.fileId ?? scanResponse?.fileId ?? null,
    fileHash: scanResponse?.fileHash ?? scanResponse?.fileHash ?? null,
    originalFileName: scanResponse?.originalFileName ?? scanResponse?.originalFileName ?? null,
  };
};
