import { format } from "date-fns";
import { buildInvoiceApiPayload } from "../../../Services/utils/payloadMappers";
import { DEFAULT_CURRENCY, normalizeCurrencyCode } from "../../../utils/currency";
import { TAX_RATES } from "../constants";
import {
  calculateInvoiceTotals,
  createDefaultLineItem,
  DEFAULT_INR_TAX,
  INVOICE_LEVEL,
  isInrInvoiceCurrency,
  LINE_ITEM_LEVEL,
  mapExtractedLineItemToForm,
  resolveLineItemSubtotal,
} from "./invoiceTax";
import { parseNumericInput } from "./numericInput";
import { resolveTdsRate } from "./tds";

export const computeTdsAmount = (
  lineItems = [],
  tdsValue = "",
  calculateLineItemSubtotal,
  tdsRateOverride = null,
) => {
  const tdsRate = resolveTdsRate(tdsValue, tdsRateOverride);
  if (!tdsRate) return null;
  const subTotal = (lineItems || []).reduce(
    (sum, item) => sum + calculateLineItemSubtotal(item),
    0,
  );
  return Math.round(((subTotal * tdsRate) / 100) * 100) / 100;
};

export const stripLineTaxForInvoiceLevel = (line = {}) => {
  const { tax, taxName, taxRate, gstRate, ...rest } = line;
  return rest;
};

export const normalizeLineItemsForTaxLevel = (invoiceData = {}) => {
  const lineItems = invoiceData.lineItems || [];
  if (invoiceData.taxesLevel !== INVOICE_LEVEL) return lineItems;
  return lineItems.map(stripLineTaxForInvoiceLevel);
};

export const calculateInvoiceDataLineItemSubtotal = (item = {}, invoiceData = {}) => {
  if (invoiceData?.discountsLevel === INVOICE_LEVEL) {
    const lineTotal = parseNumericInput(item.lineTotal ?? item.amount, 0);
    if (lineTotal > 0) return lineTotal;
    return parseNumericInput(item.quantity, 0) * parseNumericInput(item.unitRate, 0);
  }
  return resolveLineItemSubtotal(item);
};

export const calculateInvoiceDataTotals = (
  invoiceData = {},
  lineItems = invoiceData.lineItems || [],
) =>
  calculateInvoiceTotals({
    lineItems,
    currency: invoiceData.currency || DEFAULT_CURRENCY,
    calculateLineItemSubtotal: (item) =>
      calculateInvoiceDataLineItemSubtotal(item, invoiceData),
    taxRates: TAX_RATES,
    invoiceTaxAmount: invoiceData.scannedTaxAmount ?? invoiceData.invoiceTaxAmount,
    invoiceTaxName:
      invoiceData.taxesLevel === INVOICE_LEVEL
        ? invoiceData.invoiceTaxName
        : invoiceData.scannedTaxName ?? invoiceData.invoiceTaxName,
    invoiceTaxRate:
      invoiceData.taxesLevel === INVOICE_LEVEL
        ? invoiceData.invoiceTaxRate
        : invoiceData.scannedTaxRate ?? invoiceData.invoiceTaxRate,
    invoiceTax: invoiceData.invoiceTax,
    taxesLevel: invoiceData.taxesLevel,
    discountsLevel: invoiceData.discountsLevel,
    invoiceDiscount: invoiceData.invoiceDiscount,
    invoiceDiscountType: invoiceData.invoiceDiscountType,
    roundOff: invoiceData.roundOff ?? invoiceData.round_off ?? invoiceData.roundoff,
    invoiceTotal: invoiceData.scannedTotal ?? invoiceData.invoiceTotal,
  });

