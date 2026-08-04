import { format } from "date-fns";
import { normalizeDueDateForInvoice, normalizeMsmePaymentDue, resolveVendorIsMsme } from "./msmePaymentDue";
import { DOCUMENT_TYPE } from "../constants/proformaInvoice";
import { normalizeInvoiceSource } from "../constants";
import { resolveInvoiceMatchingFormState } from "./invoiceMatchingFlow";
import { normalizeInvoiceOverdueFields } from "./invoiceDueDate";
import { DEFAULT_CURRENCY, normalizeCurrencyCode } from "../../../utils/currency";
import {
  createDefaultLineItem,
  DEFAULT_INR_TAX,
  isInrInvoiceCurrency,
  LINE_ITEM_MODE_DETAILED,
  LINE_ITEM_MODE_SUMMARY_ONLY,
  LINE_ITEM_LEVEL,
  mapExtractedLineItemToForm,
} from "./invoiceTax";
import { buildTdsValue } from "./tds";
import { resolveLineItemsExpanded } from "./lineItemsSummary";

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

export const mapInvoiceLineItemToForm = (
  item = {},
  { useInrTax = true, currency = DEFAULT_CURRENCY } = {},
) =>
  mapExtractedLineItemToForm(
    {
      ...item,
      unitPrice: item.unitRate ?? item.unitPrice ?? item.unitPrice,
      lineTotal: item.lineTotal ?? item.amount ?? item.lineTotal,
      amount: item.amount ?? item.lineTotal ?? item.lineTotal,
    },
    { useInrTax, currency },
  );

