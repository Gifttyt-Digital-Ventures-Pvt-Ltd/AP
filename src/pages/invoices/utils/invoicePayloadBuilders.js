import { format } from "date-fns";
import { buildInvoiceApiPayload } from "../../../Services/utils/payloadMappers";
import { DEFAULT_CURRENCY, normalizeCurrencyCode } from "../../../utils/currency";
import { TAX_RATES, isGmailInvoiceSource, normalizeInvoiceSource } from "../constants";
import { DOCUMENT_TYPE } from "../constants/proformaInvoice";
import {
  calculateInvoiceTotals,
  createDefaultLineItem,
  DEFAULT_INR_TAX,
  INVOICE_LEVEL,
  isInrInvoiceCurrency,
  LINE_ITEM_MODE_DETAILED,
  LINE_ITEM_MODE_SUMMARY_ONLY,
  LINE_ITEM_LEVEL,
  mapExtractedLineItemToForm,
  normalizeLineItemDiscountTypeForForm,
  resolveLineItemSubtotal,
} from "./invoiceTax";
import { parseNumericInput } from "./numericInput";
import { resolveTdsRate } from "./tds";
import { normalizeDueDateForInvoice, resolveVendorIsMsme } from "./msmePaymentDue";

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
  if (invoiceData.lineItemMode === LINE_ITEM_MODE_SUMMARY_ONLY) {
    return [];
  }
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
  ledger: line.ledger || line.ledgerName || line.ledger_name || "",
  ledgerId: line.ledgerId || line.ledger_id || "",
  accountGroupId:
    line.accountGroupId || line.account_group_id || line.groupId || line.group_id || "",
  accountGroupName:
    line.accountGroupName || line.account_group_name || line.groupName || line.group_name || "",
  groupId: line.groupId || line.group_id || line.accountGroupId || line.account_group_id || "",
  groupName:
    line.groupName || line.group_name || line.accountGroupName || line.account_group_name || "",
  expenseType: line.expenseType || line.expense_type || "",
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
  hsnSac: line.hsnSac || line.hsn_sac || "",
  tax: line.tax || (isInrInvoiceCurrency(currency) ? DEFAULT_INR_TAX : ""),
  taxName: line.taxName || "",
  taxRate: line.taxRate ?? "",
  discount: line.discount || 0,
  discountType: normalizeLineItemDiscountTypeForForm(
    line.discountType ?? line.discount_type ?? "%",
    currency,
  ),
  eligibleForItc: line.eligibleForItc ?? true,
});