export const mapBulkLineItemToEditForm = (line = {}, currency = DEFAULT_CURRENCY) => ({
  description: line.description || "",
  ledger: line.ledger || "Cloud Services",
  quantity: Number(line.quantity || 1),
  unitRate: Number(line.unitRate ?? line.unitPrice ?? 0),
  amount: Number(
    line.amount ||
      Number(line.quantity || 1) * Number(line.unitRate ?? line.unitPrice ?? 0),
  ),
  lineTotal: Number(
    line.lineTotal ??
      line.amount ??
      Number(line.quantity || 1) * Number(line.unitRate ?? line.unitPrice ?? 0),
  ),
  hsnSac: line.hsnSac || "",
  tax: line.tax || (isInrInvoiceCurrency(currency) ? DEFAULT_INR_TAX : ""),
  taxName: line.taxName || "",
  taxRate: line.taxRate ?? "",
  discount: line.discount || 0,
  discountType: line.discountType || "%",
  eligibleForItc: line.eligibleForItc ?? true,
});

export const mapBulkLineItemToPayload = (line = {}, currency = DEFAULT_CURRENCY) => ({
  description: line.description,
  quantity: parseNumericInput(line.quantity, 0),
  unitRate: parseNumericInput(line.unitRate, 0),
  unitPrice: parseNumericInput(line.unitRate, 0),
  amount: parseNumericInput(line.amount ?? line.lineTotal, 0),
  hsnSac: line.hsnSac || "",
  tax: line.tax || (isInrInvoiceCurrency(currency) ? DEFAULT_INR_TAX : ""),
  taxName: line.taxName || "",
  taxRate: line.taxRate ?? "",
  ledger: line.ledger || "Cloud Services",
  discount: parseNumericInput(line.discount, 0),
  discountType: line.discountType || "%",
  eligibleForItc: line.eligibleForItc ?? true,
});

export const normalizeInvoiceCategoryId = (categoryId) => {
  if (categoryId === null || categoryId === undefined || categoryId === "") return "";
  const numericCategoryId = Number(categoryId);
  return Number.isNaN(numericCategoryId) ? categoryId : numericCategoryId;
};

export const buildInvoiceCategoryPayload = (source = {}, { isCategoryFeatureEnabled, getCategoryNameById }) => {
  if (!isCategoryFeatureEnabled) return null;
  const rawCategoryId = source.category?.id ?? source.categoryId ?? source.categoryId;
  const categoryId = normalizeInvoiceCategoryId(rawCategoryId);
  if (!categoryId) return null;
  return {
    id: categoryId,
    name:
      source.category?.name ||
      source.categoryName ||
      source.categoryName ||
      getCategoryNameById(categoryId),
  };
};

