import { format } from "date-fns";
import { DEFAULT_CURRENCY, normalizeCurrencyCode } from "../../../utils/currency";
import {
  createDefaultLineItem,
  DEFAULT_INR_TAX,
  isInrInvoiceCurrency,
  LINE_ITEM_LEVEL,
  mapExtractedLineItemToForm,
} from "./invoiceTax";

export const resolveVendorGstin = (vendor = {}) =>
  String(vendor?.gstin ?? vendor?.gstIn ?? "").trim();

export const resolveInvoiceFormGstin = (invoice = {}, vendor = null) => {
  const fromInvoice = String(
    invoice?.gstin ?? invoice?.vendorGstin ?? invoice?.vendorGstin ?? "",
  ).trim();
  if (fromInvoice) return fromInvoice;
  return resolveVendorGstin(vendor);
};

export const formatInvoiceDateInput = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return format(date, "yyyy-MM-dd");
};

export const mapInvoiceLineItemToForm = (item = {}, { useInrTax = true } = {}) =>
  mapExtractedLineItemToForm(
    {
      ...item,
      unitPrice: item.unitRate ?? item.unitPrice ?? item.unitPrice,
      lineTotal: item.lineTotal ?? item.amount ?? item.lineTotal,
      amount: item.amount ?? item.lineTotal ?? item.lineTotal,
    },
    { useInrTax },
  );

export const buildInvoiceEditFormData = (
  invoice = {},
  {
    isCategoryFeatureEnabled = false,
    findVendorByName,
    findVendorById,
  } = {},
) => {
  const editCurrency = normalizeCurrencyCode(invoice.currency) || DEFAULT_CURRENCY;
  const useInrTax = isInrInvoiceCurrency(editCurrency);
  const defaultGstTreatment = useInrTax ? "Regular" : "N/A";
  const invoiceLineItems = Array.isArray(invoice.lineItems) ? invoice.lineItems : [];
  const invoiceVendorId = invoice.vendorId ?? invoice.vendorId ?? "";
  const matchedVendorByName =
    !invoiceVendorId && invoice.vendorName && typeof findVendorByName === "function"
      ? findVendorByName(invoice.vendorName)
      : null;
  const matchedVendorById =
    invoiceVendorId && typeof findVendorById === "function"
      ? findVendorById(invoiceVendorId)
      : null;
  const vendor = matchedVendorById || matchedVendorByName;
  const vendorId = invoiceVendorId || vendor?.id || "";

  const sourceOfSupply =
    invoice.sourceOfSupply ||
    invoice.sourceOfSupply ||
    invoice.placeOfSupply ||
    invoice.placeOfSupply ||
    "";
  const destinationOfSupply =
    invoice.destinationOfSupply ||
    invoice.destinationOfSupply ||
    invoice.placeOfSupply ||
    invoice.placeOfSupply ||
    "";
  const locationValue =
    invoice.location || invoice.placeOfSupply || invoice.placeOfSupply || "";

  const invoiceDate = formatInvoiceDateInput(invoice.invoiceDate ?? invoice.invoiceDate);
  const dueDate = formatInvoiceDateInput(invoice.dueDate ?? invoice.dueDate);
  const gstAmount = Number(invoice.gstAmount ?? invoice.gstAmount);

  return {
    vendorName: invoice.vendorName || invoice.vendorName || "",
    vendorId: vendorId,
    vendorMatched: Boolean(vendorId),
    vendorRequestSubmitted: false,
    vendorRequestPending: Boolean(vendor?.isPendingApproval),
    invoiceNumber: invoice.invoiceNumber || invoice.invoiceNumber || "",
    invoiceDate: invoiceDate || format(new Date(), "yyyy-MM-dd"),
    dueDate: dueDate || format(new Date(), "yyyy-MM-dd"),
    billingAddress:
      invoice.billingAddress ||
      invoice.billingAddress ||
      invoice.vendorAddress ||
      invoice.vendorAddress ||
      "",
    gstTreatment: invoice.gstTreatment || invoice.gstTreatment || defaultGstTreatment,
    gstin: resolveInvoiceFormGstin(invoice, vendor),
    sourceOfSupply: sourceOfSupply,
    destinationOfSupply: destinationOfSupply,
    location: locationValue,
    reverseCharges: invoice.reverseCharges || invoice.reverseCharges || "Not Applicable",
    discountsLevel: invoice.discountsLevel || invoice.discountsLevel || LINE_ITEM_LEVEL,
    invoiceDiscount:
      invoice.invoiceDiscount ??
      invoice.invoiceDiscount ??
      0,
    invoiceDiscountType:
      invoice.invoiceDiscountType ??
      invoice.invoiceDiscountType ??
      "%",
    taxesLevel: invoice.taxesLevel || invoice.taxesLevel || LINE_ITEM_LEVEL,
    invoiceTax: invoice.invoiceTax || invoice.invoiceTax || DEFAULT_INR_TAX,
    invoiceTaxName: invoice.invoiceTaxName || invoice.invoiceTaxName || "Tax",
    invoiceTaxRate:
      invoice.invoiceTaxRate ??
      invoice.invoiceTaxRate ??
      "",
    source: invoice.source || "Upload",
    sourceEmail: invoice.sourceEmail || invoice.sourceEmail || "",
    lineItems:
      invoiceLineItems.length > 0
        ? invoiceLineItems.map((item) => mapInvoiceLineItemToForm(item, { useInrTax }))
        : [createDefaultLineItem(editCurrency)],
    description: invoice.memo || invoice.description || "",
    tds: invoice.tds || "",
    amount: invoice.amount ?? invoice.netAmount ?? 0,
    currency: editCurrency,
    departmentId: invoice.departmentId || invoice.departmentId || "",
    departmentName: invoice.departmentName || invoice.departmentName || "",
    ...(!useInrTax && Number.isFinite(gstAmount) && gstAmount > 0
      ? {
          scannedTaxAmount: gstAmount,
          scannedTaxName: "Tax",
          scannedTaxRate: "",
        }
      : {}),
    ...(isCategoryFeatureEnabled
      ? {
          category: invoice.category || null,
          categoryId:
            invoice.categoryId || invoice.categoryId || invoice.category?.id || "",
          categoryName:
            invoice.categoryName || invoice.categoryName || invoice.category?.name || "",
        }
      : {}),
  };
};