export const buildInvoiceEditFormData = (
  invoice = {},
  {
    isCategoryFeatureEnabled = false,
    isCampaignFeatureEnabled = false,
    findVendorByName,
    findVendorById,
  } = {},
) => {
  const editCurrency = normalizeCurrencyCode(invoice.currency) || DEFAULT_CURRENCY;
  const useInrTax = isInrInvoiceCurrency(editCurrency);
  const defaultGstTreatment = useInrTax ? "Regular" : "N/A";
  const invoiceLineItems = Array.isArray(invoice.lineItems) ? invoice.lineItems : [];
  const lineItemMode =
    invoice.lineItemMode ??
    invoice.line_item_mode ??
    LINE_ITEM_MODE_DETAILED;
  const lineItemsRemoved =
    invoice.lineItemsRemoved === true ||
    invoice.line_items_removed === true;
  const isSummaryOnly = lineItemMode === LINE_ITEM_MODE_SUMMARY_ONLY;
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
  const dueDate = normalizeDueDateForInvoice({
    invoiceDate,
    dueDate: formatInvoiceDateInput(invoice.dueDate ?? invoice.dueDate),
    vendorIsMsme: resolveVendorIsMsme(invoice, vendor),
  });
  const gstAmount = Number(
    invoice.gstAmount ??
      invoice.gst_amount ??
      invoice.taxAmount ??
      invoice.tax_amount ??
      invoice.totalTaxAmount ??
      invoice.total_tax_amount,
  );
  const tdsSectionId = invoice.tdsSectionId ?? invoice.tds_section_id ?? null;
  const tdsSectionCode = invoice.tdsSectionCode ?? invoice.tds_section_code ?? null;
  const tdsRate = invoice.tdsRate ?? invoice.tds_rate ?? null;

  return {
    vendorName: invoice.vendorName || invoice.vendorName || "",
    vendorId: vendorId,
    vendorMatched: Boolean(vendorId),
    vendorRequestSubmitted: false,
    vendorRequestPending: Boolean(vendor?.isPendingApproval),
    invoiceNumber: invoice.invoiceNumber || invoice.invoiceNumber || "",
    invoiceDate: invoiceDate || format(new Date(), "yyyy-MM-dd"),
    dueDate: dueDate || "",
    isFunded: Boolean(invoice.isFunded ?? invoice.is_funded ?? false),
    orgAmount:
      invoice.orgAmount ??
      invoice.org_amount ??
      "",
    financierAmount:
      invoice.financierAmount ??
      invoice.financier_amount ??
      "",
    billingAddress:
      invoice.billingAddress ||
      invoice.billing_address ||
      invoice.vendorAddress ||
      invoice.vendor_address ||
      "",
    shippingAddress:
      invoice.shippingAddress ||
      invoice.shipping_address ||
      "",
    shippingSameAsBilling: Boolean(
      (invoice.shippingAddress || invoice.shipping_address) &&
        (invoice.billingAddress || invoice.billing_address) &&
        String(invoice.shippingAddress || invoice.shipping_address).trim() ===
          String(invoice.billingAddress || invoice.billing_address).trim(),
    ),
    billingGstin:
      invoice.billingGstin ||
      invoice.billing_gstin ||
      "",
    branchName:
      invoice.branchName ||
      invoice.branch_name ||
      "",
    branchCode:
      invoice.branchCode ||
      invoice.branch_code ||
      "",
    vendorBranchName:
      invoice.vendorBranchName ||
      invoice.vendor_branch_name ||
      "",
    vendorBranchCode:
      invoice.vendorBranchCode ||
      invoice.vendor_branch_code ||
      "",
    vendorBranchGstin:
      invoice.vendorBranchGstin ||
      invoice.vendor_branch_gstin ||
      "",
    gstTreatment: invoice.gstTreatment || invoice.gstTreatment || defaultGstTreatment,
    gstin: resolveInvoiceFormGstin(invoice, vendor),
    sourceOfSupply: sourceOfSupply,
    destinationOfSupply: destinationOfSupply,
    location: locationValue,
    reverseCharges: invoice.reverseCharges || invoice.reverseCharges || "Not Applicable",
    discountsLevel:
      invoice.discountsLevel ||
      invoice.discounts_level ||
      invoice.discountLevel ||
      invoice.discount_level ||
      LINE_ITEM_LEVEL,
    invoiceDiscount:
      invoice.invoiceDiscount ??
      invoice.invoiceDiscount ??
      0,
    invoiceDiscountType:
      invoice.invoiceDiscountType ??
      invoice.invoiceDiscountType ??
      "%",
    taxesLevel:
      invoice.taxesLevel ||
      invoice.taxes_level ||
      invoice.taxLevel ||
      invoice.tax_level ||
      LINE_ITEM_LEVEL,
    invoiceTax:
      invoice.invoiceTax ||
      invoice.invoice_tax ||
      invoice.taxLabel ||
      invoice.tax_label ||
      DEFAULT_INR_TAX,
    invoiceTaxName: invoice.invoiceTaxName || invoice.invoice_tax_name || "Tax",
    invoiceTaxRate:
      invoice.invoiceTaxRate ??
      invoice.invoice_tax_rate ??
      invoice.gstRate ??
      invoice.gst_rate ??
      "",
    source: normalizeInvoiceSource(invoice.source),
    sourceEmail: invoice.sourceEmail || invoice.source_email || "",
    voucherType:
      invoice.voucherType ||
      invoice.voucher_type ||
      invoice.accountingVoucherType ||
      invoice.accounting_voucher_type ||
      "",
    lineItemsExpanded: resolveLineItemsExpanded(invoice),
    lineItemMode,
    lineItemsRemoved,
    removedLineItemsCount:
      invoice.removedLineItemsCount ??
      invoice.removed_line_items_count ??
      invoice.previousLineItemCount ??
      invoice.previous_line_item_count ??
      0,
    subTotal:
      invoice.subTotal ??
      invoice.sub_total ??
      invoice.subtotal ??
      invoice.taxableAmount ??
      invoice.taxable_amount ??
      0,
    totalTaxAmount:
      invoice.totalTaxAmount ??
      invoice.total_tax_amount ??
      invoice.gstAmount ??
      invoice.gst_amount ??
      invoice.taxAmount ??
      invoice.tax_amount ??
      0,
    lineItems:
      isSummaryOnly
        ? []
        : invoiceLineItems.length > 0
        ? invoiceLineItems.map((item) =>
            mapInvoiceLineItemToForm(item, {
              useInrTax,
              currency: editCurrency,
            }),
          )
        : [createDefaultLineItem(editCurrency)],
    description: invoice.memo || invoice.description || "",
    tdsNarration:
      invoice.tdsNarration ||
      invoice.tds_narration ||
      invoice.narration ||
      "",
    tds:
      invoice.tds ||
      buildTdsValue({
        tdsSectionId,
        tdsSectionCode,
        tdsRate,
      }),
    tdsAmount: invoice.tdsAmount ?? invoice.tds_amount ?? null,
    tdsSectionId,
    tdsSectionCode,
    tdsRate,
    amount:
      invoice.totalAmount ??
      invoice.total_amount ??
      invoice.netAmount ??
      invoice.net_amount ??
      0,
    netAmount:
      invoice.netAmount ??
      invoice.net_amount ??
      invoice.netPayable ??
      invoice.net_payable ??
      "",
    currency: editCurrency,
    roundOff:
      invoice.roundOff ??
      invoice.round_off ??
      invoice.roundoff ??
      undefined,
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
    ...(isCampaignFeatureEnabled
      ? {
          campaignId: invoice.campaignId || invoice.campaign_id || "",
          campaignName: invoice.campaignName || invoice.campaign_name || "",
          referenceNumber:
            invoice.referenceNumber ||
            invoice.reference_number ||
            invoice.referenceCode ||
            invoice.reference_code ||
            "",
        }
      : {
          campaignId: "",
          campaignName: "",
          referenceNumber: "",
        }),
    ...normalizeMsmePaymentDue(invoice),
    ...normalizeInvoiceOverdueFields(invoice),
    ...resolveInvoiceMatchingFormState(invoice),
    documentType: invoice.documentType ?? invoice.document_type ?? DOCUMENT_TYPE.TAX_INVOICE,
    linkedProformaInvoiceId:
      invoice.linkedProformaInvoiceId ?? invoice.linked_proforma_invoice_id ?? "",
    linkedProformaInvoiceNumber:
      invoice.linkedProformaInvoiceNumber ?? invoice.linked_proforma_invoice_number ?? "",
  };
};