export const initializeInvoiceFormData = (
  extractedData = null,
  { findVendorByName, isCategoryFeatureEnabled },
) => {
  const matchedVendor = extractedData?.vendorName ? findVendorByName(extractedData.vendorName) : null;
  const notesText = Array.isArray(extractedData?.notes) ? extractedData.notes.join("\n") : "";
  const invoiceCurrency = normalizeCurrencyCode(extractedData?.currency) || DEFAULT_CURRENCY;
  const useInrTax = isInrInvoiceCurrency(invoiceCurrency);
  const defaultGstTreatment = useInrTax ? "Regular" : "N/A";
  const vendorAddress =
    extractedData?.vendorAddress ||
    extractedData?.address ||
    "";
  const billingAddress =
    extractedData?.billingAddress ||
    extractedData?.billingAddress ||
    vendorAddress;

  return {
    vendorName: extractedData?.vendorName || "",
    vendorId: matchedVendor?.id || "",
    vendorMatched: !!matchedVendor,
    vendorRequestSubmitted: false,
    vendorRequestPending: Boolean(matchedVendor?.isPendingApproval),
    vendorGstin: extractedData?.vendorGstin || "",
    vendorAddress: vendorAddress,
    invoiceNumber: extractedData?.invoiceNumber || "",
    invoiceDate: extractedData?.invoiceDate || format(new Date(), "yyyy-MM-dd"),
    dueDate: extractedData?.dueDate || "",
    billingAddress: billingAddress,
    shippingAddress: extractedData?.shippingAddress || extractedData?.shippingAddress || "",
    billingGstin:
      extractedData?.billingGstin ||
      extractedData?.billing_gstin ||
      "",
    gstTreatment: extractedData?.gstTreatment || extractedData?.gstTreatment || defaultGstTreatment,
    gstin:
      extractedData?.vendorGstin ||
      extractedData?.vendorGstin ||
      extractedData?.gstin ||
      extractedData?.billingGstin ||
      extractedData?.billingGstin ||
      matchedVendor?.gstin ||
      "",
    sourceOfSupply:
      extractedData?.sourceOfSupply ||
      extractedData?.sourceOfSupply ||
      extractedData?.placeOfSupply ||
      extractedData?.placeOfSupply ||
      "",
    destinationOfSupply:
      extractedData?.destinationOfSupply ||
      extractedData?.destinationOfSupply ||
      extractedData?.placeOfSupply ||
      extractedData?.placeOfSupply ||
      "",
    location:
      extractedData?.location ||
      extractedData?.placeOfSupply ||
      extractedData?.placeOfSupply ||
      "",
    reverseCharges: extractedData?.reverseCharges || "Not Applicable",
    discountsLevel:
      extractedData?.discountsLevel ||
      extractedData?.discountsLevel ||
      LINE_ITEM_LEVEL,
    invoiceDiscount:
      extractedData?.invoiceDiscount ??
      extractedData?.invoiceDiscount ??
      0,
    invoiceDiscountType:
      extractedData?.invoiceDiscountType ||
      extractedData?.invoiceDiscountType ||
      "%",
    taxesLevel:
      extractedData?.taxesLevel ||
      extractedData?.taxes_level ||
      LINE_ITEM_LEVEL,
    invoiceTax:
      extractedData?.invoiceTax ||
      extractedData?.invoice_tax ||
      DEFAULT_INR_TAX,
    invoiceTaxName:
      extractedData?.invoiceTaxName ||
      extractedData?.invoice_tax_name ||
      "Tax",
    invoiceTaxRate:
      extractedData?.invoiceTaxRate ??
      extractedData?.invoice_tax_rate ??
      "",
    source: extractedData?.source || "Upload",
    sourceEmail: "",
    lineItemsExpanded: true,
    lineItems: extractedData?.lineItems?.length > 0
      ? extractedData.lineItems.map((item) =>
          mapExtractedLineItemToForm(item, { useInrTax }),
        )
      : [createDefaultLineItem(invoiceCurrency)],
    description: extractedData?.description || notesText || "",
    tds: "",
    amount: extractedData?.amount || 0,
    currency: normalizeCurrencyCode(extractedData?.currency) || DEFAULT_CURRENCY,
    roundOff:
      extractedData?.roundOff ??
      extractedData?.round_off ??
      extractedData?.roundoff ??
      undefined,
    scannedTaxAmount:
      extractedData?.invoiceTaxAmount ??
      extractedData?.totalTaxAmount ??
      extractedData?.total_tax_amount ??
      extractedData?.gstAmount ??
      extractedData?.gst_amount,
    scannedTaxName:
      extractedData?.invoiceTaxName ?? extractedData?.invoice_tax_name,
    scannedTaxRate:
      extractedData?.invoiceTaxRate ?? extractedData?.invoice_tax_rate,
    scannedTotal: extractedData?.invoiceTotal,
    fileId: extractedData?.fileId || null,
    fileHash: extractedData?.fileHash || null,
    originalFileName: extractedData?.originalFileName || null,
    departmentId: extractedData?.departmentId || extractedData?.departmentId || "",
    departmentName: extractedData?.departmentName || extractedData?.departmentName || "",
    ...(isCategoryFeatureEnabled
      ? {
          category: extractedData?.category || null,
          categoryId:
            extractedData?.categoryId ||
            extractedData?.categoryId ||
            extractedData?.category?.id ||
            "",
          categoryName:
            extractedData?.categoryName ||
            extractedData?.categoryName ||
            extractedData?.category?.name ||
            "",
        }
      : {}),
    campaignId: extractedData?.campaignId || extractedData?.campaign_id || "",
    campaignName: extractedData?.campaignName || extractedData?.campaign_name || "",
    referenceNumber:
      extractedData?.referenceNumber ||
      extractedData?.reference_number ||
      extractedData?.referenceCode ||
      extractedData?.reference_code ||
      "",
  };
};