export const mapBulkLineItemToPayload = (line = {}, currency = DEFAULT_CURRENCY) => ({
  description: line.description,
  quantity: parseNumericInput(line.quantity, 0),
  unitRate: parseNumericInput(line.unitRate, 0),
  unitPrice: parseNumericInput(line.unitRate, 0),
  amount: parseNumericInput(line.amount ?? line.lineTotal, 0),
  hsnSac: line.hsnSac || line.hsn_sac || "",
  tax: line.tax || (isInrInvoiceCurrency(currency) ? DEFAULT_INR_TAX : ""),
  taxName: line.taxName || "",
  taxRate: line.taxRate ?? "",
  ledger: line.ledger || line.ledgerName || line.ledger_name || "",
  ledgerName: line.ledger || line.ledgerName || line.ledger_name || "",
  ledgerId: line.ledgerId || line.ledger_id || "",
  accountGroupId:
    line.accountGroupId || line.account_group_id || line.groupId || line.group_id || "",
  accountGroupName:
    line.accountGroupName || line.account_group_name || line.groupName || line.group_name || "",
  groupId: line.groupId || line.group_id || line.accountGroupId || line.account_group_id || "",
  groupName:
    line.groupName || line.group_name || line.accountGroupName || line.account_group_name || "",
  expenseType: line.expenseType || line.expense_type || "",
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
  const vendorIsMsme = resolveVendorIsMsme({}, matchedVendor);
  const invoiceDate = extractedData?.invoiceDate || format(new Date(), "yyyy-MM-dd");
  const extractedDueDate = extractedData?.dueDate || "";
  const dueDate = normalizeDueDateForInvoice({
    invoiceDate,
    dueDate: extractedDueDate,
    vendorIsMsme,
  });
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
    extractedData?.billing_address ||
    vendorAddress;
  const shippingAddress =
    extractedData?.shippingAddress ||
    extractedData?.shipping_address ||
    "";
  const extractedGstin =
    extractedData?.vendorGstin ||
    extractedData?.gstin ||
    extractedData?.billingGstin ||
    "";
  const extractedSourceOfSupply =
    extractedData?.sourceOfSupply || extractedData?.placeOfSupply || "";
  const extractedDestinationOfSupply =
    extractedData?.destinationOfSupply || extractedData?.placeOfSupply || "";

  const formResult = {
    vendorName: extractedData?.vendorName || "",
    vendorId: matchedVendor?.id || "",
    vendorMatched: !!matchedVendor,
    vendorRequestSubmitted: false,
    vendorRequestPending: Boolean(matchedVendor?.isPendingApproval),
    vendorGstin: extractedData?.vendorGstin || "",
    vendorAddress: vendorAddress,
    invoiceNumber: extractedData?.invoiceNumber || "",
    invoiceDate,
    dueDate,
    billingAddress: billingAddress,
    shippingAddress,
    shippingSameAsBilling: Boolean(
      billingAddress &&
        shippingAddress &&
        String(billingAddress).trim() === String(shippingAddress).trim(),
    ),
    billingGstin:
      extractedData?.billingGstin ||
      extractedData?.billing_gstin ||
      "",
    branchName:
      extractedData?.branchName ||
      extractedData?.branch_name ||
      "",
    branchCode:
      extractedData?.branchCode ||
      extractedData?.branch_code ||
      "",
    vendorBranchName:
      extractedData?.vendorBranchName ||
      extractedData?.vendor_branch_name ||
      "",
    vendorBranchCode:
      extractedData?.vendorBranchCode ||
      extractedData?.vendor_branch_code ||
      "",
    vendorBranchGstin:
      extractedData?.vendorBranchGstin ||
      extractedData?.vendor_branch_gstin ||
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
    lineItemMode: LINE_ITEM_MODE_DETAILED,
    lineItemsRemoved: false,
    removedLineItemsCount: 0,
    subTotal:
      extractedData?.subTotal ??
      extractedData?.sub_total ??
      extractedData?.subtotal ??
      0,
    totalTaxAmount:
      extractedData?.totalTaxAmount ??
      extractedData?.total_tax_amount ??
      extractedData?.gstAmount ??
      extractedData?.gst_amount ??
      0,
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
    source: "Upload",
    sourceEmail: "",
    voucherType:
      extractedData?.voucherType ||
      extractedData?.voucher_type ||
      extractedData?.accountingVoucherType ||
      extractedData?.accounting_voucher_type ||
      "",
    lineItemsExpanded: true,
    lineItems: extractedData?.lineItems?.length > 0
      ? extractedData.lineItems.map((item) =>
          mapExtractedLineItemToForm(item, {
            useInrTax,
            currency: invoiceCurrency,
          }),
        )
      : [createDefaultLineItem(invoiceCurrency)],
    description: extractedData?.description || notesText || "",
    tdsNarration:
      extractedData?.tdsNarration ||
      extractedData?.tds_narration ||
      extractedData?.narration ||
      "",
    tds: "",
    amount:
      extractedData?.totalAmount ??
      extractedData?.total_amount ??
      extractedData?.invoiceTotal ??
      0,
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
    scannedTotal:
      extractedData?.totalAmount ??
      extractedData?.total_amount ??
      extractedData?.invoiceTotal,
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
    matchingPurchaseOrderId: "",
    matchingGrnId: "",
    matchingId: "",
    existingMatchingPurchaseOrderId: "",
    existingMatchingGrnId: "",
    matchingPoNumber: "",
    matchingGrnNumber: "",
    matchingStatus: "",
    documentType: extractedData?.documentType ?? DOCUMENT_TYPE.TAX_INVOICE,
    linkedProformaInvoiceId: extractedData?.linkedProformaInvoiceId ?? "",
    linkedProformaInvoiceNumber: extractedData?.linkedProformaInvoiceNumber ?? "",
  };

  // Baseline of what OCR actually extracted, so the checklist can tell a
  // scanned value the user left untouched apart from one they typed over.
  // Only fields OCR actually returned are included — fields it left blank
  // (or defaults we filled in ourselves) have nothing to be "matched" against.
  formResult.extractedSnapshot = extractedData
    ? {
        invoiceNumber: extractedData?.invoiceNumber || "",
        invoiceDate: extractedData?.invoiceDate || "",
        currency: extractedData?.currency
          ? normalizeCurrencyCode(extractedData.currency)
          : "",
        vendorName: extractedData?.vendorName || "",
        gstin: extractedGstin,
        gstTreatment: extractedData?.gstTreatment || "",
        sourceOfSupply: extractedSourceOfSupply,
        destinationOfSupply: extractedDestinationOfSupply,
        invoiceTax: extractedData?.invoiceTax || extractedData?.invoice_tax || "",
        invoiceTaxName:
          extractedData?.invoiceTaxName || extractedData?.invoice_tax_name || "",
        invoiceTaxRate:
          extractedData?.invoiceTaxRate ?? extractedData?.invoice_tax_rate ?? "",
      }
    : null;

  return formResult;
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
    isErpIntegrationEnabled = true,
  },
) => {
  const isSummaryOnly =
    invoiceData.lineItemMode === LINE_ITEM_MODE_SUMMARY_ONLY;
  const lineItems = normalizeLineItemsForTaxLevel(invoiceData);
  const calculateLineItemSubtotal = (item) =>
    calculateInvoiceDataLineItemSubtotal(item, invoiceData);
  const summarySubTotal = parseNumericInput(
    invoiceData.subTotal ?? invoiceData.sub_total ?? invoiceData.subtotal,
    0,
  );
  const roundOff = parseNumericInput(
    invoiceData.roundOff ?? invoiceData.round_off ?? invoiceData.roundoff,
    0,
  );
  const discountValue = parseNumericInput(invoiceData.invoiceDiscount, 0);
  const invoiceDiscountAmount =
    invoiceData.invoiceDiscountType === "%"
      ? (summarySubTotal * discountValue) / 100
      : discountValue;
  const boundedInvoiceDiscountAmount = Math.max(
    0,
    Math.min(invoiceDiscountAmount, summarySubTotal),
  );
  const summaryTaxableSubTotal = summarySubTotal - boundedInvoiceDiscountAmount;
  const summaryInvoiceLevelTaxEnabled = invoiceData.taxesLevel === INVOICE_LEVEL;
  let summaryTaxAmount = parseNumericInput(
    invoiceData.totalTaxAmount ??
      invoiceData.total_tax_amount ??
      invoiceData.gstAmount ??
      invoiceData.gst_amount,
    0,
  );
  if (summaryInvoiceLevelTaxEnabled && isInrInvoiceCurrency(invoiceData.currency || DEFAULT_CURRENCY)) {
    const taxRate = TAX_RATES.find((entry) => entry.value === invoiceData.invoiceTax);
    summaryTaxAmount = taxRate
      ? ((summaryTaxableSubTotal * (Number(taxRate.cgst) || 0)) / 100) +
        ((summaryTaxableSubTotal * (Number(taxRate.sgst) || 0)) / 100) +
        ((summaryTaxableSubTotal * (Number(taxRate.igst) || 0)) / 100)
      : 0;
  } else if (summaryInvoiceLevelTaxEnabled) {
    summaryTaxAmount =
      (summaryTaxableSubTotal * parseNumericInput(invoiceData.invoiceTaxRate, 0)) / 100;
  }
  const summaryTotals = isSummaryOnly
    ? {
        subTotal: summaryTaxableSubTotal,
        subTotalBeforeDiscount: summarySubTotal,
        invoiceDiscountAmount: boundedInvoiceDiscountAmount,
        total: summaryTaxableSubTotal + summaryTaxAmount + roundOff,
        cgst: 0,
        sgst: 0,
        igst: isInrInvoiceCurrency(invoiceData.currency || DEFAULT_CURRENCY)
          ? summaryTaxAmount
          : 0,
        foreignTax: isInrInvoiceCurrency(invoiceData.currency || DEFAULT_CURRENCY)
          ? 0
          : summaryTaxAmount,
      }
    : null;
  const totals =
    options.totals ??
    summaryTotals ??
    (lineItems.length > 0 ? calculateInvoiceDataTotals(invoiceData, lineItems) : null);

  return buildInvoiceApiPayload(
    {
      ...invoiceData,
      lineItems: lineItems,
      lineItemMode: isSummaryOnly ? LINE_ITEM_MODE_SUMMARY_ONLY : LINE_ITEM_MODE_DETAILED,
      lineItemsRemoved: isSummaryOnly ? invoiceData.lineItemsRemoved === true : false,
      subTotal: isSummaryOnly ? summarySubTotal : invoiceData.subTotal,
      totalTaxAmount: isSummaryOnly ? summaryTaxAmount : invoiceData.totalTaxAmount,
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
      source: normalizeInvoiceSource(invoiceData.source),
      sourceEmail: isGmailInvoiceSource(invoiceData.source)
        ? invoiceData.sourceEmail || null
        : null,
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
        (isSummaryOnly
          ? (() => {
              const tdsRate = resolveTdsRate(invoiceData.tds, invoiceData.tdsRate);
              return tdsRate
                ? Math.round(((summarySubTotal * tdsRate) / 100) * 100) / 100
                : null;
            })()
          : computeTdsAmount(
              lineItems,
              invoiceData.tds,
              calculateLineItemSubtotal,
              invoiceData.tdsRate,
            )),
      categoryEnabled: isCategoryFeatureEnabled,
      campaignEnabled: isCampaignFeatureEnabled,
      erpIntegrationEnabled: isErpIntegrationEnabled,
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
