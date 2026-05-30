import { format } from "date-fns";
import { DEFAULT_CURRENCY, normalizeCurrencyCode } from "../../../utils/currency";
import {
  createDefaultLineItem,
  isInrInvoiceCurrency,
  mapExtractedLineItemToForm,
} from "./invoiceTax";

export const resolveVendorGstin = (vendor = {}) =>
  String(vendor?.gstin ?? vendor?.gstIn ?? "").trim();

export const resolveInvoiceFormGstin = (invoice = {}, vendor = null) => {
  const fromInvoice = String(
    invoice?.gstin ?? invoice?.vendor_gstin ?? invoice?.vendorGstin ?? "",
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
      unit_price: item.unit_rate ?? item.unit_price ?? item.unitPrice,
      line_total: item.line_total ?? item.amount ?? item.lineTotal,
      amount: item.amount ?? item.line_total ?? item.lineTotal,
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
  const invoiceLineItems = Array.isArray(invoice.line_items) ? invoice.line_items : [];
  const invoiceVendorId = invoice.vendor_id ?? invoice.vendorId ?? "";
  const matchedVendorByName =
    !invoiceVendorId && invoice.vendor_name && typeof findVendorByName === "function"
      ? findVendorByName(invoice.vendor_name)
      : null;
  const matchedVendorById =
    invoiceVendorId && typeof findVendorById === "function"
      ? findVendorById(invoiceVendorId)
      : null;
  const vendor = matchedVendorById || matchedVendorByName;
  const vendorId = invoiceVendorId || vendor?.id || "";

  const sourceOfSupply =
    invoice.source_of_supply ||
    invoice.sourceOfSupply ||
    invoice.place_of_supply ||
    invoice.placeOfSupply ||
    "";
  const destinationOfSupply =
    invoice.destination_of_supply ||
    invoice.destinationOfSupply ||
    invoice.place_of_supply ||
    invoice.placeOfSupply ||
    "";
  const locationValue =
    invoice.location || invoice.place_of_supply || invoice.placeOfSupply || "";

  const invoiceDate = formatInvoiceDateInput(invoice.invoice_date ?? invoice.invoiceDate);
  const dueDate = formatInvoiceDateInput(invoice.due_date ?? invoice.dueDate);
  const gstAmount = Number(invoice.gst_amount ?? invoice.gstAmount);

  return {
    vendor_name: invoice.vendor_name || invoice.vendorName || "",
    vendor_id: vendorId,
    vendor_matched: Boolean(vendorId),
    vendor_request_submitted: false,
    vendor_request_pending: Boolean(vendor?.is_pending_approval),
    invoice_number: invoice.invoice_number || invoice.invoiceNumber || "",
    invoice_date: invoiceDate || format(new Date(), "yyyy-MM-dd"),
    due_date: dueDate || format(new Date(), "yyyy-MM-dd"),
    billing_address:
      invoice.billing_address ||
      invoice.billingAddress ||
      invoice.vendor_address ||
      invoice.vendorAddress ||
      "",
    gst_treatment: invoice.gst_treatment || invoice.gstTreatment || "Regular",
    gstin: resolveInvoiceFormGstin(invoice, vendor),
    source_of_supply: sourceOfSupply,
    destination_of_supply: destinationOfSupply,
    location: locationValue,
    reverse_charges: invoice.reverse_charges || invoice.reverseCharges || "Not Applicable",
    discounts_level: invoice.discounts_level || invoice.discountsLevel || "At Line Item Level",
    source: invoice.source || "Upload",
    source_email: invoice.source_email || invoice.sourceEmail || "",
    line_items:
      invoiceLineItems.length > 0
        ? invoiceLineItems.map((item) => mapInvoiceLineItemToForm(item, { useInrTax }))
        : [createDefaultLineItem(editCurrency)],
    description: invoice.memo || invoice.description || "",
    tds: invoice.tds || "",
    amount: invoice.amount ?? invoice.net_amount ?? invoice.netAmount ?? 0,
    currency: editCurrency,
    department_id: invoice.department_id || invoice.departmentId || "",
    department_name: invoice.department_name || invoice.departmentName || "",
    ...(!useInrTax && Number.isFinite(gstAmount) && gstAmount > 0
      ? {
          scanned_tax_amount: gstAmount,
          scanned_tax_name: "Tax",
          scanned_tax_rate: "",
        }
      : {}),
    ...(isCategoryFeatureEnabled
      ? {
          category: invoice.category || null,
          category_id:
            invoice.category_id || invoice.categoryId || invoice.category?.id || "",
          category_name:
            invoice.category_name || invoice.categoryName || invoice.category?.name || "",
        }
      : {}),
  };
};