export const buildToCreateInvoicePayload = (
  invoiceData = {},
  options = {},
  {
    findVendorByName,
    getDepartmentNameById,
    getCategoryNameById,
    isCategoryFeatureEnabled,
    isCampaignFeatureEnabled = false,
  },
) => {
  const lineItems = normalizeLineItemsForTaxLevel(invoiceData);
  const calculateLineItemSubtotal = (item) =>
    calculateInvoiceDataLineItemSubtotal(item, invoiceData);
  const totals =
    options.totals ??
    (lineItems.length > 0 ? calculateInvoiceDataTotals(invoiceData, lineItems) : null);

  return buildInvoiceApiPayload(
    {
      ...invoiceData,
      lineItems: lineItems,
      vendorId: invoiceData.vendorId || findVendorByName(invoiceData.vendorName)?.id || "",
      status: invoiceData.status ?? options.status,
      departmentName:
        invoiceData.departmentName ||
        invoiceData.departmentName ||
        getDepartmentNameById(invoiceData.departmentId || invoiceData.departmentId),
      category: buildInvoiceCategoryPayload(invoiceData, {
        isCategoryFeatureEnabled,
        getCategoryNameById,
      }),
      categoryId:
        invoiceData.categoryId ||
        invoiceData.categoryId ||
        invoiceData.category?.id ||
        "",
      categoryName:
        invoiceData.categoryName ||
        invoiceData.categoryName ||
        invoiceData.category?.name ||
        getCategoryNameById(
          invoiceData.categoryId || invoiceData.categoryId || invoiceData.category?.id,
        ),
      memo:
        invoiceData.memo ||
        invoiceData.description ||
        (Array.isArray(invoiceData.notes) ? invoiceData.notes.join("\n") : ""),
      originalFileName:
        invoiceData.originalFileName ||
        invoiceData.originalFileName ||
        null,
      source: invoiceData.source || "Upload",
      sourceEmail: invoiceData.source === "Email" ? invoiceData.sourceEmail : null,
      ...(isCampaignFeatureEnabled
        ? {
            campaignId: invoiceData.campaignId || "",
            campaignName: invoiceData.campaignName || "",
            referenceNumber: invoiceData.referenceNumber || "",
          }
        : {}),
    },
    {
      ...options,
      totals,
      tdsAmount:
        options.tdsAmount ??
        computeTdsAmount(
          lineItems,
          invoiceData.tds,
          calculateLineItemSubtotal,
          invoiceData.tdsRate,
        ),
      categoryEnabled: isCategoryFeatureEnabled,
      campaignEnabled: isCampaignFeatureEnabled,
    },
  );
};

/** Same shape as create; used for PUT /invoices/{id}. */
export const buildToUpdateInvoicePayload = buildToCreateInvoicePayload;

export const buildInvoiceMultipartPayload = (
  invoicePayload,
  file = null,
  options = {},
  { isCategoryFeatureEnabled },
) => {
  const multipartPayload = new FormData();
  if (file) {
    multipartPayload.append("file", file);
  }
  const requestBody = buildInvoiceApiPayload(invoicePayload, {
    ...options,
    uploadedFileName: file?.name,
    categoryEnabled: isCategoryFeatureEnabled,
  });
  multipartPayload.append(
    "invoice",
    new Blob([JSON.stringify(requestBody)], { type: "application/json" }),
  );
  return multipartPayload;
};
